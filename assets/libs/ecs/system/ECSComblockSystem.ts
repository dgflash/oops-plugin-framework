import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { ECSGroup } from '../query/ECSGroup';
import type { ECSWorld } from '../world/ECSWorld';

/** 继承此类实现具体业务逻辑的系统 */
export abstract class ECSComblockSystem<E extends ECSEntity = ECSEntity> {
    /** 注册标记：@ecs.register 据此识别为系统类而非实体/组件 */
    static s = true;

    /** 当前系统关注的实体分组 */
    protected group!: ECSGroup<E>;
    /** 本帧增量时间（秒），在 execute 流程中赋值 */
    protected dt = 0;

    /**
     * 执行间隔（秒）。0 表示每帧执行；>0 时按固定间隔执行（构造后赋值，如 `this.interval = 0.5`）。
     * 间隔触发时传入 update 的 dt 为累计的实际经过时间，保证按时间积分的逻辑正确。
     */
    protected interval = 0;
    /** 间隔累计器（秒），用于 interval > 0 时判断是否到达触发时机 */
    private _intervalAcc = 0;

    /** 本帧新进入分组的实体映射（eid → 实体），供 entityEnter 消费 */
    private enteredEntities: Map<number, E> | null = null;
    /** 本帧从分组移除的实体映射（eid → 实体），供 entityRemove 消费 */
    private removedEntities: Map<number, E> | null = null;

    /** 子类是否实现了 entityEnter 生命周期钩子 */
    private hasEntityEnter = false;
    /** 子类是否实现了 entityRemove 生命周期钩子 */
    private hasEntityRemove = false;
    /** 子类是否实现了 update 更新钩子 */
    private hasUpdate = false;
    /** 子类是否实现了 firstUpdate 钩子（被动系统除外），bindWorld 时据此包裹 execute */
    private hasFirstUpdate = false;
    /** 是否已绑定世界（避免重复绑定 group / 重复包裹 firstUpdate） */
    private bound = false;

    /** firstUpdate 阶段完成后恢复的真实 execute 实现 */
    private tmpExecute: ((dt: number) => void) | null = null;
    /** 当前帧实际调用的 execute 分发函数（execute0 / execute1 / updateOnce） */
    private execute!: (dt: number) => void;

    /**
     * 构造函数：只探测子类实现了哪些钩子并选定 execute 变体。
     *
     * 注意：分组（group）不在此创建——group 必须绑定到「系统实际运行的世界」，
     * 而构造时机（尤其是 @ecs.register 装饰器在模块加载期 new）无法确定目标世界。
     * 因此 group 的创建推迟到 {@link bindWorld}，由 RootSystem.init 按其所属世界调用。
     */
    constructor() {
        const hasOwnProperty = Object.hasOwnProperty;
        const prototype = Object.getPrototypeOf(this);
        const hasEntityEnter = hasOwnProperty.call(prototype, 'entityEnter');
        const hasEntityRemove = hasOwnProperty.call(prototype, 'entityRemove');
        const hasFirstUpdate = hasOwnProperty.call(prototype, 'firstUpdate');
        const hasUpdate = hasOwnProperty.call(prototype, 'update');

        // 被动系统不参与每帧 update / firstUpdate，只通过 entityEnter/entityRemove 响应实体变化
        const passive = this.isPassiveSystem();

        this.hasEntityEnter = hasEntityEnter;
        this.hasEntityRemove = hasEntityRemove;
        this.hasUpdate = hasUpdate && !passive;
        this.hasFirstUpdate = hasFirstUpdate && !passive;

        if (hasEntityEnter || hasEntityRemove) {
            this.enteredEntities = new Map<number, E>();
            this.removedEntities = new Map<number, E>();
            this.execute = this.execute1;
        }
        else {
            this.execute = this.execute0;
        }
    }

    /**
     * 将系统绑定到指定世界并创建分组（由 RootSystem.init 调用，幂等）。
     *
     * - 分组建在传入世界上，使系统只遍历该世界的实体（修复多世界下 group 绑错世界的问题）。
     * - 回填该世界中「绑定前已存在」的匹配实体，保证 init 晚于建实体时也能查询到
     *   （含 entityEnter：这些实体会进入 enteredEntities，首次 execute 时触发 entityEnter）。
     * @param world 系统所属世界
     */
    bindWorld(world: ECSWorld): void {
        if (this.bound) return;
        this.bound = true;

        this.group = world.groups.createGroup<E>(this.filter());
        if (this.enteredEntities) {
            this.group.watchEntityEnterAndRemove(this.enteredEntities, this.removedEntities!);
        }
        // 回填绑定前已存在的匹配实体
        world.entities.forEach((entity) => this.group.onComponentAddOrRemove(entity as unknown as E));

        if (this.hasFirstUpdate) {
            this.tmpExecute = this.execute;
            this.execute = this.updateOnce;
        }
    }

    /**
     * 是否为被动系统：返回 true 时不参与每帧 update / firstUpdate，
     * 仅通过 entityEnter / entityRemove 响应实体变化。
     * 也可不覆写此方法、仅实现 entityEnter/entityRemove 而不实现 update，效果相同。
     */
    protected isPassiveSystem(): boolean {
        return false;
    }

    /** 清理系统资源 */
    protected cleanup(): void {
        this.enteredEntities?.clear();
        this.removedEntities?.clear();
    }

    /** 系统实始化 */
    init(): void {

    }

    /** 系统释放事件 */
    onDestroy(): void {

    }

    /** 是否存在实体 */
    hasEntity(): boolean {
        return this.group.count > 0;
    }

    /**
     * 先执行entityEnter，最后执行firstUpdate
     * @param dt
     * @returns
     */
    private updateOnce(dt: number): void {
        if (this.group.count === 0) {
            return;
        }

        this.dt = dt;

        if (this.enteredEntities && this.enteredEntities.size > 0) {
            if (this.hasEntityEnter) {
                // 直接方法调用（而非 fn.call）以保留 V8 内联，热路径性能约 3x
                const self = this as unknown as ecs.IEntityEnterSystem<E>;
                const iterator = this.enteredEntities.values();
                let result = iterator.next();
                while (!result.done) {
                    self.entityEnter(result.value);
                    result = iterator.next();
                }
            }
            this.enteredEntities.clear();
        }

        const self = this as unknown as ecs.ISystemFirstUpdate<E>;
        const entities = this.group.matchEntities;
        const len = entities.length;
        for (let i = 0; i < len; i++) {
            self.firstUpdate(entities[i]);
        }

        this.execute = this.tmpExecute!;
        this.execute(dt);
        this.tmpExecute = null;
    }

    /**
     * 只执行update
     * @param dt
     * @returns
     */
    private execute0(dt: number): void {
        if (this.group.count === 0) return;

        this.dt = dt;

        if (this.hasUpdate) {
            // 直接方法调用（而非 fn.call）以保留 V8 内联，热路径性能约 3x
            const self = this as unknown as ecs.ISystemUpdate<E>;
            const entities = this.group.matchEntities;
            const len = entities.length;
            for (let i = 0; i < len; i++) {
                self.update(entities[i]);
            }
        }
    }

    /**
     * 先执行entityRemove，再执行entityEnter，最后执行update
     * @param dt
     * @returns
     */
    private execute1(dt: number): void {
        if (this.removedEntities && this.removedEntities.size > 0) {
            if (this.hasEntityRemove) {
                const self = this as unknown as ecs.IEntityRemoveSystem<E>;
                const iterator = this.removedEntities.values();
                let result = iterator.next();
                while (!result.done) {
                    self.entityRemove(result.value);
                    result = iterator.next();
                }
            }
            this.removedEntities.clear();
        }

        if (this.group.count === 0) return;

        this.dt = dt;

        if (this.enteredEntities && this.enteredEntities.size > 0) {
            if (this.hasEntityEnter) {
                const self = this as unknown as ecs.IEntityEnterSystem<E>;
                const iterator = this.enteredEntities.values();
                let result = iterator.next();
                while (!result.done) {
                    self.entityEnter(result.value);
                    result = iterator.next();
                }
            }
            this.enteredEntities.clear();
        }

        if (this.hasUpdate) {
            // 直接方法调用（而非 fn.call）以保留 V8 内联，热路径性能约 3x
            const self = this as unknown as ecs.ISystemUpdate<E>;
            const entities = this.group.matchEntities;
            const len = entities.length;
            for (let i = 0; i < len; i++) {
                self.update(entities[i]);
            }
        }
    }

    /**
     * 根系统每帧调用入口：先做间隔门控，再分发到当前 execute 变体。
     * interval 为 0 时等价于每帧直接 execute；interval > 0 时累计到间隔才触发，
     * 并把累计的实际经过时间作为 dt 传下去。
     * @param dt 本帧间隔时间（秒）
     */
    tick(dt: number): void {
        if (this.interval > 0) {
            this._intervalAcc += dt;
            if (this._intervalAcc < this.interval) return;
            dt = this._intervalAcc;
            this._intervalAcc = 0;
        }
        this.execute(dt);
    }

    /**
     * 实体过滤规则
     *
     * 根据提供的组件过滤实体。
     */
    abstract filter(): ecs.IMatcher;
}
