import { registry } from '../registry/ECSTypeRegistry';
import type { CompCtor, EntityCtor, IComp } from '../registry/ECSTypes';
import { ecsPoolCoordinator } from '../pool/ECSPoolManager';
import { EntityIdManager } from '../entity/EntityIdManager';
import { ECSEntity } from '../entity/ECSEntity';
import { ECSEntityTable } from '../entity/ECSEntityTable';
import { getStorageProvider } from '../entity/ComponentStorage';
import { ECSReferenceTracker } from '../reference/ECSReferenceTracker';
import { ECSGroupManager } from '../query/ECSGroupManager';
import { ECSSingletonManager } from '../component/ECSSingletonManager';
import { ECSCommandBuffer } from './ECSCommandBuffer';
import { ECSWorldSystemRegistry } from '../system/ECSWorldSystemRegistry';
import { ECSRootSystem } from '../system/ECSRootSystem';

/**
 * ECS 世界 —— 运行期数据容器，组合各专职管理器；实体 / 单例 / eid 操作经本类方法访问。
 */
export class ECSWorld {
    /** 世界名称（默认世界为 `__default__`，具名世界用于多场景 / 房间隔离） */
    readonly name: string;
    /** 结构变更世代号（实体 / 组件增删时递增，供 SoA 等检测陈旧读写） */
    epoch = 1;

    /** 世代式 eid 分配与校验（`clear` 时 reset） */
    readonly eids = new EntityIdManager();
    /** 活动实体表（eid → 实体，track / get / forEach） */
    readonly entities = new ECSEntityTable();
    /** 响应式查询分组 + 组件增删回调槽（`ecs.query` / 系统 filter 建组） */
    readonly groups: ECSGroupManager;
    /** 本世界单例组件表（tid → 组件实例） */
    readonly singletons = new ECSSingletonManager();
    /** @entityRef 引用追踪（目标实体销毁时自动置空） */
    readonly refs = new ECSReferenceTracker();
    /** 延迟结构变更命令队列（帧末由 `root.execute` flush） */
    readonly commands = new ECSCommandBuffer();
    /** 本世界 `@ecs.register(world)` 注册的系统类表 */
    readonly systems = new ECSWorldSystemRegistry();
    /** 本世界唯一根系统（驱动子系统 init / execute，构造时伴生创建） */
    readonly root: ECSRootSystem;

    constructor(name: string, registeredTids?: number[]) {
        this.name = name;
        this.groups = new ECSGroupManager(registeredTids);
        this.root = new ECSRootSystem(this);
    }

    /**
     * 创建或从对象池获取实体，并绑定到本世界。
     * @param ctor 已注册的实体类
     */
    getEntity<T extends ECSEntity>(ctor: EntityCtor<T>): T {
        const entityName = registry.entityCtors.get(ctor as EntityCtor<ECSEntity>);
        if (entityName === undefined) {
            console.error(`${ctor.name} 实体没有注册`);
            throw new Error(`${ctor.name} 实体没有注册`);
        }

        const pool = ecsPoolCoordinator.getPool(
            entityName,
            () => {
                const entity = new ctor();
                entity.name = entityName;
                return entity;
            }
        );

        const entity = pool.get();
        entity.world = this;
        entity.eid = this.eids.allocate();

        const entityWithInit = entity as ECSEntity & { init?: () => void };
        entity.isValid = true;
        if (entityWithInit.init) entityWithInit.init();

        this.entities.track(entity);
        return entity;
    }

    /** 通过 eid 获取实体 */
    getEntityByEid<T extends ECSEntity = ECSEntity>(eid: number): T | undefined {
        return this.entities.get<T>(eid);
    }

    /** 当前存活实体数量 */
    get activeEntityCount(): number {
        return this.entities.size;
    }

    /** 校验 eid 是否仍指向存活实体（悬空引用检测） */
    isEidValid(eid: number): boolean {
        return this.eids.isValid(eid);
    }

    /**
     * 句柄式组件访问：通过 eid 安全获取组件实例
     * @param eid 实体 eid
     * @param ctor 组件类
     */
    getComponent<T extends IComp>(eid: number, ctor: CompCtor<T>): T | undefined {
        if (!this.eids.isValid(eid)) return undefined;
        const entity = this.entities.get(eid);
        return entity ? entity.get(ctor) : undefined;
    }

    /**
     * 为实体指定 eid（反序列化 / 联机状态恢复时保持编号一致）
     * @param entity 目标实体（须属于本世界）
     * @param eid 要绑定的 eid
     */
    assignEid(entity: ECSEntity, eid: number): void {
        if (this.entities.get(entity.eid) === entity) {
            this.entities.delete(entity.eid);
        }
        this.eids.reserve(eid);
        entity.eid = eid;
        this.entities.set(eid, entity);
    }

    /**
     * 获取单例组件（取不到则创建宿主实体并挂载）
     * @param ctor 组件类
     */
    getSingleton<T extends IComp>(ctor: CompCtor<T>): T {
        return this.singletons.getOrCreate(ctor.tid, () => this.createEntityWithComp(ctor));
    }

    /** 注册外部已构造的单例组件 */
    addSingleton(obj: IComp): void {
        this.singletons.add(obj);
    }

    /** 清理本世界运行期数据；子系统请 `root.clear()`，整世界移除请 `ecs.world.remove(name)` */
    clear(): void {
        this.entities.forEach((entity) => entity.destroy());
        this.groups.clear();
        this.entities.clear();
        this.singletons.clear();
        getStorageProvider()?.clearWorld(this);
        this.refs.clear();
        this.commands.clear();
        this.eids.reset();
        this.epoch = 1;
    }

    /** 创建实体（不经对象池，单例组件内部使用） */
    private createEntity(): ECSEntity {
        const entity = new ECSEntity();
        entity.world = this;
        entity.eid = this.eids.allocate();
        this.entities.track(entity);
        return entity;
    }

    /** 创建实体并挂载组件（单例组件内部使用） */
    private createEntityWithComp<T extends IComp>(ctor: CompCtor<T>): T {
        return this.createEntity().add(ctor);
    }
}
