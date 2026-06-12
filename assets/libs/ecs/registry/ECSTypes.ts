/**
 * ECS 公共类型定义
 *
 * 这些是框架内多处共享的纯类型声明（实体/组件构造器、组件接口、匹配器与系统生命周期接口等），
 * 不含任何运行期数据或逻辑。定义放在这里而非 ECS 门面，使底层模块直接引用、不反向依赖顶层门面。
 * ECS.ts 仅对其做别名再导出（ecs.IComp / ecs.IMatcher / ecs.ISystemUpdate ...）。
 */

import type { ECSEntity } from '../entity/ECSEntity';

/** 组件接口 - 一堆数据的集合，挂载在实体上 */
export interface IComp {
    /** 组件实例是否可回收至全局对象池 */
    canRecycle: boolean;
    /** 拥有该组件的实体引用 */
    ent: ECSEntity;
    /** 组件类型编号（与注册时分配的 tid 一致） */
    tid: number;
    /** 组件被回收或移除时重置数据 */
    reset(): void;
}

/** 实体匹配器接口 */
export interface IMatcher {
    /** 匹配器唯一编号 */
    mid: number;
    /** 匹配器关注的组件类型 id 列表 */
    indices: number[];
    /** 匹配器缓存键（由组件组合生成） */
    key: string;
    /**
     * 判断实体是否满足本匹配器规则
     * @param entity 待检测实体
     */
    isMatch(entity: ECSEntity): boolean;
}

/**
 * 监听组件首次添加到实体上时，在 ComblockSystem 上实现这个接口。
 * 1. entityEnter 会在 update 方法之前执行，实体进入后不会再次进入 entityEnter。
 * 2. 当实体从当前 System 移除，下次再次符合条件进入 System 也会执行上述流程。
 */
export interface IEntityEnterSystem<E extends ECSEntity = ECSEntity> {
    /**
     * 实体首次进入本系统分组时回调（在 update 之前执行）
     * @param entity 进入分组的实体
     */
    entityEnter(entity: E): void;
}

/** 监听组件从实体上移除时，在 ComblockSystem 上实现这个接口 */
export interface IEntityRemoveSystem<E extends ECSEntity = ECSEntity> {
    /**
     * 实体从本系统分组移除时回调（在 update 之前执行）
     * @param entity 离开分组的实体
     */
    entityRemove(entity: E): void;
}

/** 监听系统第一次执行 update 处理实体时，在 ComblockSystem 上实现这个接口 */
export interface ISystemFirstUpdate<E extends ECSEntity = ECSEntity> {
    /**
     * 系统生命周期内对实体的首次更新（仅执行一次）
     * @param entity 待处理的实体
     */
    firstUpdate(entity: E): void;
}

/** 监听系统执行 update 处理实体时，在 ComblockSystem 上实现这个接口 */
export interface ISystemUpdate<E extends ECSEntity = ECSEntity> {
    /**
     * 每帧对匹配实体执行的业务逻辑
     * @param entity 待更新的实体
     */
    update(entity: E): void;
}

/** 组件类型：可用组件构造函数或其数值 tid 表示 */
export type CompType<T> = CompCtor<T> | number;

/** 实体构造器接口 */
export interface EntityCtor<T> {
    /** 构造实体实例 */
    new(): T;
}

/** 组件构造器接口 */
export interface CompCtor<T> {
    new(): T;
    /** 组件编号 */
    tid: number;
    /** 组件名 */
    compName: string;
}
