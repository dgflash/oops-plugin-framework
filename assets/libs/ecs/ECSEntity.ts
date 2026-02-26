import type { ecs } from './ECS';
import { ECSMask } from './ECSMask';
import type { CompCtor, CompType } from './ECSModel';
import { ECSModel } from './ECSModel';

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
 * 创建组件对象
 * @param ctor
 */
function createComp<T extends ecs.IComp>(ctor: CompCtor<T>): T {
    const cct = ECSModel.compCtors[ctor.tid];
    if (!cct) {
        throw Error(`没有找到该组件的构造函数，检查${ctor.compName}是否为不可构造的组件`);
    }
    const comps = ECSModel.compPools.get(ctor.tid);
    if (!comps) {
        throw Error(`组件${ctor.compName}的对象池不存在`);
    }
    const component = comps.pop() || new (cct as CompCtor<T>)();
    return component as T;
}

/**
 * 销毁实体
 *
 * 缓存销毁的实体，下次新建实体时会优先从缓存中拿
 * @param entity
 */
function destroyEntity(entity: ECSEntity): void {
    if (ECSModel.eid2Entity.has(entity.eid)) {
        let entitys = ECSModel.entityPool.get(entity.name);
        if (entitys === undefined) {
            entitys = [];
            ECSModel.entityPool.set(entity.name, entitys);
        }
        // 限制对象池大小，防止内存无限增长
        if (entitys.length < ECSModel.MAX_ENTITY_POOL_SIZE) {
            // 池未满：保留 Uint32Array，仅清空位图，复用时零开销
            entity.getMask().clear();
            entitys.push(entity);
        }
        else {
            // 池已满：实体真正丢弃，将 Uint32Array 回收到 MaskPool 供后续复用
            entity.getMask().destroy();
        }
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
    /** 配合 entity.remove(Comp, false)， 记录组件实例上的缓存数据，在添加时恢复原数据 */
    private compTid2Obj: Map<number, ecs.IComp> = new Map();
    /** 组件缓存容量限制，防止内存泄漏 */
    private static readonly MAX_CACHE_COMP = 10;

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
     * 添加子实体
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

        entity._parent = this;
        this.childs.set(entity.eid, entity);
        return entity.eid;
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
     * @param isRecycle 是否回收该组件对象。对于有些组件上有大量数据，当要描述移除组件但是不想清除组件上的数据是可以
     * 设置该参数为false，这样该组件对象会缓存在实体身上，下次重新添加组件时会将该组件对象添加回来，不会重新从组件缓存
     * 池中拿一个组件来用。
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

            // 回收组件到指定缓存池中，限制池大小
            if (comp.canRecycle) {
                const compPoolsType = ECSModel.compPools.get(componentTypeId);
                if (compPoolsType && compPoolsType.length < ECSModel.MAX_COMP_POOL_SIZE) {
                    compPoolsType.push(comp);
                }
            }
        }
        else {
            // 限制缓存组件数量，防止内存泄漏
            if (this.compTid2Obj.size < ECSEntity.MAX_CACHE_COMP) {
                this.compTid2Obj.set(componentTypeId, comp); // 用于缓存显示对象组件
            }
            else {
                // 超过限制，强制回收
                console.warn(`实体 ${this.name} 缓存组件数量超过限制，强制回收组件 ${compName}`);
                comp.reset();
                if (comp.canRecycle) {
                    const compPoolsType = ECSModel.compPools.get(componentTypeId);
                    if (compPoolsType && compPoolsType.length < ECSModel.MAX_COMP_POOL_SIZE) {
                        compPoolsType.push(comp);
                    }
                }
            }
        }

        // 删除实体上的组件逻辑
        deleteEntityComp(this, compName);
        this.mask.delete(componentTypeId);
        this.compTid2Ctor.delete(componentTypeId);
        broadcastCompAddOrRemove(this, componentTypeId);
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
        this.compTid2Obj.clear();
    }

    private _remove(comp: CompType<ecs.IComp>): void {
        this.remove(comp, true);
    }
}
