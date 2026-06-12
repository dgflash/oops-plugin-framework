import type { ecs } from '../ECS';
import type { CompCtor } from '../registry/ECSTypes';
import { ChangeTracker, TRACKER_KEY, SYNC_BACKING_PREFIX } from './ChangeTracker';
import { SyncType, SyncField, SYNC_FIELDS } from './SyncTypes';

interface SyncMeta {
    /** 按声明顺序排列的同步字段列表 */
    fields: SyncField[];
    /** 字段名到元数据的映射 */
    byName: Map<string, SyncField>;
}

/** 获取或创建组件构造函数上的同步元数据（支持继承拷贝） */
function getSyncMeta(ctor: object): SyncMeta {
    const anyCtor = ctor as unknown as Record<string, unknown>;
    let meta = anyCtor[SYNC_FIELDS] as SyncMeta | undefined;
    if (!meta || !Object.prototype.hasOwnProperty.call(ctor, SYNC_FIELDS)) {
        const parent = meta;
        meta = {
            fields: parent ? parent.fields.slice() : [],
            byName: new Map(parent ? parent.byName : undefined)
        };
        anyCtor[SYNC_FIELDS] = meta;
    }
    return meta;
}

/** 获取组件类型的同步字段（不存在返回 undefined） */
export function getSyncFields(ctor: object): SyncField[] | undefined {
    const meta = (ctor as Record<string, SyncMeta | undefined>)[SYNC_FIELDS];
    return meta?.fields;
}

/** 组件类型是否声明了网络同步字段 */
export function isSyncable(ctor: object): boolean {
    const f = getSyncFields(ctor);
    return !!f && f.length > 0;
}

/**
 * 字段装饰器：标记组件字段参与网络同步。
 *
 * 写入该字段会被记录为脏，增量编码时仅发送脏字段。
 * 注意：SoA（@ecs.storage.enableSoA）组件的字段读写走 Proxy，不会触发此 setter，
 * 此时应使用全量同步（SyncOp.Full）。
 */
export function sync(type: SyncType = SyncType.Float64) {
    return function (target: object, propertyKey: string): void {
        const ctor = target.constructor as CompCtor<ecs.IComp>;
        const meta = getSyncMeta(ctor);
        const index = meta.fields.length;
        const field: SyncField = { name: propertyKey, type, index };
        meta.fields.push(field);
        meta.byName.set(propertyKey, field);

        const backing = SYNC_BACKING_PREFIX + propertyKey;
        Object.defineProperty(target, propertyKey, {
            get(this: Record<string, unknown>) {
                return this[backing];
            },
            set(this: Record<string | symbol, unknown>, value: unknown) {
                this[backing] = value;
                const tracker = this[TRACKER_KEY] as ChangeTracker | undefined;
                if (tracker) tracker.setDirty(index);
            },
            enumerable: true,
            configurable: true
        });
    };
}

/** 确保组件实例挂有 ChangeTracker；可选地立即标记全部字段为脏 */
export function ensureTracker(comp: ecs.IComp, markAll = false): ChangeTracker | undefined {
    const ctor = comp.constructor as CompCtor<ecs.IComp>;
    const fields = getSyncFields(ctor);
    if (!fields || fields.length === 0) return undefined;
    const anyComp = comp as unknown as Record<string | symbol, unknown>;
    let tracker = anyComp[TRACKER_KEY] as ChangeTracker | undefined;
    if (!tracker) {
        tracker = new ChangeTracker(fields.length);
        anyComp[TRACKER_KEY] = tracker;
    }
    if (markAll) tracker.markAll();
    return tracker;
}

/** 获取组件实例上的 ChangeTracker（不存在返回 undefined） */
export function getTracker(comp: ecs.IComp): ChangeTracker | undefined {
    return (comp as unknown as Record<symbol, ChangeTracker | undefined>)[TRACKER_KEY];
}
