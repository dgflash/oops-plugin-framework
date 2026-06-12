import type { ecs } from '../ECS';
import type { CompCtor, IComp } from '../registry/ECSTypes';
import type { ECSWorld } from '../world/ECSWorld';
import { bindSoAStorageAccessor } from './StorageAccessor';
import { getSoAFields, isSoAEnabled } from './StorageMeta';
import type { SoAArrayKind } from './StorageTypes';
import { setStorageProvider, type IComponentStorageProvider } from '../entity/ComponentStorage';

/** SoA 列存储支持的 TypedArray 联合类型 */
type AnyTypedArray =
    | Float64Array
    | Float32Array
    | Int32Array
    | Uint32Array
    | Int16Array
    | Uint16Array
    | Int8Array
    | Uint8Array;

/** 按类型与容量创建 TypedArray */
function createTypedArray(kind: SoAArrayKind, capacity: number): AnyTypedArray {
    switch (kind) {
        case 'float64': return new Float64Array(capacity);
        case 'float32': return new Float32Array(capacity);
        case 'int32': return new Int32Array(capacity);
        case 'uint32': return new Uint32Array(capacity);
        case 'int16': return new Int16Array(capacity);
        case 'uint16': return new Uint16Array(capacity);
        case 'int8': return new Int8Array(capacity);
        case 'uint8':
        case 'bool': return new Uint8Array(capacity);
    }
}

/**
 * SoA 列存储（每种 SoA 组件一个）
 *
 * 数值/布尔字段按列存入 TypedArray，按 eid 分配槽位。`acquire` 返回一个 Proxy 视图：
 * - 读写 SoA 字段 → 直接落到 TypedArray 槽位（零拷贝）
 * - 读写非 SoA 字段、调用方法、访问基类字段 → 落到后备实例（保持对象语义）
 */
export class StorageSoA<T extends ecs.IComp> {
    /** 关联的组件构造函数 */
    readonly type: CompCtor<T>;

    /** 字段名 -> TypedArray 列 */
    private readonly fields = new Map<string, AnyTypedArray>();
    /** 字段名 -> TypedArray 类型 */
    private readonly fieldKinds = new Map<string, SoAArrayKind>();

    /** 实体 eid -> 槽位索引 */
    private eidToSlot = new Map<number, number>();
    /** 槽位索引 -> 实体 eid */
    private slotToEid: number[] = [];
    /** 可回收的空闲槽位栈 */
    private freeSlots: number[] = [];
    /** 槽位对应的后备组件实例（非 SoA 字段与方法） */
    private backings: Array<T | undefined> = [];
    /** 实体 eid -> Proxy 视图缓存 */
    private proxies = new Map<number, T>();

    /** 当前 TypedArray 容量（槽位上限） */
    private _capacity: number;
    /** 已分配过的最大槽位计数 */
    private _size = 0;

    /**
     * 构造函数
     * @param componentType 组件构造函数
     * @param initialCapacity 初始槽位容量
     */
    constructor(componentType: CompCtor<T>, initialCapacity = 256) {
        this.type = componentType;
        this._capacity = initialCapacity;
        this.initFields(componentType);
    }

    /** 根据组件原型与装饰器声明初始化 SoA 列 */
    private initFields(ctor: CompCtor<T>): void {
        const declared = getSoAFields(ctor);
        const probe = new ctor() as unknown as Record<string, unknown>;

        const skip = new Set(['tid', 'ent', 'canRecycle']);
        for (const key of Object.keys(probe)) {
            if (skip.has(key) || key.startsWith('_')) continue;
            let kind: SoAArrayKind | undefined = declared?.get(key);
            if (!kind) {
                const v = probe[key];
                if (typeof v === 'number') kind = 'float64';
                else if (typeof v === 'boolean') kind = 'bool';
            }
            if (kind) {
                this.fieldKinds.set(key, kind);
                this.fields.set(key, createTypedArray(kind, this._capacity));
            }
        }
        if (declared) {
            declared.forEach((kind, key) => {
                if (!this.fields.has(key)) {
                    this.fieldKinds.set(key, kind);
                    this.fields.set(key, createTypedArray(kind, this._capacity));
                }
            });
        }
    }

    /** 所有 SoA 字段名 */
    get fieldNames(): string[] {
        return Array.from(this.fields.keys());
    }

    /** 槽位超出容量时按 2 倍扩容所有列 */
    private ensureCapacity(slot: number): void {
        if (slot < this._capacity) return;
        let cap = this._capacity;
        while (cap <= slot) cap *= 2;
        this.fieldKinds.forEach((kind, name) => {
            const next = createTypedArray(kind, cap);
            next.set(this.fields.get(name)!);
            this.fields.set(name, next);
        });
        this._capacity = cap;
    }

    /**
     * 为实体分配组件（返回 Proxy 视图）。
     *
     * 注意：SoA 字段会被清零（列存储语义），组件构造函数里给 SoA 字段写的默认值
     * （如 `x = 100`）不会生效——SoA 字段一律以 0 起始，需在 add 后显式赋值。
     * 非 SoA 字段与方法仍走后备实例，构造默认值正常保留。
     */
    acquire(eid: number): T {
        let slot = this.freeSlots.pop();
        if (slot === undefined) {
            slot = this._size++;
            this.ensureCapacity(slot);
        }
        this.fields.forEach((arr) => { arr[slot!] = 0; });

        const backing = new this.type();
        this.backings[slot] = backing;
        this.eidToSlot.set(eid, slot);
        this.slotToEid[slot] = eid;

        const proxy = this.createProxy(eid, backing);
        this.proxies.set(eid, proxy);
        return proxy;
    }

    /** 创建将 SoA 字段读写路由到 TypedArray 的 Proxy 视图 */
    private createProxy(eid: number, backing: T): T {
        const fields = this.fields;
        const self = this;
        const handler: ProxyHandler<T & object> = {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && fields.has(prop)) {
                    const slot = self.eidToSlot.get(eid);
                    if (slot === undefined) return undefined;
                    const v = fields.get(prop)![slot];
                    return self.fieldKinds.get(prop) === 'bool' ? v !== 0 : v;
                }
                return Reflect.get(target, prop, receiver);
            },
            set(target, prop, value, receiver) {
                if (typeof prop === 'string' && fields.has(prop)) {
                    const slot = self.eidToSlot.get(eid);
                    if (slot === undefined) return true;
                    fields.get(prop)![slot] = typeof value === 'boolean' ? (value ? 1 : 0) : (value as number);
                    return true;
                }
                return Reflect.set(target, prop, value, receiver);
            },
            has(target, prop) {
                if (typeof prop === 'string' && fields.has(prop)) return true;
                return Reflect.has(target, prop);
            }
        };
        return new Proxy(backing as T & object, handler) as T;
    }

    /** 释放实体的组件槽位 */
    release(eid: number): void {
        const slot = this.eidToSlot.get(eid);
        if (slot === undefined) return;
        this.eidToSlot.delete(eid);
        this.proxies.delete(eid);
        this.backings[slot] = undefined;
        this.freeSlots.push(slot);
    }

    /** 获取实体当前的 Proxy 视图 */
    getProxy(eid: number): T | undefined {
        return this.proxies.get(eid);
    }

    /** 直接获取某字段的 TypedArray（供批处理；按槽位索引） */
    getFieldArray(name: string): AnyTypedArray | undefined {
        return this.fields.get(name);
    }

    /** 实体 eid -> 槽位 */
    getSlot(eid: number): number | undefined {
        return this.eidToSlot.get(eid);
    }

    /** 遍历所有活跃槽位 */
    forEachActive(cb: (eid: number, slot: number) => void): void {
        this.eidToSlot.forEach((slot, eid) => cb(eid, slot));
    }

    /** 当前活跃实体数 */
    get size(): number {
        return this.eidToSlot.size;
    }

    /** 当前槽位容量 */
    get capacity(): number {
        return this._capacity;
    }

    /** 清空所有槽位与映射，重置存储 */
    clear(): void {
        this.eidToSlot.clear();
        this.proxies.clear();
        this.slotToEid.length = 0;
        this.backings.length = 0;
        this.freeSlots.length = 0;
        this._size = 0;
        this.fields.forEach((arr) => arr.fill(0));
    }
}

/**
 * SoA 管理器（全局单世界）：按组件 tid 路由列存储。
 */
export class SoAManager {
    /** 组件 tid -> SoA 列存储 */
    private readonly storages = new Map<number, StorageSoA<ecs.IComp>>();

    /** 按组件类型获取或创建 SoA 列存储 */
    getStorage<T extends ecs.IComp>(ctor: CompCtor<T>): StorageSoA<T> {
        let storage = this.storages.get(ctor.tid) as StorageSoA<T> | undefined;
        if (!storage) {
            storage = new StorageSoA<T>(ctor);
            this.storages.set(ctor.tid, storage as unknown as StorageSoA<ecs.IComp>);
        }
        return storage;
    }

    /** 指定 tid 是否已有 SoA 存储 */
    has(tid: number): boolean {
        return this.storages.has(tid);
    }

    /** 遍历所有 SoA 列存储 */
    forEach(cb: (storage: StorageSoA<ecs.IComp>, tid: number) => void): void {
        this.storages.forEach(cb);
    }

    /** 清空并移除所有 SoA 列存储 */
    clear(): void {
        this.storages.forEach((s) => s.clear());
        this.storages.clear();
    }
}

/**
 * SoA 存储提供者：实现核心的 {@link IComponentStorageProvider} 端口，把 @ecs.storage.enableSoA 组件
 * 的 acquire/release 接管为列存储。每个世界一个 {@link SoAManager}（按世界隔离列数据）。
 *
 * 该提供者在本模块加载时自注册到核心；核心因此无需 import storage，
 * 删除整个 storage/ 目录后基础 ECS（纯 AoS）仍可正常运行。
 */
export class SoAStorageProvider implements IComponentStorageProvider {
    /** 世界 -> 该世界的 SoA 管理器（弱引用，世界回收后自动释放） */
    private readonly managers = new WeakMap<ECSWorld, SoAManager>();

    /** 获取或创建某世界的 SoA 管理器 */
    managerFor(world: ECSWorld): SoAManager {
        let manager = this.managers.get(world);
        if (!manager) {
            manager = new SoAManager();
            this.managers.set(world, manager);
        }
        return manager;
    }

    /** 组件是否标记 @ecs.storage.enableSoA */
    handles(ctor: CompCtor<IComp>): boolean {
        return isSoAEnabled(ctor);
    }

    /** 分配 SoA 列槽位并返回 Proxy 视图 */
    acquire(world: ECSWorld, eid: number, ctor: CompCtor<IComp>): IComp {
        return this.managerFor(world).getStorage(ctor).acquire(eid) as IComp;
    }

    /** 释放该实体在此组件类型上的 SoA 列槽位 */
    release(world: ECSWorld, eid: number, ctor: CompCtor<IComp>): void {
        this.managerFor(world).getStorage(ctor).release(eid);
    }

    /** 清空某世界的全部 SoA 列数据 */
    clearWorld(world: ECSWorld): void {
        this.managers.get(world)?.clear();
    }
}

/** 全局 SoA 存储提供者实例 */
export const soaStorageProvider = new SoAStorageProvider();

// 注入 SoA 访问器（避免循环依赖）+ 注册核心存储提供者
bindSoAStorageAccessor(soaStorageProvider);
setStorageProvider(soaStorageProvider);
