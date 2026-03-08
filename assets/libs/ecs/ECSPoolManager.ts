/*
 * 动态对象池管理系统
 * 三阶段实现：基础动态池 + 智能特性 + 可选配置
 */

//#region 类型定义

/** 池统计指标 */
interface PoolMetrics {
    // 使用统计
    createCount: number;      // 创建次数
    recycleCount: number;     // 回收次数
    hitCount: number;         // 命中次数（从池中获取）
    missCount: number;        // 未命中次数（需要新建）
    
    // 容量管理
    currentSize: number;      // 当前池大小
    maxSize: number;          // 最大容量
    minSize: number;          // 最小容量
    
    // 时间统计
    lastAccessTime: number;   // 最后访问时间
    lastAdjustTime: number;   // 最后调整时间
    createTimes: number[];    // 创建时间戳列表（用于计算频率）
    
    // 内存估算
    estimatedItemSize: number; // 单个对象估算大小（字节）
    totalMemory: number;       // 总内存占用
    
    // LRU支持
    accessTimes: number[];    // 访问时间戳（用于LRU）
}

/** 对象类型特征 */
interface TypeProfile {
    typeName: string;
    category: 'long-lived' | 'high-frequency' | 'normal' | 'rare';
    peakRate: number;         // 峰值创建速率（个/秒）
    reuseRate: number;        // 复用率
    avgMemorySize: number;    // 平均内存大小
    shouldPool: boolean;      // 是否应该池化
}

/** 池配置 */
export interface PoolConfig {
    enabled?: boolean;        // 是否启用池化
    minSize?: number;         // 最小容量
    maxSize?: number;         // 最大容量
    strategy?: 'dynamic' | 'fixed' | 'lru'; // 策略
    preWarmSize?: number;     // 预热数量
}

/** 池提示（性能优化） */
export interface PoolHint {
    expectedPeak?: number;    // 预期峰值
    sceneAware?: string;      // 场景感知标识
    highFrequency?: boolean;  // 是否高频对象
}

/** 历史数据 */
interface HistoryData {
    typeName: string;
    peakCount: number;
    avgCount: number;
    lastPlayTime: number;
}

//#endregion

//#region 第一阶段：基础动态池

/**
 * 动态对象池
 * 自动统计、自动调整容量、支持LRU策略
 */
class DynamicPool<T> {
    private pool: T[] = [];
    private metrics: PoolMetrics;
    private config: PoolConfig;
    private lruTimestamps: Map<T, number> = new Map(); // LRU时间戳
    
    constructor(
        private typeName: string,
        private factory: () => T,
        config: Partial<PoolConfig> = {}
    ) {
        this.config = {
            enabled: true,
            minSize: 10,
            maxSize: 1000,
            strategy: 'dynamic',
            preWarmSize: 0,
            ...config
        };
        
        this.metrics = {
            createCount: 0,
            recycleCount: 0,
            hitCount: 0,
            missCount: 0,
            currentSize: 0,
            maxSize: this.config.maxSize!,
            minSize: this.config.minSize!,
            lastAccessTime: Date.now(),
            lastAdjustTime: Date.now(),
            createTimes: [],
            estimatedItemSize: 0,
            totalMemory: 0,
            accessTimes: []
        };
        
        // 预热
        if (this.config.preWarmSize! > 0) {
            this.preWarm(this.config.preWarmSize!);
        }
        
        // 估算对象大小
        this.estimateItemSize();
    }
    
    /** 估算单个对象的内存大小 */
    private estimateItemSize(): void {
        if (this.metrics.estimatedItemSize > 0) return;
        
        try {
            const sample = this.factory();
            this.metrics.estimatedItemSize = this.calculateObjectSize(sample);
            this.updateTotalMemory();
        } catch (e) {
            console.warn(`[Pool] ${this.typeName} 无法估算对象大小`, e);
            this.metrics.estimatedItemSize = 1024; // 默认1KB
        }
    }
    
    /** 计算对象大小（粗略估算） */
    private calculateObjectSize(obj: any): number {
        let size = 0;
        const seen = new WeakSet();
        
        const calculate = (o: any): void => {
            if (o === null || o === undefined) return;
            if (typeof o !== 'object') {
                size += 8; // 基本类型约8字节
                return;
            }
            if (seen.has(o)) return;
            seen.add(o);
            
            // 对象本身的开销
            size += 32;
            
            // 遍历属性
            for (const key in o) {
                if (o.hasOwnProperty(key)) {
                    size += key.length * 2; // 键名
                    const value = o[key];
                    if (typeof value === 'string') {
                        size += value.length * 2;
                    } else if (typeof value === 'number' || typeof value === 'boolean') {
                        size += 8;
                    } else if (typeof value === 'object' && value !== null) {
                        calculate(value);
                    }
                }
            }
        };
        
        calculate(obj);
        return size;
    }
    
    /** 更新总内存占用 */
    private updateTotalMemory(): void {
        this.metrics.totalMemory = this.metrics.currentSize * this.metrics.estimatedItemSize;
    }
    
    /** 获取对象 */
    get(): T {
        const now = Date.now();
        this.metrics.lastAccessTime = now;
        this.metrics.accessTimes.push(now);
        
        // 只保留最近100次访问时间
        if (this.metrics.accessTimes.length > 100) {
            this.metrics.accessTimes.shift();
        }
        
        if (this.pool.length > 0) {
            this.metrics.hitCount++;
            const item = this.pool.pop()!;
            
            // LRU: 记录使用时间
            if (this.config.strategy === 'lru') {
                this.lruTimestamps.set(item, now);
            }
            
            this.metrics.currentSize = this.pool.length;
            this.updateTotalMemory();
            return item;
        }
        
        // 池中没有，创建新对象
        this.metrics.missCount++;
        this.metrics.createCount++;
        this.metrics.createTimes.push(now);
        
        // 只保留最近100次创建时间
        if (this.metrics.createTimes.length > 100) {
            this.metrics.createTimes.shift();
        }
        
        const item = this.factory();
        
        // LRU: 记录创建时间
        if (this.config.strategy === 'lru') {
            this.lruTimestamps.set(item, now);
        }
        
        // 触发自动调整
        this.autoAdjust();
        
        return item;
    }
    
    /** 回收对象 */
    recycle(item: T): void {
        if (!this.config.enabled) {
            return;
        }
        
        this.metrics.recycleCount++;
        
        // 检查是否超过最大容量
        if (this.pool.length < this.metrics.maxSize) {
            this.pool.push(item);
            this.metrics.currentSize = this.pool.length;
            this.updateTotalMemory();
        } else if (this.config.strategy === 'lru') {
            // LRU策略：移除最久未使用的对象
            this.evictLRU();
            this.pool.push(item);
            this.metrics.currentSize = this.pool.length;
            this.updateTotalMemory();
        }
        
        // 触发自动调整
        this.autoAdjust();
    }
    
    /** LRU淘汰策略 */
    private evictLRU(): void {
        if (this.pool.length === 0) return;
        
        let oldestItem: T | null = null;
        let oldestTime = Date.now();
        
        // 找到最久未使用的对象
        for (const item of this.pool) {
            const time = this.lruTimestamps.get(item) || 0;
            if (time < oldestTime) {
                oldestTime = time;
                oldestItem = item;
            }
        }
        
        // 移除最久未使用的对象
        if (oldestItem) {
            const index = this.pool.indexOf(oldestItem);
            if (index > -1) {
                this.pool.splice(index, 1);
                this.lruTimestamps.delete(oldestItem);
            }
        }
    }
    
    /** 自动调整池容量 */
    private autoAdjust(): void {
        const now = Date.now();
        const timeSinceLastAdjust = now - this.metrics.lastAdjustTime;
        
        // 每5秒调整一次
        if (timeSinceLastAdjust < 5000) {
            return;
        }
        
        this.metrics.lastAdjustTime = now;
        
        if (this.config.strategy === 'fixed') {
            return; // 固定策略不调整
        }
        
        // 计算命中率
        const totalAccess = this.metrics.hitCount + this.metrics.missCount;
        if (totalAccess < 10) {
            return; // 样本太少，不调整
        }
        
        const hitRate = this.metrics.hitCount / totalAccess;
        
        // 根据命中率调整最大容量
        if (hitRate < 0.5) {
            // 命中率低，需要扩容
            const newMax = Math.min(
                Math.floor(this.metrics.maxSize * 1.5),
                this.config.maxSize!
            );
            if (newMax > this.metrics.maxSize) {
                console.log(`[Pool] ${this.typeName} 扩容: ${this.metrics.maxSize} -> ${newMax} (命中率: ${(hitRate * 100).toFixed(1)}%)`);
                this.metrics.maxSize = newMax;
            }
        } else if (hitRate > 0.9 && this.pool.length > this.metrics.minSize * 2) {
            // 命中率高且池很大，可以缩容
            const newMax = Math.max(
                Math.floor(this.metrics.maxSize * 0.8),
                this.metrics.minSize
            );
            if (newMax < this.metrics.maxSize) {
                console.log(`[Pool] ${this.typeName} 缩容: ${this.metrics.maxSize} -> ${newMax} (命中率: ${(hitRate * 100).toFixed(1)}%)`);
                this.metrics.maxSize = newMax;
                
                // 清理多余对象
                while (this.pool.length > newMax) {
                    this.pool.pop();
                }
                this.metrics.currentSize = this.pool.length;
            }
        }
    }
    
    /** 预热池 */
    preWarm(count: number): void {
        const targetCount = Math.min(count, this.metrics.maxSize);
        while (this.pool.length < targetCount) {
            this.pool.push(this.factory());
            this.metrics.createCount++;
        }
        this.metrics.currentSize = this.pool.length;
        console.log(`[Pool] ${this.typeName} 预热完成: ${this.pool.length} 个对象`);
    }
    
    /** 获取统计信息 */
    getMetrics(): Readonly<PoolMetrics> {
        return { ...this.metrics };
    }
    
    /** 清空池 */
    clear(): void {
        this.pool.length = 0;
        this.lruTimestamps.clear();
        this.metrics.currentSize = 0;
        this.updateTotalMemory();
    }
    
    /** 清理长期未使用的对象（用于内存压力下的主动清理） */
    cleanupStale(maxAge: number = 60000): number {
        if (this.config.strategy !== 'lru') return 0;
        
        const now = Date.now();
        let cleaned = 0;
        
        // 保留最小容量
        const targetSize = Math.max(this.metrics.minSize, Math.floor(this.pool.length * 0.5));
        
        for (let i = this.pool.length - 1; i >= 0 && this.pool.length > targetSize; i--) {
            const item = this.pool[i];
            const lastUse = this.lruTimestamps.get(item) || 0;
            
            if (now - lastUse > maxAge) {
                this.pool.splice(i, 1);
                this.lruTimestamps.delete(item);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.metrics.currentSize = this.pool.length;
            this.updateTotalMemory();
            console.log(`[Pool] ${this.typeName} 清理了 ${cleaned} 个过期对象`);
        }
        
        return cleaned;
    }
    
    /** 计算创建频率（个/秒） */
    getCreateFrequency(): number {
        if (this.metrics.createTimes.length < 2) {
            return 0;
        }
        
        const timeSpan = this.metrics.createTimes[this.metrics.createTimes.length - 1] - 
                        this.metrics.createTimes[0];
        if (timeSpan === 0) {
            return 0;
        }
        
        return (this.metrics.createTimes.length / timeSpan) * 1000;
    }
    
    /** 计算访问频率（个/秒） */
    getAccessFrequency(): number {
        if (this.metrics.accessTimes.length < 2) {
            return 0;
        }
        
        const timeSpan = this.metrics.accessTimes[this.metrics.accessTimes.length - 1] - 
                        this.metrics.accessTimes[0];
        if (timeSpan === 0) {
            return 0;
        }
        
        return (this.metrics.accessTimes.length / timeSpan) * 1000;
    }
}

//#endregion

//#region 第二阶段：智能特性

/**
 * 智能池管理器
 * 添加学习、预热、类型分析功能
 */
class SmartPoolManager {
    private pools: Map<string, DynamicPool<any>> = new Map();
    private typeProfiles: Map<string, TypeProfile> = new Map();
    private historyData: Map<string, HistoryData> = new Map();
    private learningEnabled = true;
    private readonly HISTORY_KEY = 'ecs_pool_history';
    
    constructor() {
        this.loadHistory();
    }
    
    /** 获取或创建池 */
    getPool<T>(typeName: string, factory: () => T, config?: Partial<PoolConfig>): DynamicPool<T> {
        if (!this.pools.has(typeName)) {
            // 从历史数据学习
            const history = this.historyData.get(typeName);
            const learnedConfig = this.learnFromHistory(typeName, history);
            
            // 合并配置
            const finalConfig = { ...learnedConfig, ...config };
            
            const pool = new DynamicPool(typeName, factory, finalConfig);
            this.pools.set(typeName, pool);
            
            console.log(`[SmartPool] 创建池: ${typeName}`, finalConfig);
        }
        
        return this.pools.get(typeName)!;
    }
    
    /** 从历史数据学习 */
    private learnFromHistory(typeName: string, history?: HistoryData): Partial<PoolConfig> {
        if (!history || !this.learningEnabled) {
            return {};
        }
        
        const config: Partial<PoolConfig> = {};
        
        // 根据历史峰值设置预热和最大容量
        if (history.peakCount > 0) {
            config.preWarmSize = Math.floor(history.avgCount * 0.5);
            config.maxSize = Math.floor(history.peakCount * 1.2);
            config.minSize = Math.floor(history.avgCount * 0.2);
            
            console.log(`[SmartPool] ${typeName} 从历史学习: 峰值=${history.peakCount}, 平均=${history.avgCount}`);
        }
        
        return config;
    }
    
    /** 分析类型特征 */
    analyzeType(typeName: string): TypeProfile {
        const pool = this.pools.get(typeName);
        if (!pool) {
            return this.createDefaultProfile(typeName);
        }
        
        const metrics = pool.getMetrics();
        const frequency = pool.getCreateFrequency();
        
        // 计算复用率
        const reuseRate = metrics.recycleCount > 0 
            ? metrics.hitCount / metrics.recycleCount 
            : 0;
        
        // 分类
        let category: TypeProfile['category'] = 'normal';
        if (frequency > 50) {
            category = 'high-frequency';
        } else if (reuseRate < 0.2) {
            category = 'rare';
        } else if (metrics.createCount < 10) {
            category = 'long-lived';
        }
        
        const profile: TypeProfile = {
            typeName,
            category,
            peakRate: frequency,
            reuseRate,
            avgMemorySize: metrics.estimatedItemSize,
            shouldPool: this.shouldPool(category, reuseRate, frequency)
        };
        
        this.typeProfiles.set(typeName, profile);
        return profile;
    }
    
    /** 判断是否应该池化 */
    private shouldPool(category: string, reuseRate: number, frequency: number): boolean {
        // 高频对象必须池化
        if (category === 'high-frequency') {
            return true;
        }
        
        // 复用率太低不池化
        if (reuseRate < 0.1) {
            return false;
        }
        
        // 长生命周期且数量少不池化
        if (category === 'long-lived' && frequency < 1) {
            return false;
        }
        
        return true;
    }
    
    /** 创建默认特征 */
    private createDefaultProfile(typeName: string): TypeProfile {
        return {
            typeName,
            category: 'normal',
            peakRate: 0,
            reuseRate: 0,
            avgMemorySize: 0,
            shouldPool: true
        };
    }
    
    /** 场景感知预热 */
    onSceneChange(sceneType: string, hints: Map<string, number>): void {
        console.log(`[SmartPool] 场景切换: ${sceneType}`);
        
        hints.forEach((count, typeName) => {
            const pool = this.pools.get(typeName);
            if (pool) {
                pool.preWarm(count);
            }
        });
    }
    
    /** 保存历史数据 */
    saveHistory(): void {
        const history: Record<string, HistoryData> = {};
        
        this.pools.forEach((pool, typeName) => {
            const metrics = pool.getMetrics();
            history[typeName] = {
                typeName,
                peakCount: metrics.maxSize,
                avgCount: Math.floor((metrics.hitCount + metrics.missCount) / 2),
                lastPlayTime: Date.now()
            };
        });
        
        try {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
            console.log('[SmartPool] 历史数据已保存');
        } catch (e) {
            console.warn('[SmartPool] 保存历史数据失败', e);
        }
    }
    
    /** 加载历史数据 */
    private loadHistory(): void {
        try {
            const data = localStorage.getItem(this.HISTORY_KEY);
            if (data) {
                const history = JSON.parse(data);
                Object.entries(history).forEach(([typeName, data]) => {
                    this.historyData.set(typeName, data as HistoryData);
                });
                console.log(`[SmartPool] 加载历史数据: ${this.historyData.size} 个类型`);
            }
        } catch (e) {
            console.warn('[SmartPool] 加载历史数据失败', e);
        }
    }
    
    /** 获取所有池的统计信息 */
    getAllMetrics(): Map<string, PoolMetrics> {
        const result = new Map<string, PoolMetrics>();
        this.pools.forEach((pool, typeName) => {
            result.set(typeName, pool.getMetrics());
        });
        return result;
    }
    
    /** 清空所有池 */
    clearAll(): void {
        this.pools.forEach(pool => pool.clear());
        console.log('[SmartPool] 所有池已清空');
    }
    
    /** 清理所有池中的过期对象 */
    cleanupAllStale(maxAge: number = 60000): number {
        let totalCleaned = 0;
        this.pools.forEach(pool => {
            totalCleaned += pool.cleanupStale(maxAge);
        });
        if (totalCleaned > 0) {
            console.log(`[SmartPool] 总共清理了 ${totalCleaned} 个过期对象`);
        }
        return totalCleaned;
    }
    
    /** 获取总内存占用 */
    getTotalMemory(): number {
        let total = 0;
        this.pools.forEach(pool => {
            total += pool.getMetrics().totalMemory;
        });
        return total;
    }
    
    /** 获取类型分析报告 */
    getTypeProfiles(): Map<string, TypeProfile> {
        // 更新所有类型的分析
        this.pools.forEach((pool, typeName) => {
            this.analyzeType(typeName);
        });
        return new Map(this.typeProfiles);
    }
}

//#endregion

//#region 第三阶段：可选配置

/** 池配置装饰器 */
export function poolConfig(config: PoolConfig) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        // 将配置存储到构造函数上
        (constructor as any).__poolConfig = config;
        return constructor;
    };
}

/** 池提示装饰器 */
export function poolHint(hint: PoolHint) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        // 将提示存储到构造函数上
        (constructor as any).__poolHint = hint;
        return constructor;
    };
}

/** 获取类的池配置 */
export function getPoolConfig(constructor: any): PoolConfig | undefined {
    return constructor.__poolConfig;
}

/** 获取类的池提示 */
export function getPoolHint(constructor: any): PoolHint | undefined {
    return constructor.__poolHint;
}

//#endregion

//#region 全局协调器

/**
 * 全局池协调器
 * 管理总内存预算，协调各池之间的资源分配
 */
class GlobalPoolCoordinator {
    private smartManager: SmartPoolManager;
    private totalBudget = 100 * 1024 * 1024; // 100MB默认预算
    private cleanupTimer: any = null;
    private autoCleanupEnabled = false;
    
    constructor() {
        this.smartManager = new SmartPoolManager();
    }
    
    /** 获取或创建池 */
    getPool<T>(typeName: string, factory: () => T, ctor?: any): DynamicPool<T> {
        let config: Partial<PoolConfig> = {};
        let hint: PoolHint | undefined;
        
        // 读取装饰器配置
        if (ctor) {
            const decoratorConfig = getPoolConfig(ctor);
            if (decoratorConfig) {
                config = decoratorConfig;
            }
            
            hint = getPoolHint(ctor);
            if (hint) {
                // 应用提示
                if (hint.expectedPeak) {
                    config.maxSize = hint.expectedPeak;
                    config.preWarmSize = Math.floor(hint.expectedPeak * 0.3);
                }
                if (hint.highFrequency) {
                    config.minSize = 50;
                    config.maxSize = config.maxSize || 1000;
                }
            }
        }
        
        return this.smartManager.getPool(typeName, factory, config);
    }
    
    /** 场景切换 */
    onSceneChange(sceneType: string, hints: Map<string, number>): void {
        this.smartManager.onSceneChange(sceneType, hints);
    }
    
    /** 获取智能管理器 */
    getSmartManager(): SmartPoolManager {
        return this.smartManager;
    }
    
    /** 设置总内存预算 */
    setTotalBudget(bytes: number): void {
        this.totalBudget = bytes;
        console.log(`[GlobalCoordinator] 设置内存预算: ${(bytes / 1024 / 1024).toFixed(2)}MB`);
        
        // 检查是否超出预算
        this.checkMemoryBudget();
    }
    
    /** 检查内存预算 */
    private checkMemoryBudget(): void {
        const usedMemory = this.smartManager.getTotalMemory();
        const usagePercent = (usedMemory / this.totalBudget) * 100;
        
        if (usedMemory > this.totalBudget) {
            console.warn(`[GlobalCoordinator] 内存超出预算! 使用: ${(usedMemory / 1024 / 1024).toFixed(2)}MB / ${(this.totalBudget / 1024 / 1024).toFixed(2)}MB (${usagePercent.toFixed(1)}%)`);
            
            // 触发清理
            this.smartManager.cleanupAllStale(30000); // 清理30秒未使用的对象
            
            // 再次检查
            const newUsed = this.smartManager.getTotalMemory();
            if (newUsed > this.totalBudget) {
                console.warn(`[GlobalCoordinator] 清理后仍超出预算，考虑增加预算或优化对象使用`);
            }
        } else if (usagePercent > 80) {
            console.warn(`[GlobalCoordinator] 内存使用率较高: ${usagePercent.toFixed(1)}%`);
        }
    }
    
    /** 获取当前内存使用情况 */
    getMemoryUsage(): { used: number; budget: number; percent: number } {
        const used = this.smartManager.getTotalMemory();
        return {
            used,
            budget: this.totalBudget,
            percent: (used / this.totalBudget) * 100
        };
    }
    
    /** 启用自动清理（定期清理过期对象） */
    enableAutoCleanup(interval: number = 60000): void {
        if (this.autoCleanupEnabled) {
            console.warn('[GlobalCoordinator] 自动清理已启用');
            return;
        }
        
        this.autoCleanupEnabled = true;
        this.cleanupTimer = setInterval(() => {
            this.smartManager.cleanupAllStale();
            this.checkMemoryBudget();
        }, interval);
        
        console.log(`[GlobalCoordinator] 启用自动清理，间隔: ${interval}ms`);
    }
    
    /** 禁用自动清理 */
    disableAutoCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.autoCleanupEnabled = false;
        console.log('[GlobalCoordinator] 禁用自动清理');
    }
    
    /** 保存历史数据 */
    saveHistory(): void {
        this.smartManager.saveHistory();
    }
}

//#endregion

//#region 导出单例

/** 全局池协调器实例 */
export const globalPoolCoordinator = new GlobalPoolCoordinator();

//#endregion

