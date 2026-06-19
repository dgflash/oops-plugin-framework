import type { ecs } from '../ECS';
import { registry } from '../registry/ECSTypeRegistry';
import { ECSMask } from '../component/ECSMask';
import type { CompCtor, CompType } from '../registry/ECSTypes';
import type { ECSWorld } from '../world/ECSWorld';
import { EntityHelper } from './EntityHelper';
import { clearComponentEntityRefs } from '../reference/ECSEntityRef';

/**
 * ECS 实体 —— 组件的容器，运行期数据挂在 {@link ECSWorld} 上。
 *
 * 存储模型：
 * - {@link mask} + {@link comps}：位掩码 + 按 tid 索引的密集数组，get/has 为 O(1)。
 * - {@link compTid2Obj}：`remove(ctor, false)` 的软移除缓存，下次 add 同 tid 时恢复实例。
 * - 组件类型注册（tid）全局共享；实体实例、eid、SoA 槽位按世界隔离。
 *
 * 组件挂载两种方式：
 * - `add(组件类)`：框架从对象池 new（AoS）或分配 SoA Proxy；适用于数据组件。
 * - `add(组件实例)`：外部已创建实例（如 cc.Component），设 canRecycle=false，不走池。
 */
export class ECSEntity {
    /**
     * 实体唯一编号（世代式数字句柄，由 {@link ECSWorld.getEntity} 分配）。
     * 销毁后世代递增，旧 eid 失效；勿手动修改，恢复存档可用 {@link ECSWorld.assignEid}。
     */
    eid = -1;
    /** 实体注册名（@ecs.register 时指定的 name，与对象池 key 一致） */
    name = '';
    /** 是否仍存活；destroy() 时置 false */
    isValid = true;
    /**
     * 实体所属世界（{@link ECSWorld.getEntity} 取出/创建时赋值）。
     * 组件增删广播、SoA、@EntityRef、销毁与 eid 释放均落到此世界，
     * 不依赖全局 {@link ecs.world.current}，从而支持多世界隔离。
     */
    world: ECSWorld = null!;
    /**
     * 组件位掩码（哪些 tid 当前挂载在实体上）。
     * 构造时按已注册组件数分配字数；set 越界时自动扩容（兼容晚注册组件类型）。
     */
    private mask: ECSMask = new ECSMask(registry.maskWordCount);
    /**
     * 当前挂载的组件实例（按 tid 下标索引，未挂载为 undefined）。
     * 热路径 get/has 走此数组；另保留 entity.CompName 同名属性以兼容历史写法。
     */
    private comps: (ecs.IComp | undefined)[] = [];
    /**
     * 软移除缓存：`remove(ctor, false)` 时组件不入池，暂存于此，下次 `add(ctor)` 同 tid 时恢复。
     *
     * 典型场景：UI 显隐保留状态、技能冷却暂挂、临时禁用功能。
     * 需自行在场景切换或内存紧张时调用 clearComponentCache / clearAllComponentCache；
     * 可用 ECSMonitorLogger 观察缓存规模。
     */
    private compTid2Obj: Map<number, ecs.IComp> = new Map();

    /** 获取组件位掩码（查询匹配器、分组内部使用） */
    getMask(): ECSMask {
        return this.mask;
    }

    /** 父实体（树形层级，与 ECS 组件模型独立，供业务组织用） */
    private _parent: ECSEntity | null = null;
    get parent(): ECSEntity | null {
        return this._parent;
    }
    set parent(value: ECSEntity | null) {
        this._parent = value;
    }

    /** 子实体表（eid -> 子实体），懒创建 */
    private childs: Map<number, ECSEntity> | null = null;

    /** 按 eid 获取直接子实体 */
    getChild<T extends ECSEntity>(eid: number): T | undefined {
        return this.childs?.get(eid) as T | undefined;
    }

    /**
     * 添加子实体（带循环引用检测）
     * @param entity 被添加的实体对象
     * @returns      子实体的唯一编号, -1表示添加失败
     */
    addChild(entity: ECSEntity): number {
        if (this.childs === null) {
            this.childs = new Map<number, ECSEntity>();
        }

        if (this.childs.has(entity.eid)) {
            console.warn(`子实体${entity.name}已存在`);
            return -1;
        }

        // 检测循环引用
        if (this.hasAncestor(entity)) {
            console.error(`检测到循环引用: ${this.name} -> ${entity.name}`);
            return -1;
        }

        entity._parent = this;
        this.childs.set(entity.eid, entity);
        return entity.eid;
    }

    /**
     * 检测是否存在祖先关系（防止循环引用）
     */
    private hasAncestor(entity: ECSEntity): boolean {
        let current: ECSEntity | null = this;
        while (current) {
            if (current === entity) return true;
            current = current.parent;
        }
        return false;
    }

    /**
     * 移除子实体
     * @param entity    被移除的实体对象
     * @param isDestroy 被移除的实体是否释放，默认为释放
     * @returns
     */
    removeChild(entity: ECSEntity, isDestroy = true): void {
        if (this.childs === null) return;

        entity.parent = null;
        this.childs.delete(entity.eid);
        if (isDestroy) entity.destroy();
    }

    /**
     * 挂载组件（双重重载）。
     *
     * **add(组件类, isReAdd?)**
     * - 已存在且 isReAdd=false：打日志并返回已有实例。
     * - 已存在且 isReAdd=true：先 remove 再添加。
     * - 优先从 {@link compTid2Obj} 恢复软移除缓存；否则 SoA 组件分配 Proxy，AoS 从对象池取实例。
     * - 广播到本世界分组/系统，触发 entityEnter 等钩子。
     *
     * **add(组件实例)** — 挂载外部已创建实例（如 cc.Component）：
     * - 设 canRecycle=false，不走对象池；须已 @ecs.register 且 tid 有效。
     * - 返回 this（链式写法则用 add 前的实体引用）。
     *
     * CC 组件不可由框架 new，应使用 add(实例) 而非 add(类)。
     */
    add<T extends ecs.IComp>(obj: T): ECSEntity;
    add<T extends ecs.IComp>(ctor: CompType<T>, isReAdd?: boolean): T;
    add<T extends ecs.IComp>(ctor: CompType<T> | T, isReAdd = false): T | ECSEntity {
        if (typeof ctor === 'function') {
            const compTid = ctor.tid;
            if (ctor.tid === -1) {
                throw Error(`【${this.name}】实体【${ctor.compName}】组件未注册`);
            }
            if (this.mask.has(compTid)) { // 判断是否有该组件，如果有则先移除
                if (isReAdd) {
                    this.remove(ctor);
                }
                else {
                    console.log(`【${this.name}】实体【${ctor.compName}】组件已存在`);
                    const existingComp = this.comps[compTid] as T | undefined;
                    if (existingComp) {
                        return existingComp;
                    }
                }
            }
            this.mask.set(compTid);

            let comp: T;
            if (this.compTid2Obj.has(compTid)) {
                comp = this.compTid2Obj.get(compTid) as T;
                this.compTid2Obj.delete(compTid);
            }
            else {
                // 托管存储（如 SoA）优先，否则 AoS 对象池——具体策略由 EntityHelper 决定
                comp = EntityHelper.acquireComponent(this.world, this.eid, ctor);
            }

            this.comps[compTid] = comp;
            // 同名属性引用：兼容 entity.CompName 直接访问
            EntityHelper.setEntityComp(this, ctor.compName, comp);
            comp.tid = compTid;
            comp.ent = this;
            // 广播实体添加组件的消息
            EntityHelper.broadcastCompAddOrRemove(this, compTid);

            return comp;
        }
        else {
            // 此时 ctor 是组件实例
            const compInstance = ctor as T;
            const tmpCtor = (compInstance.constructor as CompCtor<T>);
            const compTid = tmpCtor.tid;
            if (compTid === -1 || compTid == null) throw Error(`【${this.name}】实体【${tmpCtor.name}】组件未注册`);
            if (this.mask.has(compTid)) throw Error(`【${this.name}】实体【${tmpCtor.name}】组件已经存在`);

            this.mask.set(compTid);
            this.comps[compTid] = compInstance;
            EntityHelper.setEntityComp(this, tmpCtor.compName, compInstance);
            compInstance.tid = compTid;
            compInstance.canRecycle = false;
            compInstance.ent = this;
            EntityHelper.broadcastCompAddOrRemove(this, compTid);

            return this;
        }
    }

    /** 批量 add(组件类) */
    addComponents<T extends ecs.IComp>(...ctors: CompType<T>[]): this {
        const len = ctors.length;
        for (let i = 0; i < len; i++) {
            this.add(ctors[i]);
        }
        return this;
    }

    /** 按组件类获取当前挂载的实例（O(1) 数组下标访问） */
    get<T extends ecs.IComp>(ctor: CompCtor<T>): T | undefined {
        return this.comps[ctor.tid] as T | undefined;
    }

    /** 实体是否挂载了指定组件（支持组件类或 tid 数值） */
    has(ctor: CompType<ecs.IComp>): boolean {
        const tid = typeof ctor === 'number' ? ctor : ctor.tid;
        return this.mask.has(tid);
    }

    /**
     * 从实体移除指定组件。
     * @param ctor      组件类或 tid 数值
     * @param isRecycle 是否回收（默认 true）
     *
     * isRecycle=true：清理 @EntityRef、reset()、SoA 释放槽位或 AoS 回池（canRecycle 时）、
     * 更新 mask/comps、广播分组；若移除的是本世界单例实例则精确驱逐 tid2comp。
     *
     * isRecycle=false：数据保留在 {@link compTid2Obj}，下次 add(类) 同 tid 时原样恢复。
     */
    remove(ctor: CompType<ecs.IComp>, isRecycle = true): void {
        const componentTypeId = typeof ctor === 'number' ? ctor : ctor.tid;

        if (!this.mask.has(componentTypeId)) {
            return;
        }

        const comp = this.comps[componentTypeId];
        if (!comp) {
            return;
        }
        // 解析同名属性（数值 tid 也能正确清理命名引用）
        const compName = typeof ctor === 'number'
            ? (registry.compCtors[componentTypeId]?.compName ?? '')
            : ctor.compName;

        // 精确驱逐单例：仅当被移除的组件正是本世界登记的单例实例时才清除
        if (this.world.singletons.get(componentTypeId) === comp) {
            this.world.singletons.delete(componentTypeId);
        }

        comp.ent = null!;

        if (isRecycle) {
            // 注销该组件持有的所有 @EntityRef 引用，防止池化复用残留过期引用
            clearComponentEntityRefs(comp);
            comp.reset();
            // 释放存储：托管存储交还槽位，否则 AoS 回池（具体策略由 EntityHelper 决定）
            EntityHelper.releaseComponent(this.world, this.eid, registry.compCtors[componentTypeId], comp);
        }
        else {
            // isRecycle=false：软移除，实例暂存 compTid2Obj
            this.compTid2Obj.set(componentTypeId, comp);
        }

        // 删除实体上的组件逻辑
        this.comps[componentTypeId] = undefined;
        EntityHelper.deleteEntityComp(this, compName);
        this.mask.delete(componentTypeId);
        EntityHelper.broadcastCompAddOrRemove(this, componentTypeId);
    }

    /**
     * 清理指定 tid 的软移除缓存：reset、SoA 释放或回池，与 remove(isRecycle=true) 回收路径一致。
     * @param ctor 组件类或 tid
     */
    clearComponentCache(ctor: CompType<ecs.IComp>): void {
        const componentTypeId = typeof ctor === 'number' ? ctor : ctor.tid;
        const comp = this.compTid2Obj.get(componentTypeId);

        if (comp) {
            this.compTid2Obj.delete(componentTypeId);

            const ctorObj = registry.compCtors[componentTypeId];
            const compName = ctorObj?.compName || `tid:${componentTypeId}`;

            comp.reset();
            EntityHelper.releaseComponent(this.world, this.eid, ctorObj, comp);

            console.log(`[ECS] 实体 ${this.name} 清理组件缓存: ${compName}`);
        }
    }

    /** 清理本实体全部软移除缓存（destroy 前调用，此时 eid 仍有效以便 SoA release） */
    clearAllComponentCache(): void {
        if (this.compTid2Obj.size === 0) return;

        const count = this.compTid2Obj.size;

        this.compTid2Obj.forEach((comp, tid) => {
            comp.reset();
            EntityHelper.releaseComponent(this.world, this.eid, registry.compCtors[tid], comp);
        });

        this.compTid2Obj.clear();

        console.log(`[ECS] 实体 ${this.name} 清理所有缓存，共 ${count} 个组件`);
    }

    /**
     * 遍历实体当前挂载的所有组件实例（不含软移除缓存）
     * @param cb 回调（组件实例, 组件类型id）
     */
    forEachComponent(cb: (comp: ecs.IComp, tid: number) => void): void {
        const comps = this.comps;
        for (let tid = 0; tid < comps.length; tid++) {
            const comp = comps[tid];
            if (comp) cb(comp, tid);
        }
    }

    /** 软移除缓存中的组件数量 */
    getCachedComponentCount(): number {
        return this.compTid2Obj.size;
    }

    /** 软移除缓存快照（tid -> 组件），供 ECSMonitorLogger 等监控使用 */
    getCachedComponents(): Map<number, ecs.IComp> {
        return new Map(this.compTid2Obj);
    }

    /**
     * 销毁实体：断开父子关系 → 移除全部挂载组件 → 清理软移除缓存 → 回收到对象池并释放 eid。
     *
     * 顺序保证：clearAllComponentCache 在 destroyEntity 之前执行，以便 SoA 仍可按 eid 释放槽位；
     * destroyEntity 会置空指向本实体的 @EntityRef，并递增 eid 世代使旧句柄失效。
     */
    destroy(): void {
        this.isValid = false;

        if (this._parent) {
            this._parent.removeChild(this, false);
            this._parent = null;
        }

        if (this.childs) {
            this.childs.forEach((e) => {
                this.removeChild(e);
            });
            this.childs.clear();
            this.childs = null;
        }

        // 移除实体上所有组件（按 tid 顺序，remove 内部会清理命名引用与 mask）
        const comps = this.comps;
        for (let tid = 0; tid < comps.length; tid++) {
            if (comps[tid]) this.remove(tid, true);
        }
        comps.length = 0;

        // 先清理软移除缓存（此时 eid 仍有效，SoA 槽位能按 eid 正确释放），
        // 再回收实体并释放 eid——避免实体先入池、eid 先失效后又访问 SoA。
        this.clearAllComponentCache();
        EntityHelper.destroyEntity(this);
    }
}
