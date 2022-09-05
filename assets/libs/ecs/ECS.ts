import { ECSComp } from "./ECSComp";
import { ECSEntity } from "./ECSEntity";
import { ECSMatcher } from "./ECSMatcher";
import { CompCtor, CompType, ECSModel, EntityCtor } from "./ECSModel";
import { ECSComblockSystem, ECSRootSystem, ECSSystem } from "./ECSSystem";

/** Entity-Component-System（实体-组件-系统）框架 */
export module ecs {
    /** 实体 - 一个概念上的定义，指的是游戏世界中的一个独特物体，是一系列组件的集合 */
    export type Entity = ECSEntity;
    /** 组件 - 一堆数据的集合，即不存在任何的行为，只用来存储状态 */
    export type Comp = ECSComp;
    /** 系统 - 关注实体上组件数据变化，处理游戏逻辑 */
    export type System = ECSSystem;
    /** 根系统 - 驱动游戏中所有系统工作 */
    export type RootSystem = ECSRootSystem;
    /** 处理游戏逻辑系统对象 - 继承此对象实现自定义业务逻辑 */
    export type ComblockSystem = ECSComblockSystem;

    /** 实体 - 一个概念上的定义，指的是游戏世界中的一个独特物体，是一系列组件的集合 */
    export const Entity = ECSEntity;
    /** 组件 - 一堆数据的集合，即不存在任何的行为，只用来存储状态 */
    export const Comp = ECSComp;
    /** 系统 - 关注实体上组件数据变化，处理游戏逻辑 */
    export const System = ECSSystem;
    /** 根系统 - 驱动游戏中所有系统工作 */
    export const RootSystem = ECSRootSystem;
    /** 处理游戏逻辑系统对象 - 继承此对象实现自定义业务逻辑 */
    export const ComblockSystem = ECSComblockSystem;

    //#region 接口

    /** 组件接口 */
    export interface IComp {
        canRecycle: boolean;
        ent: Entity;

        reset(): void;
    }

    /** 实体匹配器接口 */
    export interface IMatcher {
        mid: number;
        indices: number[];
        key: string;
        isMatch(entity: Entity): boolean;
    }

    /**
     * 监听组件首次添加到实体上时，在ComblockSystem上实现这个接口
     * 1. entityEnter会在update方法之前执行，实体进入后，不会再次进入entityEnter方法中
     * 2. 当实体从当前System移除，下次再次符合条件进入System也会执行上述流程
     * @example
    export class RoleUpgradeSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem {
        filter(): ecs.IMatcher {
            return ecs.allOf(RoleUpgradeComp, RoleModelLevelComp);
        }

        entityEnter(e: Role): void {
            e.remove(RoleUpgradeComp);
        }
    }
     */
    export interface IEntityEnterSystem<E extends Entity = Entity> {
        entityEnter(entity: E): void;
    }

    /** 监听组件从实体上移除时，在ComblockSystem上实现这个接口 */
    export interface IEntityRemoveSystem<E extends Entity = Entity> {
        entityRemove(entity: E): void;
    }

    /** 监听系统第一次执行update处理实体时，在ComblockSystem上实现这个接口 */
    export interface ISystemFirstUpdate<E extends Entity = Entity> {
        firstUpdate(entity: E): void;
    }

    /** 监听系统执行update处理实体时，在ComblockSystem上实现这个接口 */
    export interface ISystemUpdate<E extends Entity = Entity> {
        update(entity: E): void;
    }
    //#endregion

    /**
     * 注册组件到ecs系统中
     * @param name   由于js打包会改变类名，所以这里必须手动传入组件的名称
     * @param canNew 标识是否可以new对象。想继承自Cocos Creator的组件就不能去new，需要写成@ecs.register('name', false)
     * @example
    // 注册实体
    @ecs.register('Role')
    export class Role extends ecs.Entity {

    }

    // 注册数据组件
    @ecs.register('RoleModel')
    export class RoleModelComp extends ecs.Comp {
        id: number = -1;

        reset() {
            this.id =  -1;
        }
    }

    // 注册显示对象组件
    @ccclass('RoleViewComp')
    @ecs.register('RoleView', false)
    export class RoleViewComp extends CCComp {
        @property({ type: sp.Skeleton, tooltip: '角色动画' })
        spine: sp.Skeleton = null!;

        onLoad(){
            
        }
    }
     */
    export function register<T>(name: string, canNew: boolean = true) {
        return function (ctor: any) {
            // 注册实体
            if (ctor.tid == undefined) {
                ECSModel.entityCtors.set(ctor as EntityCtor<T>, name);
            }
            // 注册组件
            else {
                if (ctor.tid === -1) {
                    ctor.tid = ECSModel.compTid++;
                    ctor.compName = name;
                    if (canNew) {
                        ECSModel.compCtors.push(ctor);
                        ECSModel.compPools.set(ctor.tid, []);
                    }
                    else {
                        ECSModel.compCtors.push(null!);
                    }
                    ECSModel.compAddOrRemove.set(ctor.tid, []);
                }
                else {
                    throw new Error(`重复注册组件： ${name}.`);
                }
            }
        }
    }

    /**
     * 创建一个新的实体对象或从缓存中获取一个实体对象
     * @param ctor 实体类
     */
    export function getEntity<T extends Entity>(ctor: EntityCtor<T>): T {
        // 获取实体对象名
        var entityName = ECSModel.entityCtors.get(ctor);
        if (entityName == undefined)
            console.error(`${ctor.name} 实体没有注册`);

        // 获取实体对象池
        var entitys = ECSModel.entityPool.get(entityName!) || [];
        var entity: any = entitys.pop();

        // 缓存中没有同类实体，则创建一个新的
        if (!entity) {
            entity = new ctor();
            entity.eid = ECSModel.eid++;        // 实体唯一编号
            entity.name = entityName;
        }

        // 触发实体初始化逻辑
        if (entity.init)
            entity.init();
        else
            console.error(`${ctor.name} 实体缺少 init 方法初始化默认组件`);

        ECSModel.eid2Entity.set(entity.eid, entity);
        return entity as T;
    }

    /**
     * 动态查询实体
     * @param matcher 匹配器
     * @example
     * ecs.query(ecs.allOf(Comp1, Comp2));
     */
    export function query<E extends Entity = Entity>(matcher: IMatcher): E[] {
        let group = ECSModel.groups.get(matcher.mid);
        if (!group) {
            group = ECSModel.createGroup(matcher);
            ECSModel.eid2Entity.forEach(group.onComponentAddOrRemove, group);
        }
        return group.matchEntities as E[];
    }

    /** 清理所有的实体 */
    export function clear() {
        ECSModel.eid2Entity.forEach((entity) => {
            entity.destroy();
        });
        ECSModel.groups.forEach((group) => {
            group.clear();
        });
        ECSModel.compAddOrRemove.forEach(callbackLst => {
            callbackLst.length = 0;
        });
        ECSModel.eid2Entity.clear();
        ECSModel.groups.clear();
    }

    /**
     * 通过实体唯一编号获得实体对象
     * @param eid 实体唯一编号
     */
    export function getEntityByEid<E extends Entity = Entity>(eid: number): E {
        return ECSModel.eid2Entity.get(eid) as E;
    }

    /** 当前活动中的实体数量 */
    export function activeEntityCount() {
        return ECSModel.eid2Entity.size;
    }

    /** 创建实体 */
    function createEntity<E extends Entity = Entity>(): E {
        let entity = new Entity();
        entity.eid = ECSModel.eid++;                     // 实体id也是有限的资源
        ECSModel.eid2Entity.set(entity.eid, entity);
        return entity as E;
    }

    /**
     * 指定一个组件创建实体，返回组件对象。
     * @param ctor 
     */
    function createEntityWithComp<T extends IComp>(ctor: CompCtor<T>): T {
        let entity = createEntity();
        return entity.add(ctor);
    }

    //#region 过滤器
    /**
     * 表示只关心这些组件的添加和删除动作。虽然实体可能有这些组件之外的组件，但是它们的添加和删除没有被关注，所以不会存在对关注之外的组件
     * 进行添加操作引发Group重复添加实体。
     * @param args 
     * @example
     * ecs.allOf(AComponent, BComponent, CComponent);
     */
    export function allOf(...args: CompType<IComp>[]) {
        return new ECSMatcher().allOf(...args);
    }

    /**
     * 组件间是或的关系，表示关注拥有任意一个这些组件的实体
     * @param args  组件类
     * @example
     * ecs.anyOf(AComponent, BComponent);
     */
    export function anyOf(...args: CompType<IComp>[]) {
        return new ECSMatcher().anyOf(...args);
    }

    /**
     * 表示关注只拥有这些组件的实体
     * 注：不是特殊情况不建议使用onlyOf。因为onlyOf会监听所有组件的添加和删除事件
     * @param args  组件类
     * @example
     // 不包含CComponent或者DComponent
     ecs.allOf(AComponent, BComponent).excludeOf(CComponent, DComponent);

     // 不同时包含CComponent和DComponent
     ecs.allOf(AComponent, BComponent).excludeOf(CComponent).excludeOf(DComponent);
     */
    export function onlyOf(...args: CompType<IComp>[]) {
        return new ECSMatcher().onlyOf(...args);
    }

    /**
     * 不包含指定的任意一个组件
     * @param args  组件类
     * @example
     // 表示不包含组件A或者组件B
     ecs.excludeOf(A, B); 
     */
    export function excludeOf(...args: CompType<IComp>[]) {
        return new ECSMatcher().excludeOf(...args);
    }
    //#endregion

    //#region 单例组件
    /**
     * 获取单例组件
     * @param ctor 组件类
     */
    export function getSingleton<T extends IComp>(ctor: CompCtor<T>) {
        if (!ECSModel.tid2comp.has(ctor.tid)) {
            let comp = createEntityWithComp(ctor) as T;
            ECSModel.tid2comp.set(ctor.tid, comp);
        }
        return ECSModel.tid2comp.get(ctor.tid) as T;
    }

    /**
     * 注册单例组件 - 主要用于那些不能手动创建对象的组件
     * @param obj 
     */
    export function addSingleton(obj: IComp) {
        let tid = (obj.constructor as CompCtor<IComp>).tid;
        if (!ECSModel.tid2comp.has(tid)) {
            ECSModel.tid2comp.set(tid, obj);
        }
    }

    //#endregion
}