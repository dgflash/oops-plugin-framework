/**
 * ECS 对象数量监控日志模块
 * 独立模块，零入侵现有 ECS 代码
 * 通过控制台命令触发打印 ECS 对象统计表格
 */

import { ECSModel } from './ECSModel';
import { ecsPoolCoordinator } from './pool';

/** 监控数据项 */
interface MonitorItem {
    /** 对象类型 */
    type: string;
    /** 活跃数 */
    active: number;
    /** 缓存数 */
    cached: number;
    /** 总计 */
    total: number;
}

/** 池监控数据项 */
interface PoolMonitorItem {
    /** 类型名 */
    typeName: string;
    /** 活跃数 */
    active: number;
    /** 缓存命中 */
    hitCount: number;
    /** 缓存未中 */
    missCount: number;
    /** 当前缓存 */
    currentCache: number;
    /** 总创建 */
    totalCreated: number;
}

/** 实体缓存监控项 */
interface EntityCacheItem {
    /** 实体名 */
    entityName: string;
    /** 缓存组件数 */
    cachedCompCount: number;
}

/** ECS 监控日志 */
export class ECSMonitorLogger {
    /**
     * 打印 ECS 总体统计表格
     */
    printSummary(): void {
        const data: MonitorItem[] = [];

        // 实体统计
        const activeEntities = ECSModel.eid2Entity.size;
        let entityCache = 0;
        const poolMetrics = ecsPoolCoordinator.getAllMetrics();
        const entityNames = new Set(ECSModel.entityCtors.values());
        poolMetrics.forEach((metrics, name) => {
            // 实体池的名称是通过 entityCtors 注册的名称
            if (entityNames.has(name)) {
                entityCache += metrics.currentSize;
            }
        });
        data.push({
            type: 'ECSEntity',
            active: activeEntities,
            cached: entityCache,
            total: activeEntities + entityCache,
        });

        // 组件统计
        let activeComps = 0;
        ECSModel.eid2Entity.forEach((entity) => {
            activeComps += entity.getMask().toString().split('1').length - 1;
        });
        // 只统计动态池中的组件缓存
        let compCache = 0;
        poolMetrics.forEach((metrics, name) => {
            if (ECSModel.compCtors.some((ctor) => ctor.compName === name)) {
                compCache += metrics.currentSize;
            }
        });
        data.push({
            type: 'ECSComp',
            active: activeComps,
            cached: compCache,
            total: activeComps + compCache,
        });

        // Group 统计
        data.push({
            type: 'ECSGroup',
            active: ECSModel.groups.size,
            cached: 0,
            total: ECSModel.groups.size,
        });

        // System 统计
        let systemCount = 0;
        ECSModel.systems.forEach((system) => {
            systemCount += system.comblockSystems.length;
        });
        data.push({
            type: 'ECSSystem',
            active: systemCount,
            cached: 0,
            total: systemCount,
        });

        console.log('%c[ECS Monitor] 总体统计', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(data);
    }

    /**
     * 打印实体池明细表格
     */
    printEntityPools(): void {
        const data: PoolMonitorItem[] = [];
        const poolMetrics = ecsPoolCoordinator.getAllMetrics();
        const entityNames = new Set(ECSModel.entityCtors.values());

        poolMetrics.forEach((metrics, name) => {
            if (entityNames.has(name)) {
                // 计算活跃数：通过 eid2Entity 中 name 匹配的实体
                let activeCount = 0;
                ECSModel.eid2Entity.forEach((entity) => {
                    if (entity.name === name) activeCount++;
                });
                data.push({
                    typeName: name,
                    active: activeCount,
                    hitCount: metrics.hitCount,
                    missCount: metrics.missCount,
                    currentCache: metrics.currentSize,
                    totalCreated: metrics.createCount,
                });
            }
        });

        if (data.length === 0) {
            console.log('%c[ECS Monitor] 暂无实体池数据', 'color:#ee7700;');
            return;
        }

        console.log('%c[ECS Monitor] 实体池明细', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(data);
    }

    /**
     * 获取组件分类排序权重
     * @param compName 组件名
     * @returns 排序权重（越小越靠前）
     */
    private getCompSortWeight(compName: string): number {
        // M_ 开头 - Model 数据层 (权重 1)
        if (compName.startsWith('M_')) return 1;
        // B_ 开头 - Business 业务层 (权重 2)
        if (compName.startsWith('B_')) return 2;
        // V_ 开头 - View 视图层 (权重 3)
        if (compName.startsWith('V_')) return 3;
        // VC_ 开头 - ViewController 视图控制层 (权重 4)
        if (compName.startsWith('VC_')) return 4;
        // 其他 (权重 5)
        return 5;
    }

    /**
     * 打印组件池明细表格（按 M/B/V/VC/其他 分类排序）
     */
    printComponentPools(): void {
        const data: PoolMonitorItem[] = [];
        const poolMetrics = ecsPoolCoordinator.getAllMetrics();

        // 收集所有组件数据
        const compDataList: { item: PoolMonitorItem; weight: number }[] = [];

        ECSModel.compCtors.forEach((ctor) => {
            const metrics = poolMetrics.get(ctor.compName);
            // 计算活跃组件数
            let activeCount = 0;
            ECSModel.eid2Entity.forEach((entity) => {
                if (entity.has(ctor.tid)) activeCount++;
            });

            const item: PoolMonitorItem = metrics
                ? {
                        typeName: ctor.compName,
                        active: activeCount,
                        hitCount: metrics.hitCount,
                        missCount: metrics.missCount,
                        currentCache: metrics.currentSize,
                        totalCreated: metrics.createCount,
                    }
                : {
                        typeName: ctor.compName,
                        active: activeCount,
                        hitCount: 0,
                        missCount: 0,
                        currentCache: 0,
                        totalCreated: 0,
                    };

            compDataList.push({
                item,
                weight: this.getCompSortWeight(ctor.compName),
            });
        });

        // 按权重排序，同权重按名称排序
        compDataList.sort((a, b) => {
            if (a.weight !== b.weight) {
                return a.weight - b.weight;
            }
            return a.item.typeName.localeCompare(b.item.typeName);
        });

        // 提取排序后的数据
        compDataList.forEach(({ item }) => data.push(item));

        console.log('%c[ECS Monitor] 组件池明细', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(data);
    }

    /**
     * 打印实体组件缓存明细（isRecycle=false 缓存的组件）
     */
    printEntityCaches(): void {
        const data: EntityCacheItem[] = [];

        ECSModel.eid2Entity.forEach((entity) => {
            const count = entity.getCachedComponentCount();
            if (count > 0) {
                data.push({
                    entityName: `${entity.name}(eid:${entity.eid})`,
                    cachedCompCount: count,
                });
            }
        });

        if (data.length === 0) {
            console.log('%c[ECS Monitor] 暂无实体组件缓存', 'color:#00aa00;');
            return;
        }

        console.log('%c[ECS Monitor] 实体组件缓存明细 (isRecycle=false)', 'color:#fff;background:#ee7700;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(data);
    }

    /**
     * 打印所有监控表格
     */
    printAll(): void {
        console.log('%c══════════════ ECS 对象监控 ══════════════', 'color:#3a5fcd;font-weight:bold;font-size:14px;');
        this.printSummary();
        this.printEntityPools();
        this.printComponentPools();
        this.printEntityCaches();
        console.log('%c══════════════════════════════════════════', 'color:#3a5fcd;font-weight:bold;font-size:14px;');
    }
}

/** ECS 监控日志全局实例 */
export const ecsMonitor = new ECSMonitorLogger();

// 注册全局控制台命令
if (typeof window !== 'undefined') {
    Object.assign(window, {
        ecsMonitor,
        ecsLog: () => ecsMonitor.printAll(),
        ecsSummary: () => ecsMonitor.printSummary(),
        ecsEntityPools: () => ecsMonitor.printEntityPools(),
        ecsCompPools: () => ecsMonitor.printComponentPools(),
        ecsEntityCaches: () => ecsMonitor.printEntityCaches(),
        ecsHelp: () => {
            console.log('%c[ECS Monitor] 可用命令:', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
            console.table([
                { command: 'ecsLog()', description: '打印所有监控表格' },
                { command: 'ecsSummary()', description: '打印总体统计（实体/组件/分组/系统数量）' },
                { command: 'ecsEntityPools()', description: '打印实体池明细（命中/未命中/缓存统计）' },
                { command: 'ecsCompPools()', description: '打印组件池明细（命中/未命中/缓存统计）' },
                { command: 'ecsEntityCaches()', description: '打印实体组件缓存明细（isRecycle=false 缓存的组件）' },
                { command: 'ecsHelp()', description: '显示此帮助信息' },
            ]);
        },
    });
}
