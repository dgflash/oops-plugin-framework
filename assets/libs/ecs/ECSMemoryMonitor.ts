/*
 * ECS内存池监控工具
 * 用于实时监控和诊断对象池的使用情况
 */

import { globalPoolCoordinator } from './ECSPoolManager';

/** 内存监控统计 */
export interface MemoryStats {
    poolName: string;
    currentSize: number;
    maxSize: number;
    minSize: number;
    hitRate: number;
    createCount: number;
    recycleCount: number;
    createFrequency: number;
    accessFrequency: number;
    estimatedMemory: string;
    memoryBytes: number;
    hasIssue: boolean;
    issueType?: 'low-hit-rate' | 'memory-leak' | 'over-capacity' | 'unused';
}

/** 监控配置 */
export interface MonitorConfig {
    /** 详细程度：compact(简洁) | normal(普通) | detailed(详细) */
    level?: 'compact' | 'normal' | 'detailed';
    /** 是否显示异常池 */
    showIssues?: boolean;
    /** 是否显示内存信息 */
    showMemory?: boolean;
    /** 是否按某个字段排序 */
    sortBy?: 'frequency' | 'hitRate' | 'memory' | 'name';
}

/** 异常检测阈值 */
interface IssueThresholds {
    lowHitRate: number;      // 低命中率阈值（默认50%）
    highCapacity: number;    // 高容量使用率阈值（默认90%）
    unusedTime: number;      // 未使用时间阈值（默认60秒）
    memoryLeakGrowth: number; // 内存泄漏增长率阈值（默认200%）
}

/**
 * ECS内存监控器
 */
export class ECSMemoryMonitor {
    private static instance: ECSMemoryMonitor;
    private updateInterval: number = 1000; // 1秒更新一次
    private isMonitoring = false;
    private timerId: any = null;
    private lastStats: Map<string, MemoryStats> = new Map();

    private thresholds: IssueThresholds = {
        lowHitRate: 50,
        highCapacity: 90,
        unusedTime: 60000,
        memoryLeakGrowth: 200
    };

    private constructor() { }

    static getInstance(): ECSMemoryMonitor {
        if (!ECSMemoryMonitor.instance) {
            ECSMemoryMonitor.instance = new ECSMemoryMonitor();
        }
        return ECSMemoryMonitor.instance;
    }

    /** 设置异常检测阈值 */
    setThresholds(thresholds: Partial<IssueThresholds>): void {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }

    /** 获取所有池的统计信息 */
    getStats(): MemoryStats[] {
        const smartManager = globalPoolCoordinator.getSmartManager();
        const allMetrics = smartManager.getAllMetrics();
        const stats: MemoryStats[] = [];
        const now = Date.now();

        allMetrics.forEach((metrics, poolName) => {
            const totalAccess = metrics.hitCount + metrics.missCount;
            const hitRate = totalAccess > 0 ? (metrics.hitCount / totalAccess) * 100 : 0;

            // 计算创建频率
            let createFrequency = 0;
            if (metrics.createTimes.length >= 2) {
                const timeSpan = metrics.createTimes[metrics.createTimes.length - 1] -
                    metrics.createTimes[0];
                if (timeSpan > 0) {
                    createFrequency = (metrics.createTimes.length / timeSpan) * 1000;
                }
            }

            // 计算访问频率
            let accessFrequency = 0;
            if (metrics.accessTimes && metrics.accessTimes.length >= 2) {
                const timeSpan = metrics.accessTimes[metrics.accessTimes.length - 1] -
                    metrics.accessTimes[0];
                if (timeSpan > 0) {
                    accessFrequency = (metrics.accessTimes.length / timeSpan) * 1000;
                }
            }

            // 检测异常
            const issue = this.detectIssue(poolName, metrics, hitRate, now);

            const stat: MemoryStats = {
                poolName,
                currentSize: metrics.currentSize,
                maxSize: metrics.maxSize,
                minSize: metrics.minSize,
                hitRate,
                createCount: metrics.createCount,
                recycleCount: metrics.recycleCount,
                createFrequency,
                accessFrequency,
                estimatedMemory: this.formatBytes(metrics.totalMemory),
                memoryBytes: metrics.totalMemory,
                hasIssue: issue !== null,
                issueType: issue || undefined
            };

            stats.push(stat);
            this.lastStats.set(poolName, stat);
        });

        return stats;
    }

    /** 检测池的异常情况 */
    private detectIssue(poolName: string, metrics: any, hitRate: number, now: number):
        'low-hit-rate' | 'memory-leak' | 'over-capacity' | 'unused' | null {

        // 检测低命中率
        if (metrics.hitCount + metrics.missCount > 20 && hitRate < this.thresholds.lowHitRate) {
            return 'low-hit-rate';
        }

        // 检测容量过高
        const capacityUsage = metrics.maxSize > 0 ? (metrics.currentSize / metrics.maxSize) * 100 : 0;
        if (capacityUsage > this.thresholds.highCapacity) {
            return 'over-capacity';
        }

        // 检测长期未使用
        if (now - metrics.lastAccessTime > this.thresholds.unusedTime) {
            return 'unused';
        }

        // 检测内存泄漏（与上次对比）
        const lastStat = this.lastStats.get(poolName);
        if (lastStat && lastStat.memoryBytes > 0) {
            const growthRate = (metrics.totalMemory / lastStat.memoryBytes) * 100;
            if (growthRate > this.thresholds.memoryLeakGrowth && metrics.totalMemory > 1024 * 1024) {
                return 'memory-leak';
            }
        }

        return null;
    }

    /** 格式化字节数 */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /** 
     * 统一的日志输出方法
     * @param config 监控配置
     */
    log(config: MonitorConfig = {}): void {
        const {
            level = 'normal',
            showIssues = true,
            showMemory = true,
            sortBy = 'frequency'
        } = config;

        const stats = this.getStats();

        if (stats.length === 0) {
            console.log('[ECS Pool] 暂无对象池数据');
            return;
        }

        // 排序
        this.sortStats(stats, sortBy);

        // 根据详细程度输出
        switch (level) {
            case 'compact':
                this.logCompact(stats, showMemory);
                break;
            case 'detailed':
                this.logDetailed(stats, showIssues, showMemory);
                break;
            default:
                this.logNormal(stats, showIssues, showMemory);
        }
    }

    /** 简洁输出 */
    private logCompact(stats: MemoryStats[], showMemory: boolean): void {
        const totalCurrent = stats.reduce((sum, s) => sum + s.currentSize, 0);
        const avgHitRate = stats.reduce((sum, s) => sum + s.hitRate, 0) / stats.length;
        const totalMemory = stats.reduce((sum, s) => sum + s.memoryBytes, 0);
        const issueCount = stats.filter(s => s.hasIssue).length;

        let output = `[ECS Pool] 池数:${stats.length} | 缓存:${totalCurrent} | 命中率:${avgHitRate.toFixed(1)}%`;
        if (showMemory) {
            output += ` | 内存:${this.formatBytes(totalMemory)}`;
        }
        if (issueCount > 0) {
            output += ` | ⚠️异常:${issueCount}`;
        }
        console.log(output);
    }

    /** 普通输出 */
    private logNormal(stats: MemoryStats[], showIssues: boolean, showMemory: boolean): void {
        console.log('\n========== ECS 对象池统计 ==========');
        console.log(`总池数量: ${stats.length}`);

        if (showMemory) {
            const totalMemory = stats.reduce((sum, s) => sum + s.memoryBytes, 0);
            const memoryUsage = globalPoolCoordinator.getMemoryUsage();
            console.log(`总内存: ${this.formatBytes(totalMemory)} / ${this.formatBytes(memoryUsage.budget)} (${memoryUsage.percent.toFixed(1)}%)`);
        }

        if (showIssues) {
            const issueStats = stats.filter(s => s.hasIssue);
            if (issueStats.length > 0) {
                console.log(`⚠️ 异常池: ${issueStats.length}`);
            }
        }
        console.log('');

        stats.forEach(stat => {
            const icon = this.getStatusIcon(stat);
            console.log(`${icon} 【${stat.poolName}】`);
            console.log(`  容量: ${stat.currentSize}/${stat.maxSize} (最小:${stat.minSize})`);
            console.log(`  命中率: ${stat.hitRate.toFixed(1)}% ${this.getHitRateDesc(stat.hitRate)}`);
            console.log(`  创建/回收: ${stat.createCount}/${stat.recycleCount}`);
            console.log(`  频率: 创建${stat.createFrequency.toFixed(2)}/s, 访问${stat.accessFrequency.toFixed(2)}/s`);

            if (showMemory) {
                console.log(`  内存: ${stat.estimatedMemory}`);
            }

            if (showIssues && stat.hasIssue) {
                console.log(`  ⚠️ 异常: ${this.getIssueDesc(stat.issueType!)}`);
            }
            console.log('');
        });

        console.log('====================================\n');
    }

    /** 详细输出 */
    private logDetailed(stats: MemoryStats[], showIssues: boolean, showMemory: boolean): void {
        console.log('ECS 对象池详细统计报告');

        // 总览
        const totalCreate = stats.reduce((sum, s) => sum + s.createCount, 0);
        const totalRecycle = stats.reduce((sum, s) => sum + s.recycleCount, 0);
        const totalCurrent = stats.reduce((sum, s) => sum + s.currentSize, 0);
        const avgHitRate = stats.reduce((sum, s) => sum + s.hitRate, 0) / stats.length;
        const totalMemory = stats.reduce((sum, s) => sum + s.memoryBytes, 0);

        console.log('📊 总体概况');
        console.log('─────────────────────────────────────────────────────────');
        console.log(`  对象池数量: ${stats.length}`);
        console.log(`  总创建次数: ${totalCreate}`);
        console.log(`  总回收次数: ${totalRecycle}`);
        console.log(`  当前缓存数: ${totalCurrent}`);
        console.log(`  平均命中率: ${avgHitRate.toFixed(1)}%`);

        if (showMemory) {
            const memoryUsage = globalPoolCoordinator.getMemoryUsage();
            console.log(`  总内存占用: ${this.formatBytes(totalMemory)}`);
            console.log(`  内存预算: ${this.formatBytes(memoryUsage.budget)}`);
            console.log(`  内存使用率: ${memoryUsage.percent.toFixed(1)}%`);
        }
        console.log('');

        // 异常池
        if (showIssues) {
            const issueStats = stats.filter(s => s.hasIssue);
            if (issueStats.length > 0) {
                console.log('⚠️ 异常池列表');
                console.log('─────────────────────────────────────────────────────────');
                issueStats.forEach(stat => {
                    console.log(`  ${stat.poolName}: ${this.getIssueDesc(stat.issueType!)}`);
                });
                console.log('');
            }
        }

        console.log('📈 各池详细数据');
        console.log('─────────────────────────────────────────────────────────\n');

        stats.forEach((stat, index) => {
            const usage = stat.maxSize > 0 ? (stat.currentSize / stat.maxSize * 100).toFixed(1) : '0';
            const icon = this.getStatusIcon(stat);

            console.log(`${index + 1}. ${stat.poolName} ${icon}`);
            console.log(`   ├─ 容量: ${stat.currentSize}/${stat.maxSize} (${usage}% 使用率)`);
            console.log(`   ├─ 命中率: ${stat.hitRate.toFixed(1)}% ${this.getHitRateDesc(stat.hitRate)}`);
            console.log(`   ├─ 创建/回收: ${stat.createCount} / ${stat.recycleCount}`);
            console.log(`   ├─ 创建频率: ${stat.createFrequency.toFixed(2)} 个/秒`);
            console.log(`   ├─ 访问频率: ${stat.accessFrequency.toFixed(2)} 个/秒`);

            if (showMemory) {
                console.log(`   ├─ 估算内存: ${stat.estimatedMemory}`);
            }

            if (showIssues && stat.hasIssue) {
                console.log(`   └─ ⚠️ 异常: ${this.getIssueDesc(stat.issueType!)}`);
            } else {
                console.log(`   └─ 状态: 正常`);
            }
            console.log('');
        });

        console.log('═════════════════════════════════════════════════════════\n');
    }

    /** 排序统计数据 */
    private sortStats(stats: MemoryStats[], sortBy: string): void {
        switch (sortBy) {
            case 'frequency':
                stats.sort((a, b) => b.createFrequency - a.createFrequency);
                break;
            case 'hitRate':
                stats.sort((a, b) => b.hitRate - a.hitRate);
                break;
            case 'memory':
                stats.sort((a, b) => b.memoryBytes - a.memoryBytes);
                break;
            case 'name':
                stats.sort((a, b) => a.poolName.localeCompare(b.poolName));
                break;
        }
    }

    /** 获取状态图标 */
    private getStatusIcon(stat: MemoryStats): string {
        if (stat.hasIssue) {
            switch (stat.issueType) {
                case 'low-hit-rate': return '🔴';
                case 'memory-leak': return '💥';
                case 'over-capacity': return '⚠️';
                case 'unused': return '💤';
            }
        }
        return stat.hitRate >= 80 ? '🟢' : stat.hitRate >= 50 ? '🟡' : '🔴';
    }

    /** 获取异常描述 */
    private getIssueDesc(issueType: string): string {
        switch (issueType) {
            case 'low-hit-rate': return '命中率过低';
            case 'memory-leak': return '疑似内存泄漏';
            case 'over-capacity': return '容量使用率过高';
            case 'unused': return '长期未使用';
            default: return '未知异常';
        }
    }

    /** 打印指定池的统计 */
    logPool(poolName: string): void {
        const stats = this.getStats();
        const stat = stats.find(s => s.poolName === poolName);

        if (!stat) {
            console.log(`[ECS Pool] 未找到池: ${poolName}`);
            return;
        }

        const usage = stat.maxSize > 0 ? (stat.currentSize / stat.maxSize * 100).toFixed(1) : '0';
        const icon = this.getStatusIcon(stat);

        console.log(`\n【${stat.poolName}】${icon}`);
        console.log(`  容量使用: ${stat.currentSize}/${stat.maxSize} (${usage}%)`);
        console.log(`  命中率: ${stat.hitRate.toFixed(1)}% ${this.getHitRateDesc(stat.hitRate)}`);
        console.log(`  创建次数: ${stat.createCount}`);
        console.log(`  回收次数: ${stat.recycleCount}`);
        console.log(`  创建频率: ${stat.createFrequency.toFixed(2)} 个/秒`);
        console.log(`  访问频率: ${stat.accessFrequency.toFixed(2)} 个/秒`);
        console.log(`  估算内存: ${stat.estimatedMemory}`);

        if (stat.hasIssue) {
            console.log(`  ⚠️ 异常: ${this.getIssueDesc(stat.issueType!)}`);
        }
        console.log('');
    }

    /** 获取命中率描述 */
    private getHitRateDesc(hitRate: number): string {
        if (hitRate >= 90) return '(优秀)';
        if (hitRate >= 70) return '(良好)';
        if (hitRate >= 50) return '(一般)';
        return '(较差)';
    }

    /** 开始监控（定时打印） */
    startMonitoring(config: MonitorConfig & { interval?: number } = {}): void {
        if (this.isMonitoring) {
            console.warn('[Monitor] 监控已在运行中');
            return;
        }

        const { interval = 5000, ...monitorConfig } = config;
        this.updateInterval = interval;
        this.isMonitoring = true;

        console.log(`[Monitor] 开始监控，更新间隔: ${interval}ms`);

        this.timerId = setInterval(() => {
            this.log(monitorConfig);
        }, interval);
    }

    /** 停止监控 */
    stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        this.isMonitoring = false;
        console.log('[Monitor] 监控已停止');
    }

    /** 获取异常池列表 */
    getIssues(): MemoryStats[] {
        return this.getStats().filter(s => s.hasIssue);
    }

    /** 获取类型分析报告 */
    getTypeProfiles() {
        return globalPoolCoordinator.getSmartManager().getTypeProfiles();
    }

    /** 触发内存清理 */
    cleanup(maxAge: number = 60000): number {
        return globalPoolCoordinator.getSmartManager().cleanupAllStale(maxAge);
    }
}

/** 导出单例 */
export const ecsMonitor = ECSMemoryMonitor.getInstance();

