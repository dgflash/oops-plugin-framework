import { registry } from '../registry/ECSTypeRegistry';
import { worldCurrent } from '../world/ECSWorldCurrent';
import type { ECSWorld } from '../world/ECSWorld';
import { ECSComblockSystem } from './ECSComblockSystem';
import { sortSystemsByDependencies } from './SystemScheduler';

/**
 * 根System，对游戏中的System遍历从这里开始。
 * 一个世界至多一个 RootSystem；需要并行隔离时应横向扩展「世界」，每个世界各持一个根。
 */
export class ECSRootSystem {
    /** 摊平后的可执行系统列表（按添加顺序遍历） */
    private executeSystemFlows: ECSComblockSystem[] = [];
    /** 可执行系统数量缓存，避免 execute 时重复读取 length */
    private systemCnt = 0;
    /** 已完成 bindWorld 的系统数量（增量绑定游标，避免每帧重复绑定） */
    private boundCount = 0;
    /** 本根系统所驱动的世界（由 {@link ECSWorld} 构造时注入，一世界一根、伴生创建） */
    private readonly world: ECSWorld;

    /** @internal 仅由 {@link ECSWorld} 构造时创建，业务请用 world.root.add */
    constructor(world: ECSWorld) {
        this.world = world;
    }

    /**
     * 添加一个系统到执行流
     * @param system 业务系统实例
     */
    add(system: ECSComblockSystem) {
        this.executeSystemFlows.push(system);
        this.systemCnt = this.executeSystemFlows.length;
        return this;
    }

    /**
     * 依次调用各系统的 init，并按依赖关系拓扑排序执行顺序。
     * @param autoRegisterDecorated 是否自动并入由 @ecs.register 全局注册的系统（默认 true，
     *        兼容单世界用法）。多世界/动态房间下用 ecs.world.createSystems 显式装配时传 false，
     *        避免把默认世界的装饰器系统重复并入。
     */
    init(autoRegisterDecorated: boolean = true) {
        if (autoRegisterDecorated) {
            // 装饰器注册的是「系统类」：在本根系统所属世界中按需实例化，保证每世界独立实例
            registry.systems.forEach((ctors) => this.instantiate(ctors));
            this.world.systems.forEach((ctors) => this.instantiate(ctors));
        }

        this.executeSystemFlows = sortSystemsByDependencies(this.executeSystemFlows);
        this.systemCnt = this.executeSystemFlows.length;

        // 先把每个系统绑定到本根系统所属世界（创建分组、回填已有实体），再执行各自 init
        this.executeSystemFlows.forEach((sys) => sys.bindWorld(this.world));
        this.executeSystemFlows.forEach((sys) => sys.init());
        this.boundCount = this.systemCnt;
    }

    /** 实例化一组系统类并加入执行流 */
    private instantiate(ctors: Array<new () => ECSComblockSystem>): void {
        for (let i = 0; i < ctors.length; i++) {
            this.add(new ctors[i]());
        }
    }

    /**
     * 驱动所有子系统执行一帧逻辑
     * @param dt 帧间隔时间（秒）
     */
    execute(dt: number) {
        const prev = worldCurrent.current!;
        worldCurrent.current = this.world;
        // 兼容未调用 init() 的用法（如 root.add(sys) 后直接 execute）：仅绑定尚未绑定的新系统。
        // 增量游标避免每帧重复遍历——稳定运行后 boundCount === systemCnt，此循环零开销。
        for (let i = this.boundCount; i < this.systemCnt; i++) {
            this.executeSystemFlows[i].bindWorld(this.world);
        }
        this.boundCount = this.systemCnt;
        this.world.epoch++;
        for (let i = 0; i < this.systemCnt; i++) {
            this.executeSystemFlows[i].tick(dt);
        }
        if (this.world.commands.size > 0) this.world.commands.flush();
        worldCurrent.current = prev;
    }

    /** 销毁所有子系统并清空执行列表，同时解除与所属世界的关联 */
    clear(): void {
        const len = this.executeSystemFlows.length;
        for (let i = 0; i < len; i++) {
            this.executeSystemFlows[i].onDestroy();
        }
        this.executeSystemFlows.length = 0;
        this.systemCnt = 0;
        this.boundCount = 0;
    }
}
