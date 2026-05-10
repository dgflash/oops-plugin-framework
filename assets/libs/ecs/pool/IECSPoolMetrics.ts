/**
 * 池统计指标
 */

/** 池统计指标 */
export interface IECSPoolMetrics {
    /** 创建次数 */
    createCount: number;
    /** 回收次数 */
    recycleCount: number;
    /** 命中次数（从池中获取） */
    hitCount: number;
    /** 未命中次数（需要新建） */
    missCount: number;
    /** 当前池大小 */
    currentSize: number;
}
