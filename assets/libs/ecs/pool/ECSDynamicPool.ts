/**
 * 动态对象池
 */

import { IECSPoolMetrics } from './IECSPoolMetrics';

/**
 * 动态对象池
 * @template T 池中对象的类型
 */
export class ECSDynamicPool<T> {
    private pool: T[] = [];
    private metrics: IECSPoolMetrics;

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
        this.metrics.recycleCount++;
        this.metrics.currentSize = this.pool.length;
    }

    /**
     * 获取池的统计信息
     * @returns 只读的统计指标对象
     */
    getMetrics(): Readonly<IECSPoolMetrics> {
        return { ...this.metrics };
    }

    /**
     * 清空池中的所有对象
     */
    clear(): void {
        this.pool.length = 0;
        this.metrics.currentSize = 0;
    }
}
