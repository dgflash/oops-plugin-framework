/*
 * @Author: dgflash
 * @Date: 2022-05-12 14:18:44
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-05 16:37:10
 */
import { ecs } from "./ECS";
import { ECSEntity } from "./ECSEntity";
import { ECSGroup } from "./ECSGroup";

type CompAddOrRemove = (entity: ecs.Entity) => void;

/** 组件类型 */
export type CompType<T> = CompCtor<T> | number;

/** 实体构造器接口 */
export interface EntityCtor<T> {
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

/** ECS框架内部数据 */
export class ECSModel {
    /** 实体自增id */
    static eid = 1;
    /** 实体造函数 */
    static entityCtors: Map<EntityCtor<any>, string> = new Map();
    /** 实体对象缓存池 */
    static entityPool: Map<string, ECSEntity[]> = new Map();
    /** 通过实体id查找实体对象 */
    static eid2Entity: Map<number, ECSEntity> = new Map();

    /** 组件类型id */
    static compTid = 0;
    /** 组件缓存池 */
    static compPools: Map<number, ecs.IComp[]> = new Map();
    /** 组件构造函数 */
    static compCtors: (CompCtor<any> | number)[] = [];
    /**
     * 每个组件的添加和删除的动作都要派送到“关心”它们的group上。goup对当前拥有或者之前（删除前）拥有该组件的实体进行组件规则判断。判断该实体是否满足group
     * 所期望的组件组合。
     */
    static compAddOrRemove: Map<number, CompAddOrRemove[]> = new Map();

    /** 编号获取组件 */
    static tid2comp: Map<number, ecs.IComp> = new Map();

    /**
     * 缓存的group
     * 
     * key是组件的筛选规则，一个筛选规则对应一个group
     */
    static groups: Map<number, ECSGroup> = new Map();

    /**
     * 创建group，每个group只关心对应组件的添加和删除
     * @param matcher 实体筛选器
     */
    static createGroup<E extends ECSEntity = ECSEntity>(matcher: ecs.IMatcher): ECSGroup<E> {
        let group = ECSModel.groups.get(matcher.mid);
        if (!group) {
            group = new ECSGroup(matcher);
            ECSModel.groups.set(matcher.mid, group);
            let careComponentTypeIds = matcher.indices;
            for (let i = 0; i < careComponentTypeIds.length; i++) {
                ECSModel.compAddOrRemove.get(careComponentTypeIds[i])!.push(group.onComponentAddOrRemove.bind(group));
            }
        }
        return group as unknown as ECSGroup<E>;
    }
}