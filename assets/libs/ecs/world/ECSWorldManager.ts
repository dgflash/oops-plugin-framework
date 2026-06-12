import { registry } from '../registry/ECSTypeRegistry';
import type { ECSComblockSystem } from '../system/ECSComblockSystem';
import { ECSRootSystem } from '../system/ECSRootSystem';
import { ECSWorld } from './ECSWorld';

/**
 * 世界管理器 —— 持有所有 {@link ECSWorld} 实例与「当前世界」指针，并作为 `ecs.world` 对外暴露。
 *
 * - 类型注册表（组件 / 实体 / 系统）见 {@link ECSTypeRegistry}（跨世界共享）。
 * - 运行期数据（实体表 / 分组 / eid / SoA / 命令缓冲 / epoch / 唯一 RootSystem）见 {@link ECSWorld}（每世界一份）。
 *
 * 未显式指定世界的操作都作用于 `current`；默认即默认世界。
 * 全局唯一实例由本文件底部的 {@link ecsWorldManager} 提供（与 {@link registry} 同一模式）。
 */
export class ECSWorldManager {
    /** 默认世界名称 */
    readonly DEFAULT_WORLD = '__default__';

    /** 所有世界（含默认世界），按名称索引 */
    readonly worlds: Map<string, ECSWorld> = new Map();

    /** 默认世界（不指定世界时使用） */
    readonly defaultWorld: ECSWorld;

    /** 当前世界（未指定世界的操作都作用于此） */
    current: ECSWorld;

    constructor() {
        this.defaultWorld = new ECSWorld(this.DEFAULT_WORLD);
        this.worlds.set(this.DEFAULT_WORLD, this.defaultWorld);
        this.current = this.defaultWorld;
    }

    /**
     * 解析世界参数：不传 → 当前世界；传字符串 → 按名获取或创建；传 ECSWorld → 原样返回。
     * @param world 目标世界（不传则当前世界）
     */
    resolve(world?: ECSWorld | string): ECSWorld {
        if (world == null) return this.current;
        return typeof world === 'string' ? this.getOrCreate(world) : world;
    }

    /** 获取或创建一个世界（不传名返回默认世界） */
    get(name?: string): ECSWorld {
        if (name == null) return this.defaultWorld;
        return this.getOrCreate(name);
    }

    /** 获取默认世界 */
    default(): ECSWorld {
        return this.defaultWorld;
    }

    /**
     * 切换当前世界（之后未指定 world 参数的操作都作用于此世界）。
     * @returns 切换前的世界（可用于稍后还原）
     */
    use(world: ECSWorld | string): ECSWorld {
        const prev = this.current;
        this.current = this.resolve(world);
        return prev;
    }

    /**
     * 在指定世界中执行一段逻辑，执行完自动还原当前世界。
     */
    inWorld<R>(world: ECSWorld | string, fn: () => R): R {
        const prev = this.current;
        this.current = this.resolve(world);
        try {
            return fn();
        }
        finally {
            this.current = prev;
        }
    }

    /** 列出所有世界实例（含默认世界） */
    all(): ECSWorld[] {
        return Array.from(this.worlds.values());
    }

    /** 清理指定世界（不传则当前世界） */
    clear(world?: ECSWorld | string): void {
        this.resolve(world).clear();
    }

    /**
     * 销毁并移除一个具名世界（不可移除默认世界）。
     * 会先销毁该世界的唯一 RootSystem（触发各系统 onDestroy），再清空世界数据。
     * 若移除的是当前世界，则当前世界自动回退为默认世界。
     */
    remove(name: string): boolean {
        if (name === this.DEFAULT_WORLD) {
            console.warn('[ECS] 默认世界不可移除');
            return false;
        }
        const target = this.worlds.get(name);
        if (!target) return false;
        target.root.clear();
        target.clear();
        if (this.current === target) {
            this.current = this.defaultWorld;
        }
        this.worlds.delete(name);
        return true;
    }

    /**
     * 为指定世界批量装配系统并完成依赖排序与 init。
     * @returns 该世界的根系统（便于直接 execute / clear）
     */
    createSystems(
        world: ECSWorld | string,
        ...systemCtors: Array<new () => ECSComblockSystem>
    ): ECSRootSystem {
        const target = this.resolve(world);
        return this.inWorld(target, () => {
            for (let i = 0; i < systemCtors.length; i++) {
                target.root.add(new systemCtors[i]());
            }
            target.root.init(false);
            return target.root;
        });
    }

    /**
     * 将结构变更推入当前世界命令缓冲；帧末由 RootSystem.execute 统一应用。
     */
    defer(fn: () => void): void {
        this.current.commands.push(fn);
    }

    /** 立即 flush 当前世界命令缓冲（一般无需手动调用） */
    flushCommands(): void {
        this.current.commands.flush();
    }

    /**
     * 获取或创建一个具名世界（新世界会预建所有已注册组件的回调槽）
     * @param name 世界名称
     */
    getOrCreate(name: string): ECSWorld {
        let world = this.worlds.get(name);
        if (!world) {
            world = new ECSWorld(name);
            for (let tid = 0; tid < registry.compTid; tid++) {
                world.groups.ensureCompSlot(tid);
            }
            this.worlds.set(name, world);
        }
        return world;
    }

    /**
     * 注册一个组件 tid 的回调槽到所有世界（组件注册时调用）
     * @param tid 组件类型id
     */
    registerComponentSlot(tid: number): void {
        this.worlds.forEach((world) => world.groups.ensureCompSlot(tid));
    }
}

/** 全局唯一的世界管理器实例（`ecs.world` 即此对象） */
export const ecsWorldManager = new ECSWorldManager();
