import { ecs } from "./ECS";
import { ECSMask } from "./ECSMask";
import { CompCtor, CompType, ECSModel } from "./ECSModel";

//#region 辅助方法

/**
 * 实体身上组件有增删操作，广播通知对应的观察者
 * @param entity 实体对象
 * @param componentTypeId 组件类型id
 */
function broadcastCompAddOrRemove(entity: ECSEntity, componentTypeId: number) {
    let events = ECSModel.compAddOrRemove.get(componentTypeId);
    for (let i = events!.length - 1; i >= 0; i--) {
        events![i](entity);
    }
    // 判断是不是删了单例组件
    if (ECSModel.tid2comp.has(componentTypeId)) {
        ECSModel.tid2comp.delete(componentTypeId);
    }
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
    let comps = ECSModel.compPools.get(ctor.tid)!;
    let component = comps.pop() || new (cct as CompCtor<T>);
    return component as T;
}

/**
 * 销毁实体
 * 
 * 缓存销毁的实体，下次新建实体时会优先从缓存中拿
 * @param entity 
 */
function destroyEntity(entity: ECSEntity) {
    if (ECSModel.eid2Entity.has(entity.eid)) {
        let entitys = ECSModel.entityPool.get(entity.name);
        if (entitys == null) {
            entitys = [];
            ECSModel.entityPool.set(entity.name, entitys);
        }
        entitys.push(entity);
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
    eid: number = -1;
    /** 实体对象名 */
    name: string = "";
    /** 实体是否有效 */
    isValid: boolean = true;
    /** 组件过滤数据 */
    private mask = new ECSMask();
    /** 当前实体身上附加的组件构造函数 */
    private compTid2Ctor: Map<number, CompType<ecs.IComp>> = new Map();
    /** 配合 entity.remove(Comp, false)， 记录组件实例上的缓存数据，在添加时恢复原数据 */
    private compTid2Obj: Map<number, ecs.IComp> = new Map();

    private _parent: ECSEntity | null = null;
    /** 父实体 */
    get parent(): ECSEntity | null {
        return this._parent;
    }
    set parent(value: ECSEntity | null) {
        this._parent = value;
    }

    private _children: Map<number, ECSEntity> | null = null;
    /** 子实体集合 */
    get children(): Map<number, ECSEntity> {
        if (this._children == null) {
            this._children = new Map<number, ECSEntity>();
        }
        return this._children;
    }

    /**
     * 添加子实体
     * @param entity 被添加的实体对象
     */
    addChild(entity: ECSEntity) {
        entity._parent = this;
        this.children.set(entity.eid, entity);
    }

    /**
     * 移除子实体
     * @param entity    被移除的实体对象
     * @param isDestroy 被移除的实体是否释放，默认为释放
     * @returns 
     */
    removeChild(entity: ECSEntity, isDestroy = true) {
        if (this.children == null) return;

        entity.parent = null;
        this.children.delete(entity.eid);
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
    add<T extends ecs.IComp>(ctor: CompType<T> | T, isReAdd: boolean = false): T | ECSEntity {
        if (typeof ctor === 'function') {
            let compTid = ctor.tid;
            if (ctor.tid === -1) {
                throw Error(`【${this.name}】实体【${ctor.compName}】组件未注册`);
            }
            if (this.compTid2Ctor.has(compTid)) {                               // 判断是否有该组件，如果有则先移除
                if (isReAdd) {
                    this.remove(ctor);
                }
                else {
                    console.log(`【${this.name}】实体【${ctor.compName}】组件已存在`);
                    // @ts-ignore
                    return this[ctor.compName] as T;
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
                comp = createComp(ctor) as T;
            }

            // 将组件对象直接附加到实体对象身上，方便直接获取
            // @ts-ignore
            this[ctor.compName] = comp;
            this.compTid2Ctor.set(compTid, ctor);
            comp.ent = this;
            // 广播实体添加组件的消息
            broadcastCompAddOrRemove(this, compTid);

            return comp;
        }
        else {
            let tmpCtor = (ctor.constructor as CompCtor<T>);
            let compTid = tmpCtor.tid;
            // console.assert(compTid !== -1 || !compTid, '组件未注册！');
            // console.assert(this.compTid2Ctor.has(compTid), '已存在该组件！');
            if (compTid === -1 || compTid == null) throw Error(`【${this.name}】实体【${tmpCtor.name}】组件未注册`);
            if (this.compTid2Ctor.has(compTid)) throw Error(`【${this.name}】实体【${tmpCtor.name}】组件已经存在`);

            this.mask.set(compTid);
            //@ts-ignore
            this[tmpCtor.compName] = ctor;
            this.compTid2Ctor.set(compTid, tmpCtor);
            //@ts-ignore
            ctor.ent = this;
            //@ts-ignore
            ctor.canRecycle = false;
            broadcastCompAddOrRemove(this, compTid);

            return this;
        }
    }

    /**
     * 批量添加组件
     * @param ctors 组件类
     * @returns 
     */
    addComponents<T extends ecs.IComp>(...ctors: CompType<T>[]) {
        for (let ctor of ctors) {
            this.add(ctor);
        }
        return this;
    }

    /**
     * 获取一个组件实例
     * @param ctor 组件类
     */
    get(ctor: number): number;
    get<T extends ecs.IComp>(ctor: CompCtor<T>): T;
    get<T extends ecs.IComp>(ctor: CompCtor<T> | number): T {
        // @ts-ignore
        return this[ctor.compName];
    }

    /**
     * 组件是否在实体存在内
     * @param ctor 组件类
     */
    has(ctor: CompType<ecs.IComp>): boolean {
        if (typeof ctor == "number") {
            return this.mask.has(ctor);
        }
        else {
            return this.compTid2Ctor.has(ctor.tid);
        }
    }

    /**
     * 从实体上删除指定组件
     * @param ctor      组件构造函数或者组件Tag
     * @param isRecycle 是否回收该组件对象。对于有些组件上有大量数据，当要描述移除组件但是不想清除组件上的数据是可以
     * 设置该参数为false，这样该组件对象会缓存在实体身上，下次重新添加组件时会将该组件对象添加回来，不会重新从组件缓存
     * 池中拿一个组件来用。
     */
    remove(ctor: CompType<ecs.IComp>, isRecycle: boolean = true) {
        let hasComp = false;
        //@ts-ignore
        let componentTypeId = ctor.tid;
        //@ts-ignore
        let compName = ctor.compName;
        if (this.mask.has(componentTypeId)) {
            hasComp = true;
            //@ts-ignore
            let comp = this[ctor.compName];
            //@ts-ignore
            comp.ent = null;
            if (isRecycle) {
                comp.reset();

                // 回收组件到指定缓存池中
                if (comp.canRecycle) {
                    const compPoolsType = ECSModel.compPools.get(componentTypeId)!;
                    compPoolsType.push(comp);
                }
            }
            else {
                this.compTid2Obj.set(componentTypeId, comp);        // 用于缓存显示对象组件
            }
        }

        // 删除实体上的组件逻辑
        if (hasComp) {
            //@ts-ignore
            this[compName] = null;
            this.mask.delete(componentTypeId);
            this.compTid2Ctor.delete(componentTypeId);
            broadcastCompAddOrRemove(this, componentTypeId);
        }
    }

    /** 销毁实体，实体会被回收到实体缓存池中 */
    destroy() {
        this.isValid = false;

        // 如果有父模块，则移除父模块上记录的子模块
        if (this._parent) {
            this._parent.removeChild(this, false);
            this._parent = null;
        }

        // 移除模块上所有子模块
        if (this._children) {
            this._children.forEach(e => {
                this.removeChild(e);
            });
            this._children = null;
        }

        // 移除实体上所有组件
        this.compTid2Ctor.forEach(this._remove, this);
        destroyEntity(this);
        this.compTid2Obj.clear();
    }

    private _remove(comp: CompType<ecs.IComp>) {
        this.remove(comp, true);
    }
}