import type { ecs } from '../ECS';
import { registry } from '../registry/ECSTypeRegistry';
import type { CompCtor } from '../registry/ECSTypes';
import { ecsPoolCoordinator } from '../pool/ECSPoolManager';
import { getStorageProvider } from './ComponentStorage';
import type { ECSWorld } from '../world/ECSWorld';
import { ECSEntity } from './ECSEntity';

/**
 * 实体组件/生命周期的内部工具集（静态方法，无实例状态）。
 *
 * 这里集中了 {@link ECSEntity} 在增删组件、销毁回收时用到的底层"管线"逻辑：
 * - 组件增删广播到对应世界的观察者；
 * - 从对象池构造组件实例；
 * - 实体销毁时回收到对象池并释放 eid；
 * - 维护 `entity.CompName` 同名属性引用（兼容历史的直接访问写法）。
 *
 * 拆分目的：让 {@link ECSEntity} 只保留对外的实体语义 API，
 * 把无对外意义的底层细节收敛到一处，便于维护与复用。
 */
export class EntityHelper {
    /**
     * 实体身上组件有增删操作，广播通知对应的观察者
     * @param entity          实体对象
     * @param componentTypeId 组件类型id
     */
    static broadcastCompAddOrRemove(entity: ECSEntity, componentTypeId: number): void {
        // 派送到实体所属世界，确保跨世界操作时分组/单例落在正确的世界
        const world = entity.world;
        const events = world.groups.getCompCallbacks(componentTypeId);
        if (events) {
            for (let i = events.length - 1; i >= 0; i--) {
                events[i](entity);
            }
        }
        // 单例驱逐不在此处理：这里对“任意实体增删任意组件”都会触发，
        // 若按 tid 盲删 tid2comp，会把无关实体的同类型组件操作误判为移除单例。
        // 精确驱逐放在 ECSEntity.remove 中按“组件实例身份”判断。
    }

    /**
     * 设置实体上的同名组件属性（兼容 `entity.CompName` 直接访问的历史用法）。
     * 读取走 `comps[tid]` 密集数组（O(1)），此处仅为对外直接访问保留命名引用。
     */
    static setEntityComp<T extends ecs.IComp>(entity: ECSEntity, compName: string, comp: T): void {
        (entity as unknown as Record<string, unknown>)[compName] = comp;
    }

    /**
     * 清除实体上的同名组件属性（置 null，保持与历史行为一致）。
     */
    static deleteEntityComp(entity: ECSEntity, compName: string): void {
        if (compName) (entity as unknown as Record<string, unknown>)[compName] = null;
    }

    /**
     * 创建组件对象（使用动态池管理）
     * @param ctor 组件构造函数
     */
    static createComp<T extends ecs.IComp>(ctor: CompCtor<T>): T {
        const cct = registry.compCtors[ctor.tid];
        if (!cct) {
            throw Error(`没有找到该组件的构造函数，检查${ctor.compName}是否为不可构造的组件`);
        }

        // 使用动态池管理器
        const pool = ecsPoolCoordinator.getPool(
            ctor.compName,
            () => new (cct as CompCtor<T>)()
        );

        const component = pool.get();
        return component as T;
    }

    /**
     * 为实体获取一个组件实例：托管存储（如 SoA）优先，否则走 AoS 对象池。
     * 统一入口让 ECSEntity 不必感知具体存储策略。
     * @param world 实体所属世界
     * @param eid   实体编号
     * @param ctor  组件构造函数
     */
    static acquireComponent<T extends ecs.IComp>(world: ECSWorld, eid: number, ctor: CompCtor<T>): T {
        const provider = getStorageProvider();
        if (provider && provider.handles(ctor)) {
            return provider.acquire(world, eid, ctor) as T;
        }
        return EntityHelper.createComp(ctor);
    }

    /**
     * 释放/回收一个组件实例（与 {@link acquireComponent} 对称）：
     * - 托管存储（如 SoA）：交还列槽位；
     * - AoS：canRecycle 时回收到对象池，否则丢弃。
     * 调用方负责在此之前完成 reset/解引用等清理。
     * @param world 实体所属世界
     * @param eid   实体编号
     * @param ctor  组件构造函数（可能为 undefined，例如 tid 未在注册表中）
     * @param comp  待释放的组件实例
     */
    static releaseComponent(world: ECSWorld, eid: number, ctor: CompCtor<ecs.IComp> | undefined, comp: ecs.IComp): void {
        if (ctor) {
            const provider = getStorageProvider();
            if (provider && provider.handles(ctor)) {
                provider.release(world, eid, ctor);
                return;
            }
            if (comp.canRecycle) {
                const pool = ecsPoolCoordinator.getPool(ctor.compName, () => new (ctor as CompCtor<ecs.IComp>)());
                pool.recycle(comp);
            }
        }
    }

    /**
     * 销毁实体（使用动态池管理）
     *
     * 缓存销毁的实体，下次新建实体时会优先从缓存中拿
     * @param entity 实体对象
     */
    static destroyEntity(entity: ECSEntity): void {
        // 在实体所属世界中注销（而非当前世界），保证跨世界销毁正确
        const world = entity.world;
        if (world.entities.has(entity.eid)) {
            // 自动置空所有指向该实体的 @EntityRef 引用（杜绝悬空引用）
            world.refs.clearReferencesTo(entity.eid);

            // 使用动态池管理器（用实体自身构造函数兜底，避免依赖具体子类）
            const pool = ecsPoolCoordinator.getPool(
                entity.name,
                () => new (entity.constructor as new () => ECSEntity)()
            );

            // 清空mask并回收
            entity.getMask().clear();
            pool.recycle(entity);

            world.entities.delete(entity.eid);
            // 释放 eid：递增世代号，使旧 eid 立即失效（悬空引用检测）
            world.eids.release(entity.eid);
        }
        else {
            console.warn('试图销毁不存在的实体');
        }
    }
}
