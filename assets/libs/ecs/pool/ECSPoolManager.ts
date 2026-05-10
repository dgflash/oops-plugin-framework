/**
 * 池管理器
 */

import { ECSDynamicPool } from './ECSDynamicPool';
import type { IECSPoolMetrics } from './IECSPoolMetrics';
import type { ECSEntity } from '../ECSEntity';
import type { ecs } from '../ECS';
import { ECSModel, type CompCtor, type EntityCtor } from '../ECSModel';

/** 池对象类型 - 实体或组件 */
type ECSPoolObject = ECSEntity | ecs.IComp;

/** 池类型名称 - 实体名或组件名 */
type ECSPoolTypeName = string;

/**
 * 池管理器 - 统一管理所有对象池
 */
export class ECSPoolManager {
    /** 所有对象池的映射 */
    private pools: Map<ECSPoolTypeName, ECSDynamicPool<ECSPoolObject>> = new Map();

    /**
     * 从构造函数获取池类型名称
     * @param ctor 实体或组件的构造函数
     * @returns 池类型名称
     */
    private getTypeNameFromCtor<T extends ECSEntity>(ctor: EntityCtor<T>): string {
        // 检查是否是组件构造函数（有 compName 属性）
        const ctorAny = ctor as unknown as { compName?: string };
        if (typeof ctorAny.compName === 'string') {
            return ctorAny.compName;
        }

        // 检查是否是实体构造函数（从 ECSModel.entityCtors 查找）
        const entityName = ECSModel.entityCtors.get(ctor as EntityCtor<ECSEntity>);
        if (entityName) {
            return entityName;
        }

        // 如果都找不到，使用构造函数名
        return ctor.name;
    }

    /**
     * 获取或创建池
     * @param typeName 池类型名称（实体名如 "Account"、"RedDot"，或组件名如 "M_Equip_Model"）
     * @param factory 对象工厂函数
     * @returns 动态对象池实例
     */
    getPool<T extends ECSPoolObject>(typeName: ECSPoolTypeName, factory: () => T): ECSDynamicPool<T> {
        if (!this.pools.has(typeName)) {
            const pool = new ECSDynamicPool<ECSPoolObject>(typeName, factory);
            this.pools.set(typeName, pool);
        }

        return this.pools.get(typeName)! as ECSDynamicPool<T>;
    }

    /**
     * 删除指定池（清空对象并从管理中移除）
     * @param typeNameOrCtor 池类型名称（实体名或组件名）或构造函数
     * @returns 是否成功删除
     */
    removePool(typeNameOrCtor: ECSPoolTypeName | EntityCtor<ECSEntity> | CompCtor<ecs.IComp>): boolean {
        let typeName: string;

        if (typeof typeNameOrCtor === 'string') {
            typeName = typeNameOrCtor;
        }
        else {
            typeName = this.getTypeNameFromCtor(typeNameOrCtor as EntityCtor<ECSEntity>);
        }

        const pool = this.pools.get(typeName);
        if (pool) {
            pool.clear();
            this.pools.delete(typeName);
            return true;
        }
        return false;
    }

    /**
     * 清空所有池
     */
    clearAll(): void {
        this.pools.forEach(pool => pool.clear());
        this.pools.clear();
    }

    /**
     * 获取所有池的统计信息
     * @returns 类型名称到统计指标的映射
     */
    getAllMetrics(): Map<ECSPoolTypeName, IECSPoolMetrics> {
        const result = new Map<ECSPoolTypeName, IECSPoolMetrics>();
        this.pools.forEach((pool, typeName) => {
            result.set(typeName, pool.getMetrics());
        });
        return result;
    }

    /**
     * 获取指定类型的池
     * @param typeName 池类型名称（实体名或组件名）
     * @returns 池实例，如果不存在则返回undefined
     */
    getPoolByName<T extends ECSPoolObject>(typeName: ECSPoolTypeName): ECSDynamicPool<T> | undefined {
        return this.pools.get(typeName) as ECSDynamicPool<T> | undefined;
    }

    /**
     * 获取所有池的名称
     * @returns 池名称数组（实体名或组件名数组）
     */
    getPoolNames(): ECSPoolTypeName[] {
        return Array.from(this.pools.keys());
    }

    /**
     * 清空指定池中的对象
     * @param typeName 池类型名称（实体名或组件名）
     */
    clearPool(typeName: ECSPoolTypeName): void {
        const pool = this.pools.get(typeName);
        if (pool) {
            pool.clear();
        }
    }

    /**
     * 获取指定池的统计信息
     * @param typeName 池类型名称（实体名或组件名）
     * @returns 统计指标对象，如果池不存在则返回undefined
     */
    getPoolMetrics(typeName: ECSPoolTypeName): IECSPoolMetrics | undefined {
        const pool = this.pools.get(typeName);
        return pool ? pool.getMetrics() : undefined;
    }
}
