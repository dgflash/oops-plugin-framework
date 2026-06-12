import { ecs } from './ECS';
import type { ECSWorld } from './world/ECSWorld';

/**
 * ECS 驱动器：驱动默认世界的 ECS。
 * 系统调度经 `world.root`（add / init / execute）；多世界同理。
 */
export class ECSDriver {
    /** 是否已完成 init */
    private _inited = false;

    /** 默认世界 */
    get world(): ECSWorld {
        return ecs.world.default();
    }

    /** 默认世界的根系统 */
    get root(): ecs.RootSystem {
        return this.world.root;
    }

    /**
     * 向默认世界添加业务系统（在 Root.initEcsSystem 钩子中调用）。
     * @param system 组合系统实例
     */
    add(system: ecs.ComblockSystem): this {
        this.world.root.add(system);
        return this;
    }

    /** 初始化 ECS：并入 @ecs.register 注册的系统、绑定世界、拓扑排序并 init */
    init(): void {
        this.world.root.init();
        this._inited = true;
    }

    /**
     * 驱动默认世界 ECS 一帧。
     * @param dt 帧间隔（秒）
     */
    execute(dt: number): void {
        if (!this._inited) return;
        this.world.root.execute(dt);
    }

    /** 清理所有子系统（根系统壳保留，可再次 init） */
    destroy(): void {
        this.world.root.clear();
        this._inited = false;
    }
}
