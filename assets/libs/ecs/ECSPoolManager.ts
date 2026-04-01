/*
 * 对象池管理系统
 */

//#region 类型定义

/** 池统计指标 */
interface PoolMetrics {
    createCount: number;        // 创建次数
    recycleCount: number;       // 回收次数
    hitCount: number;           // 命中次数（从池中获取）
    missCount: number;          // 未命中次数（需要新建）
    currentSize: number;        // 当前池大小
}

//#endregion

//#region 动态对象池

/**
 * 动态对象池
 */
class DynamicPool<T> {
    private pool: T[] = [];
    private metrics: PoolMetrics;

    /**
     * 构造函数
     * @param typeName 池类型名称
     * @param factory 对象工厂函数
     */
    constructor(
        private typeName: string,
        private factory: () => T
    ) {
        this.metrics = {
            createCount: 0,
            recycleCount: 0,
            hitCount: 0,
            missCount: 0,
            currentSize: 0
        };
    }

    /**
     * 从池中获取对象
     * @returns 池中的对象或新创建的对象
     */
    get(): T {
        if (this.pool.length > 0) {
            this.metrics.hitCount++;
            const item = this.pool.pop()!;
            this.metrics.currentSize = this.pool.length;
            return item;
        }

        this.metrics.missCount++;
        this.metrics.createCount++;

        return this.factory();
    }

    /**
     * 回收对象到池中
     * @param item 要回收的对象
     */
    recycle(item: T): void {
        this.pool.push(item);
        this.metrics.currentSize = this.pool.length;
    }

    /**
     * 预热池，提前创建指定数量的对象
     * @param count 要预热的对象数量
     */
    preWarm(count: number): void {
        while (this.pool.length < count) {
            this.pool.push(this.factory());
            this.metrics.createCount++;
        }
        this.metrics.currentSize = this.pool.length;
    }

    /**
     * 获取池的统计信息
     * @returns 只读的统计指标对象
     */
    getMetrics(): Readonly<PoolMetrics> {
        return { ...this.metrics };
    }

    /**
     * 清空池中的所有对象
     */
    clear(): void {
        this.pool.length = 0;
        this.metrics.currentSize = 0;
    }

    /**
     * 手动缩减池大小到指定容量
     * @param targetSize 目标池大小
     * @returns 移除的对象数量
     */
    shrinkTo(targetSize: number): number {
        let removed = 0;

        while (this.pool.length > targetSize) {
            this.pool.pop();
            removed++;
        }

        if (removed > 0) {
            this.metrics.currentSize = this.pool.length;
        }

        return removed;
    }
}

//#endregion

//#region 池管理器

/**
 * 池管理器
 */
class PoolManager {
    private pools: Map<string, DynamicPool<any>> = new Map();

    /**
     * 获取或创建池
     * @param typeName 池类型名称
     * @param factory 对象工厂函数
     * @returns 动态对象池实例
     */
    getPool<T>(typeName: string, factory: () => T): DynamicPool<T> {
        if (!this.pools.has(typeName)) {
            const pool = new DynamicPool(typeName, factory);
            this.pools.set(typeName, pool);
        }

        return this.pools.get(typeName)!;
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
    getAllMetrics(): Map<string, PoolMetrics> {
        const result = new Map<string, PoolMetrics>();
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
    getPoolByName(typeName: string): DynamicPool<any> | undefined {
        return this.pools.get(typeName);
    }
}

//#endregion

//#region 全局协调器

/**
 * 全局池协调器 - 提供手动管理API
 */
class GlobalPoolCoordinator {
    private poolManager: PoolManager;

    constructor() {
        this.poolManager = new PoolManager();
    }

    /**
     * 获取或创建池
     * @param typeName 池类型名称
     * @param factory 对象工厂函数
     * @returns 动态对象池实例
     */
    getPool<T>(typeName: string, factory: () => T): DynamicPool<T> {
        return this.poolManager.getPool(typeName, factory);
    }

    /**
     * 获取池管理器实例
     * @returns 池管理器
     */
    getPoolManager(): PoolManager {
        return this.poolManager;
    }

    /**
     * 场景切换时预热池
     * @param sceneType 场景类型标识
     * @param hints 类型名称到预热数量的映射
     */
    onSceneChange(sceneType: string, hints: Map<string, number>): void {
        this.poolManager.onSceneChange(sceneType, hints);
    }

    /**
     * 手动缩减所有池到指定百分比
     * @param percent 目标百分比（0-1之间）
     * @returns 总共移除的对象数量
     */
    shrinkAll(percent: number): number {
        return this.poolManager.shrinkAllTo(percent);
    }

    /**
     * 清空所有池中的对象
     */
    clearAll(): void {
        this.poolManager.clearAll();
    }

    /**
     * 清空指定池中的对象
     * @param typeName 池类型名称
     */
    clearPool(typeName: string): void {
        const pool = this.poolManager.getPoolByName(typeName);
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
        const pool = this.poolManager.getPoolByName(typeName);
        return pool ? pool.shrinkTo(targetSize) : 0;
    }

    /**
     * 获取所有池的统计信息
     * @returns 类型名称到统计指标的映射
     */
    getAllMetrics(): Map<string, PoolMetrics> {
        return this.poolManager.getAllMetrics();
    }

    /**
     * 获取指定池的统计信息
     * @param typeName 池类型名称
     * @returns 统计指标对象，如果池不存在则返回undefined
     */
    getPoolMetrics(typeName: string): PoolMetrics | undefined {
        const pool = this.poolManager.getPoolByName(typeName);
        return pool ? pool.getMetrics() : undefined;
    }
}

//#endregion

/**
 * 全局池协调器实例
 * 
 * 用于管理 ECS 框架中的对象池，主要包括：
 * 1. ECS 实体对象 (ECSEntity) - 实体销毁后回收复用
 * 2. ECS 组件对象 (IComp) - 组件移除后回收复用
 * 3. 其他自定义对象 - 支持任意类型的对象池化
 * 
 * 核心功能：
 * - 对象复用：减少频繁创建销毁带来的性能开销
 * - 统计监控：跟踪命中率、创建次数等指标
 * - 池管理：支持预热、缩减、清空等操作
 * - 场景优化：场景切换时自动预热相关对象池
 */
export const ecsPoolCoordinator = new GlobalPoolCoordinator();