/**
 * ECS 对象数量监控日志模块
 * 独立模块，零入侵现有 ECS 代码
 * 通过控制台命令触发打印 ECS 对象统计表格
 */

import type { ECSWorld } from './world/ECSWorld';
import { registry } from './registry/ECSTypeRegistry';
import { ecsWorldManager } from './world/ECSWorldManager';
import { ecsPoolCoordinator } from './pool/ECSPoolManager';

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

/** 世界监控数据项 */
interface WorldMonitorItem {
    /** 世界名称 */
    worldName: string;
    /** 活跃实体数 */
    entities: number;
    /** 活跃组件数（实体上已挂载） */
    activeComponents: number;
    /** 软移除缓存组件数（isRecycle=false） */
    softCachedComponents: number;
    /** 本世界 @ecs.register(world) 注册的系统类数 */
    worldSystems: number;
}

/** 对象池缓存汇总 */
interface PoolCacheSummaryItem {
    /** 缓存类别 */
    category: string;
    /** 池中闲置对象数 */
    cached: number;
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
    /** 所属世界 */
    worldName: string;
    /** 实体名 */
    entityName: string;
    /** 缓存组件数 */
    cachedCompCount: number;
}

/**
 * ECS 监控日志
 * 通过控制台命令输出实体/组件/系统/对象池的统计表格，零入侵现有 ECS 逻辑
 */
export class ECSMonitorLogger {
    /** 统计全局 registry.systems 中注册的系统类总数 */
    private countGlobalSystemClasses(): number {
        let count = 0;
        registry.systems.forEach((ctors) => { count += ctors.length; });
        return count;
    }

    /** 统计某世界 world.systems 中注册的系统类总数 */
    private countWorldSystemClasses(world: ECSWorld): number {
        return world.systems.count;
    }

    /** 收集单个世界的实体/组件/系统统计 */
    private collectWorldStats(world: ECSWorld): WorldMonitorItem {
        let activeComponents = 0;
        let softCachedComponents = 0;
        world.entities.forEach((entity) => {
            activeComponents += entity.getMask().bitCount();
            softCachedComponents += entity.getCachedComponentCount();
        });
        return {
            worldName: world.name,
            entities: world.entities.size,
            activeComponents,
            softCachedComponents,
            worldSystems: this.countWorldSystemClasses(world),
        };
    }

    /** 汇总对象池中实体与组件的闲置缓存数量 */
    private collectPoolCacheStats(): PoolCacheSummaryItem[] {
        const poolMetrics = ecsPoolCoordinator.getAllMetrics();
        const entityNames = new Set(registry.entityCtors.values());
        let entityPoolCached = 0;
        let compPoolCached = 0;

        poolMetrics.forEach((metrics, name) => {
            if (entityNames.has(name)) {
                entityPoolCached += metrics.currentSize;
            }
            else if (registry.compCtors.some((ctor) => ctor?.compName === name)) {
                compPoolCached += metrics.currentSize;
            }
        });

        return [
            { category: '实体池', cached: entityPoolCached },
            { category: '组件池', cached: compPoolCached },
            { category: '合计', cached: entityPoolCached + compPoolCached },
        ];
    }

    /** 遍历所有世界 */
    private forEachWorld(fn: (world: ECSWorld) => void): void {
        ecsWorldManager.worlds.forEach(fn);
    }

    /**
     * 打印各世界实体/系统/组件统计，以及全局对象池组件缓存汇总
     */
    printWorldSummary(): void {
        const worldData: WorldMonitorItem[] = [];
        this.forEachWorld((world) => {
            worldData.push(this.collectWorldStats(world));
        });

        const globalSystems = this.countGlobalSystemClasses();
        const poolCache = this.collectPoolCacheStats();
        const totalSoftCache = worldData.reduce((sum, row) => sum + row.softCachedComponents, 0);
        const totalPoolCompCache = poolCache.find((row) => row.category === '组件池')?.cached ?? 0;

        console.log('%c[ECS Monitor] 各世界统计', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(worldData);

        console.log('%c[ECS Monitor] 全局注册系统（@ecs.register 未指定 world，RootSystem.init 时按世界实例化）', 'color:#888;');
        console.table([{ globalSystemClasses: globalSystems }]);

        console.log('%c[ECS Monitor] 对象池闲置缓存', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(poolCache);

        console.log(
            `%c[ECS Monitor] 组件缓存合计：对象池 ${totalPoolCompCache} + 实体软移除 ${totalSoftCache} = ${totalPoolCompCache + totalSoftCache}`,
            'color:#00aa00;font-weight:bold;'
        );
    }

    /**
     * 打印 ECS 总体统计表格（汇总所有世界）
     */
    printSummary(): void {
        const data: MonitorItem[] = [];
        let totalEntities = 0;
        let totalActiveComps = 0;
        let totalSoftCompCache = 0;
        let totalGroups = 0;

        this.forEachWorld((world) => {
            totalEntities += world.entities.size;
            totalGroups += world.groups.size;
            world.entities.forEach((entity) => {
                totalActiveComps += entity.getMask().bitCount();
                totalSoftCompCache += entity.getCachedComponentCount();
            });
        });

        const poolCache = this.collectPoolCacheStats();
        const entityPoolCached = poolCache.find((row) => row.category === '实体池')?.cached ?? 0;
        const compPoolCached = poolCache.find((row) => row.category === '组件池')?.cached ?? 0;

        data.push({
            type: 'ECSEntity',
            active: totalEntities,
            cached: entityPoolCached,
            total: totalEntities + entityPoolCached,
        });

        data.push({
            type: 'ECSComp',
            active: totalActiveComps,
            cached: compPoolCached + totalSoftCompCache,
            total: totalActiveComps + compPoolCached + totalSoftCompCache,
        });

        data.push({
            type: 'ECSGroup',
            active: totalGroups,
            cached: 0,
            total: totalGroups,
        });

        let worldSystemClasses = 0;
        this.forEachWorld((world) => {
            worldSystemClasses += this.countWorldSystemClasses(world);
        });
        const globalSystemClasses = this.countGlobalSystemClasses();

        data.push({
            type: 'ECSSystem(世界注册)',
            active: worldSystemClasses,
            cached: 0,
            total: worldSystemClasses,
        });

        data.push({
            type: 'ECSSystem(全局注册)',
            active: globalSystemClasses,
            cached: 0,
            total: globalSystemClasses,
        });

        console.log('%c[ECS Monitor] 总体统计（所有世界合计）', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(data);
    }

    /**
     * 打印实体池明细表格
     */
    printEntityPools(): void {
        const data: PoolMonitorItem[] = [];
        const poolMetrics = ecsPoolCoordinator.getAllMetrics();
        const entityNames = new Set(registry.entityCtors.values());

        poolMetrics.forEach((metrics, name) => {
            if (entityNames.has(name)) {
                let activeCount = 0;
                this.forEachWorld((world) => {
                    world.entities.forEach((entity) => {
                        if (entity.name === name) activeCount++;
                    });
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
        if (compName.startsWith('M_')) return 1;
        if (compName.startsWith('B_')) return 2;
        if (compName.startsWith('V_')) return 3;
        if (compName.startsWith('VC_')) return 4;
        return 5;
    }

    /**
     * 打印组件池明细表格（按 M/B/V/VC/其他 分类排序）
     */
    printComponentPools(): void {
        const data: PoolMonitorItem[] = [];
        const poolMetrics = ecsPoolCoordinator.getAllMetrics();
        const compDataList: { item: PoolMonitorItem; weight: number }[] = [];

        registry.compCtors.forEach((ctor) => {
            if (!ctor) return;
            const metrics = poolMetrics.get(ctor.compName);
            let activeCount = 0;
            this.forEachWorld((world) => {
                world.entities.forEach((entity) => {
                    if (entity.has(ctor.tid)) activeCount++;
                });
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

        compDataList.sort((a, b) => {
            if (a.weight !== b.weight) return a.weight - b.weight;
            return a.item.typeName.localeCompare(b.item.typeName);
        });

        compDataList.forEach(({ item }) => data.push(item));

        console.log('%c[ECS Monitor] 组件池明细', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
        console.table(data);
    }

    /**
     * 打印实体组件缓存明细（isRecycle=false 缓存的组件）
     */
    printEntityCaches(): void {
        const data: EntityCacheItem[] = [];

        this.forEachWorld((world) => {
            world.entities.forEach((entity) => {
                const count = entity.getCachedComponentCount();
                if (count > 0) {
                    data.push({
                        worldName: world.name,
                        entityName: `${entity.name}(eid:${entity.eid})`,
                        cachedCompCount: count,
                    });
                }
            });
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
        this.printWorldSummary();
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
        ecsWorldSummary: () => ecsMonitor.printWorldSummary(),
        ecsSummary: () => ecsMonitor.printSummary(),
        ecsEntityPools: () => ecsMonitor.printEntityPools(),
        ecsCompPools: () => ecsMonitor.printComponentPools(),
        ecsEntityCaches: () => ecsMonitor.printEntityCaches(),
        ecsHelp: () => {
            console.log('%c[ECS Monitor] 可用命令:', 'color:#fff;background:#3a5fcd;padding:2px 8px;border-radius:4px;font-weight:bold;');
            console.table([
                { command: 'ecsLog()', description: '打印所有监控表格' },
                { command: 'ecsWorldSummary()', description: '打印各世界实体/系统/组件缓存统计' },
                { command: 'ecsSummary()', description: '打印总体统计（所有世界合计）' },
                { command: 'ecsEntityPools()', description: '打印实体池明细（命中/未命中/缓存统计）' },
                { command: 'ecsCompPools()', description: '打印组件池明细（命中/未命中/缓存统计）' },
                { command: 'ecsEntityCaches()', description: '打印实体软移除组件缓存明细' },
                { command: 'ecsHelp()', description: '显示此帮助信息' },
            ]);
        },
    });
}
