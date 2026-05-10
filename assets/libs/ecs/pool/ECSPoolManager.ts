/**
 * 池管理器
 */

import { ECSDynamicPool } from './ECSDynamicPool';
import type { IECSPoolMetrics } from './IECSPoolMetrics';

/**
 * 池管理器 - 统一管理所有对象池
 */
export class ECSPoolManager {
    /** 所有对象池的映射 */
    private pools: Map<string, ECSDynamicPool<unknown>> = new Map();

    /**
     * 获取或创建池
     * @param typeName 池类型名称
     * @param factory 对象工厂函数
     * @returns 动态对象池实例
     */
    getPool<T>(typeName: string, factory: () => T): ECSDynamicPool<T> {
        if (!this.pools.has(typeName)) {
            const pool = new ECSDynamicPool<unknown>(typeName, factory);
            this.pools.set(typeName, pool);
        }

        return this.pools.get(typeName)! as ECSDynamicPool<T>;
    }

    /**
     * 清空所有池
     */
    clearAll(): void {
        this.pools.forEach(pool => pool.clear());
        this.pools.clear();
    }

    /**
     * 场景切换时预热池
     * @param sceneType 场景类型标识
     * @param hints 类型名称到预热数量的映射
     */
    onSceneChange(sceneType: string, hints: Map<string, number>): void {
        hints.forEach((count, typeName) => {
            const pool = this.pools.get(typeName);
            if (pool) {
                pool.preWarm(count);
            }
        });
    }

    /**
     * 获取所有池的统计信息
     * @returns 类型名称到统计指标的映射
     */
    getAllMetrics(): Map<string, IECSPoolMetrics> {
        const result = new Map<string, IECSPoolMetrics>();
        this.pools.forEach((pool, typeName) => {
            result.set(typeName, pool.getMetrics());
        });
        return result;
    }

    /**
     * 手动缩减所有池到指定百分比
     * @param percent 目标百分比（0-1之间）
     * @returns 总共移除的对象数量
     */
    shrinkAllTo(percent: number): number {
        let totalRemoved = 0;
        this.pools.forEach(pool => {
            const metrics = pool.getMetrics();
            const targetSize = Math.floor(metrics.currentSize * percent);
            totalRemoved += pool.shrinkTo(targetSize);
        });
        return totalRemoved;
    }

    /**
     * 获取指定类型的池
     * @param typeName 池类型名称
     * @returns 池实例，如果不存在则返回undefined
     */
    getPoolByName<T>(typeName: string): ECSDynamicPool<T> | undefined {
        return this.pools.get(typeName) as ECSDynamicPool<T> | undefined;
    }

    /**
     * 获取所有池的名称
     * @returns 池名称数组
     */
    getPoolNames(): string[] {
        return Array.from(this.pools.keys());
    }

    /**
     * 清空指定池中的对象
     * @param typeName 池类型名称
     */
    clearPool(typeName: string): void {
        const pool = this.pools.get(typeName);
        if (pool) {
            pool.clear();
        }
    }

    /**
     * 手动缩减指定池到目标大小
     * @param typeName 池类型名称
     * @param targetSize 目标池大小
     * @returns 移除的对象数量
     */
    shrinkPool(typeName: string, targetSize: number): number {
        const pool = this.pools.get(typeName);
        return pool ? pool.shrinkTo(targetSize) : 0;
    }

    /**
     * 获取指定池的统计信息
     * @param typeName 池类型名称
     * @returns 统计指标对象，如果池不存在则返回undefined
     */
    getPoolMetrics(typeName: string): IECSPoolMetrics | undefined {
        const pool = this.pools.get(typeName);
        return pool ? pool.getMetrics() : undefined;
    }
}
