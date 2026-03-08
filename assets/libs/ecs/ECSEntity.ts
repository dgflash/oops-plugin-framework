import type { ecs } from './ECS';
import { ECSMask } from './ECSMask';
import type { CompCtor, CompType } from './ECSModel';
import { ECSModel } from './ECSModel';
import { globalPoolCoordinator } from './ECSPoolManager';

//#region 辅助方法

/**
 * 实体身上组件有增删操作，广播通知对应的观察者
 * @param entity 实体对象
 * @param componentTypeId 组件类型id
 */
function broadcastCompAddOrRemove(entity: ECSEntity, componentTypeId: number): void {
    const events = ECSModel.compAddOrRemove.get(componentTypeId);
    if (events) {
        for (let i = events.length - 1; i >= 0; i--) {
            events[i](entity);
        }
    }
    // 判断是不是删了单例组件
    if (ECSModel.tid2comp.has(componentTypeId)) {
        ECSModel.tid2comp.delete(componentTypeId);
    }
}

/**
 * 设置实体上的组件属性（类型安全的动态属性访问）
 */
function setEntityComp<T extends ecs.IComp>(entity: ECSEntity, compName: string, comp: T): void {
    Reflect.set(entity, compName, comp);
}

/**
 * 获取实体上的组件属性（类型安全的动态属性访问）
 */
function getEntityComp<T extends ecs.IComp>(entity: ECSEntity, compName: string): T | undefined {
    return Reflect.get(entity, compName) as T | undefined;
}

/**
 * 删除实体上的组件属性（类型安全的动态属性访问）
 */
function deleteEntityComp(entity: ECSEntity, compName: string): void {
    Reflect.set(entity, compName, null);
}

/**
 * 创建组件对象（使用动态池管理）
 * @param ctor
 */
function createComp<T extends ecs.IComp>(ctor: CompCtor<T>): T {
    const cct = ECSModel.compCtors[ctor.tid];
    if (!cct) {
        throw Error(`没有找到该组件的构造函数，检查${ctor.compName}是否为不可构造的组件`);
    }
    
    // 使用动态池管理器
    const pool = globalPoolCoordinator.getPool(
        ctor.compName,
        () => new (cct as CompCtor<T>)(),
        ctor
    );
    
    const component = pool.get();
    return component as T;
}

/**
 * 销毁实体（使用动态池管理）
 *
 * 缓存销毁的实体，下次新建实体时会优先从缓存中拿
 * @param entity
 */
function destroyEntity(entity: ECSEntity): void {
    if (ECSModel.eid2Entity.has(entity.eid)) {
        // 使用动态池管理器
        const pool = globalPoolCoordinator.getPool(
            entity.name,
            () => new ECSEntity()
        );
        
        // 清空mask并回收
        entity.getMask().clear();
        pool.recycle(entity);
        
        ECSModel.eid2Entity.delete(entity.eid);
    }
    else {
        console.warn('试图销毁不存在的实体');
    }
}

//#endregion

/** ECS实体对象 */
export class ECSEntity {
    /** 实体唯一标识，不要手动修改 */
    eid = -1;
    /** 实体对象名 */
    name = '';
    /** 实体是否有效 */
    isValid = true;
    /** 组件过滤数据 */
    private mask: ECSMask = new ECSMask();
    /** 当前实体身上附加的组件构造函数 */
    private compTid2Ctor: Map<number, CompType<ecs.IComp>> = new Map();
    /** 
     * 配合 entity.remove(Comp, false)， 记录组件实例上的缓存数据，在添加时恢复原数据
     * 
     * ⚠️ 核心机制：
     * - isRecycle=true：调用reset()，根据canRecycle决定是否回收到全局池
     * - isRecycle=false：不调用reset()，缓存在实体上
     * 
     * ⚠️ 使用场景说明：
     * 1. UI显示/隐藏 - 保留UI状态数据
     * 2. 技能冷却 - 保留冷却时间
     * 3. 临时禁用功能 - 保留配置数据
     * 
     * 💡 管理建议：
     * - 无任何限制，完全由用户自行管理
     * - 使用 ECSMemoryMonitor 监控缓存使用情况
     * - 定期调用 clearComponentCache() 或 clearAllComponentCache() 清理
     * - 在场景切换、内存警告时主动清理缓存
     */
    private compTid2Obj: Map<number, ecs.IComp> = new Map();

    /** 获取 mask 对象（内部使用） */
    getMask(): ECSMask {
        return this.mask;
    }

    private _parent: ECSEntity | null = null;
    /** 父实体 */
    get parent(): ECSEntity | null {
        return this._parent;
    }
    set parent(value: ECSEntity | null) {
        this._parent = value;
    }

    /** 子实体 */
    private childs: Map<number, ECSEntity> | null = null;

    /** 获取子实体 */
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
     * 根据组件类动态创建组件，并通知关心的系统。如果实体存在了这个组件，那么会先删除之前的组件然后添加新的
     *
     * 注意：不要直接new Component，new来的Component不会从Component的缓存池拿缓存的数据
     * @param componentTypeId   组件类
     * @param isReAdd           true-表示用户指定这个实体可能已经存在了该组件，那么再次add组件的时候会先移除该组件然后再添加一遍。false-表示不重复添加组件
     */
    add<T extends ecs.IComp>(obj: T): ECSEntity;
    add<T extends ecs.IComp>(ctor: CompType<T>, isReAdd?: boolean): T;
    add<T extends ecs.IComp>(ctor: CompType<T> | T, isReAdd = false): T | ECSEntity {
        if (typeof ctor === 'function') {
            const compTid = ctor.tid;
            if (ctor.tid === -1) {
                throw Error(`【${this.name}】实体【${ctor.compName}】组件未注册`);
            }
            if (this.compTid2Ctor.has(compTid)) { // 判断是否有该组件，如果有则先移除
                if (isReAdd) {
                    this.remove(ctor);
                }
                else {
                    console.log(`【${this.name}】实体【${ctor.compName}】组件已存在`);
                    const existingComp = getEntityComp<T>(this, ctor.compName);
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
                // 创建组件对象
                comp = createComp(ctor);
            }

            // 将组件对象直接附加到实体对象身上，方便直接获取
            setEntityComp(this, ctor.compName, comp);
            this.compTid2Ctor.set(compTid, ctor);
            comp.tid = compTid;
            comp.ent = this;
            // 广播实体添加组件的消息
            broadcastCompAddOrRemove(this, compTid);

            return comp;
        }
        else {
            // 此时 ctor 是组件实例
            const compInstance = ctor as T;
            const tmpCtor = (compInstance.constructor as CompCtor<T>);
            const compTid = tmpCtor.tid;
            if (compTid === -1 || compTid == null) throw Error(`【${this.name}】实体【${tmpCtor.name}】组件未注册`);
            if (this.compTid2Ctor.has(compTid)) throw Error(`【${this.name}】实体【${tmpCtor.name}】组件已经存在`);

            this.mask.set(compTid);
            setEntityComp(this, tmpCtor.compName, compInstance);
            this.compTid2Ctor.set(compTid, tmpCtor);
            compInstance.tid = compTid;
            compInstance.canRecycle = false;
            compInstance.ent = this;
            broadcastCompAddOrRemove(this, compTid);

            return this;
        }
    }

    /**
     * 批量添加组件
     * @param ctors 组件类
     * @returns
     */
    addComponents<T extends ecs.IComp>(...ctors: CompType<T>[]): this {
        const len = ctors.length;
        for (let i = 0; i < len; i++) {
            this.add(ctors[i]);
        }
        return this;
    }

    /**
     * 获取一个组件实例
     * @param ctor 组件类
     */
    get<T extends ecs.IComp>(ctor: CompCtor<T>): T | undefined {
        return getEntityComp<T>(this, ctor.compName);
    }

    /**
     * 组件是否在实体存在内
     * @param ctor 组件类
     */
    has(ctor: CompType<ecs.IComp>): boolean {
        const tid = typeof ctor === 'number' ? ctor : ctor.tid;
        return this.compTid2Ctor.has(tid);
    }

    /**
     * 从实体上删除指定组件
     * @param ctor      组件构造函数或者组件Tag
     * @param isRecycle 是否回收该组件对象
     * 
     * **isRecycle=true（默认）：**
     * - 调用组件的 reset() 方法清理数据
     * - 如果 canRecycle=true，回收到全局对象池供复用
     * - 如果 canRecycle=false，直接销毁
     * - 适用于大部分场景
     * 
     * **isRecycle=false：**
     * - 不调用 reset()，数据完整保留
     * - 组件缓存在当前实体上，下次 add() 时恢复
     * - 无任何限制和检查，完全由用户自行管理
     * - 适用于需要保留状态的场景（UI切换、技能冷却等）
     * 
     * ⚠️ isRecycle=false 使用场景：
     * - UI显示/隐藏：保留UI状态（如滚动位置、选中项）
     * - 技能冷却：保留冷却剩余时间
     * - 临时禁用：保留配置数据，稍后恢复
     * 
     * 💡 管理建议：
     * - 使用 ECSMemoryMonitor 监控缓存使用情况
     * - 定期调用 clearComponentCache() 或 clearAllComponentCache() 清理
     * - 在场景切换、内存警告时主动清理缓存
     */
    remove(ctor: CompType<ecs.IComp>, isRecycle = true): void {
        const componentTypeId = typeof ctor === 'number' ? ctor : ctor.tid;
        const compName = typeof ctor === 'number' ? '' : ctor.compName;

        if (!this.mask.has(componentTypeId)) {
            return;
        }

        const comp = getEntityComp<ecs.IComp>(this, compName);
        if (!comp) {
            return;
        }

        comp.ent = null!;

        if (isRecycle) {
            comp.reset();
            
            // 回收到全局池
            if (comp.canRecycle) {
                const ctor = ECSModel.compCtors[componentTypeId];
                if (ctor) {
                    const pool = globalPoolCoordinator.getPool(
                        ctor.compName,
                        () => new (ctor as any)(),
                        ctor
                    );
                    pool.recycle(comp);
                }
            }
        }
        else {
            // isRecycle=false：用户明确要求缓存，完全尊重用户意图
            // 不做任何检查和限制，由用户通过 ECSMemoryMonitor 自行管理
            this.compTid2Obj.set(componentTypeId, comp);
        }

        // 删除实体上的组件逻辑
        deleteEntityComp(this, compName);
        this.mask.delete(componentTypeId);
        this.compTid2Ctor.delete(componentTypeId);
        broadcastCompAddOrRemove(this, componentTypeId);
    }
    
    /**
     * 清理指定组件的缓存
     * @param ctor 组件构造函数
     */
    clearComponentCache(ctor: CompType<ecs.IComp>): void {
        const componentTypeId = typeof ctor === 'number' ? ctor : ctor.tid;
        const comp = this.compTid2Obj.get(componentTypeId);
        
        if (comp) {
            this.compTid2Obj.delete(componentTypeId);
            
            const ctorObj = ECSModel.compCtors[componentTypeId];
            const compName = ctorObj?.compName || `tid:${componentTypeId}`;
            
            comp.reset();
            if (comp.canRecycle) {
                if (ctorObj) {
                    const pool = globalPoolCoordinator.getPool(
                        ctorObj.compName,
                        () => new (ctorObj as any)(),
                        ctorObj
                    );
                    pool.recycle(comp);
                }
            }
            
            console.log(`[ECS] 实体 ${this.name} 清理组件缓存: ${compName}`);
        }
    }
    
    /**
     * 清理所有组件缓存
     */
    clearAllComponentCache(): void {
        if (this.compTid2Obj.size === 0) return;
        
        const count = this.compTid2Obj.size;
        
        this.compTid2Obj.forEach((comp, tid) => {
            comp.reset();
            if (comp.canRecycle) {
                const ctor = ECSModel.compCtors[tid];
                if (ctor) {
                    const pool = globalPoolCoordinator.getPool(
                        ctor.compName,
                        () => new (ctor as any)(),
                        ctor
                    );
                    pool.recycle(comp);
                }
            }
        });
        
        this.compTid2Obj.clear();
        
        console.log(`[ECS] 实体 ${this.name} 清理所有缓存，共 ${count} 个组件`);
    }
    
    /**
     * 获取缓存的组件数量
     */
    getCachedComponentCount(): number {
        return this.compTid2Obj.size;
    }
    
    /**
     * 获取缓存的组件列表（用于监控）
     */
    getCachedComponents(): Map<number, ecs.IComp> {
        return new Map(this.compTid2Obj);
    }

    /** 销毁实体，实体会被回收到实体缓存池中 */
    destroy(): void {
        this.isValid = false;

        // 如果有父模块，则移除父模块上记录的子模块
        if (this._parent) {
            this._parent.removeChild(this, false);
            this._parent = null;
        }

        // 移除模块上所有子模块
        if (this.childs) {
            this.childs.forEach((e) => {
                this.removeChild(e);
            });
            this.childs.clear();
            this.childs = null;
        }

        // 移除实体上所有组件
        this.compTid2Ctor.forEach(this._remove, this);
        destroyEntity(this);

        // 清理缓存的组件对象，防止内存泄漏
        this.clearAllComponentCache();
    }

    private _remove(comp: CompType<ecs.IComp>): void {
        this.remove(comp, true);
    }
}
