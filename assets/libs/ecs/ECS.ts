import { ECSComp } from './component/ECSComp';
import { ECSEntity } from './entity/ECSEntity';
import type {
    CompCtor,
    CompType,
    EntityCtor,
    IComp as _IComp,
    IMatcher as _IMatcher,
    IEntityEnterSystem as _IEntityEnterSystem,
    IEntityRemoveSystem as _IEntityRemoveSystem,
    ISystemFirstUpdate as _ISystemFirstUpdate,
    ISystemUpdate as _ISystemUpdate,
} from './registry/ECSTypes';
import { ECSComblockSystem } from './system/ECSComblockSystem';
import { ECSRootSystem } from './system/ECSRootSystem';
import { register as registerDecorator } from './registry/ECSRegister';
import { ecsPoolCoordinator } from './pool/ECSPoolManager';
import { ECSMatcher } from './query/ECSMatcher';
import { ecsSystemScheduler } from './system/SystemScheduler';
import { ecsWorldManager } from './world/ECSWorldManager';
import { ecsStorage } from './storage/StorageDecorators';
import './storage/StorageSoA';
import { ecsNetwork } from './network/NetworkSync';
import { ecsSerialize } from './serialize/Serialization';
import { ECSWorld } from './world/ECSWorld';
import { entityRefDecorator } from './reference/ECSEntityRef';

/**
 * ECSEntity对象在destroy后，会回收到ECSPoolManager动态对象池中
 * ECSComp对象从ECSEntity.remove后，数据组件会回收到ECSPoolManager动态对象池中
 */

/**
 * Entity-Component-System（实体-组件-系统）框架
 * 文档：https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12033388&doc_id=2873565
 */
export namespace ecs {
    //#region 核心类型

    /** 实体 - 一个概念上的定义，指的是游戏世界中的一个独特物体，是一系列组件的集合 */
    export type Entity = ECSEntity;
    /** 组件 - 一堆数据的集合，即不存在任何的行为，只用来存储状态 */
    export type Comp = ECSComp;
    /** 根系统 - 驱动游戏中所有系统工作 */
    export type RootSystem = ECSRootSystem;
    /** 处理游戏逻辑系统对象 - 继承此对象实现自定义业务逻辑 */
    export type ComblockSystem = ECSComblockSystem;
    /** 实体 - 一个概念上的定义，指的是游戏世界中的一个独特物体，是一系列组件的集合 */
    export const Entity = ECSEntity;
    /** 组件 - 一堆数据的集合，即不存在任何的行为，只用来存储状态 */
    export const Comp = ECSComp;
    /** 根系统 - 驱动游戏中所有系统工作 */
    export const RootSystem = ECSRootSystem;
    /** 处理游戏逻辑系统对象 - 继承此对象实现自定义业务逻辑 */
    export const ComblockSystem = ECSComblockSystem;

    //#endregion

    //#region 接口（定义见 ECSTypes，这里仅别名再导出，供业务以 ecs.IXxx 使用）

    /**
     * 组件接口 - 一堆数据的集合，挂载在实体上
     * @example
    export class RoleUpgradeSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem {
        filter(): ecs.IMatcher {
            return ecs.allOf(RoleUpgradeComp, RoleModelLevelComp);
        }

        entityEnter(e: Role): void {
            e.remove(RoleUpgradeComp);
        }
    }
     */
    export type IComp = _IComp;
    /** 实体匹配器接口 */
    export type IMatcher = _IMatcher;
    /** 监听组件首次添加到实体上时，在 ComblockSystem 上实现这个接口 */
    export type IEntityEnterSystem<E extends Entity = Entity> = _IEntityEnterSystem<E>;
    /** 监听组件从实体上移除时，在 ComblockSystem 上实现这个接口 */
    export type IEntityRemoveSystem<E extends Entity = Entity> = _IEntityRemoveSystem<E>;
    /** 监听系统第一次执行 update 处理实体时，在 ComblockSystem 上实现这个接口 */
    export type ISystemFirstUpdate<E extends Entity = Entity> = _ISystemFirstUpdate<E>;
    /** 监听系统执行 update 处理实体时，在 ComblockSystem 上实现这个接口 */
    export type ISystemUpdate<E extends Entity = Entity> = _ISystemUpdate<E>;

    //#endregion

    //#region 实体引用（@entityRef）

    /**
     * 属性装饰器：标记组件属性为实体引用（目标实体销毁时自动置 null）。
     * @example `@ecs.entityRef() target: ecs.Entity | null`
     */
    export const entityRef = entityRefDecorator;

    //#endregion

    //#region 注册 / 实体 / 查询 / 清理

    /** 类装饰器工厂：注册组件 / 实体 / 系统（`@ecs.register('Name')`） */
    export const register = registerDecorator;

    /**
     * 创建一个新的实体对象或从缓存中获取一个实体对象（使用动态池）
     * @param ctor  实体类
     * @param world 目标世界（不传则使用当前世界 / 默认世界）
     */
    export function getEntity<T extends Entity>(ctor: EntityCtor<T>, world?: ECSWorld | string): T {
        return ecsWorldManager.resolve(world).getEntity(ctor);
    }

    /**
     * 动态查询实体
     * @param matcher 匹配器
     */
    export function query<E extends Entity = Entity>(matcher: IMatcher, world?: ECSWorld | string): E[] {
        const target = ecsWorldManager.resolve(world);
        return target.groups.query<E>(target.entities, matcher as ECSMatcher);
    }

    //#endregion

    //#region 过滤器

    /** 必须同时拥有指定组件（相同组合全局复用同一 Matcher） */
    export function allOf(...args: CompType<IComp>[]): IMatcher {
        return ECSMatcher.compose((m) => m.allOf(...args));
    }

    /** 拥有任意一个指定组件（相同组合全局复用同一 Matcher） */
    export function anyOf(...args: CompType<IComp>[]): IMatcher {
        return ECSMatcher.compose((m) => m.anyOf(...args));
    }

    /** 只拥有指定组件（相同组合全局复用同一 Matcher） */
    export function onlyOf(...args: CompType<IComp>[]): IMatcher {
        return ECSMatcher.compose((m) => m.onlyOf(...args));
    }

    /** 不包含指定组件（相同组合全局复用同一 Matcher） */
    export function excludeOf(...args: CompType<IComp>[]): IMatcher {
        return ECSMatcher.compose((m) => m.excludeOf(...args));
    }

    //#endregion

    //#region 单例组件

    /**
     * 获取单例组件（取不到则自动创建其宿主实体并挂载）
     * @param ctor  组件类
     * @param world 目标世界（不传则使用当前世界 / 默认世界）
     */
    export function getSingleton<T extends IComp>(ctor: CompCtor<T>, world?: ECSWorld | string): T {
        return ecsWorldManager.resolve(world).getSingleton(ctor);
    }

    /**
     * 注册外部已构造的单例组件
     * @param obj   组件实例
     * @param world 目标世界（不传则使用当前世界 / 默认世界）
     */
    export function addSingleton(obj: IComp, world?: ECSWorld | string): void {
        ecsWorldManager.resolve(world).addSingleton(obj);
    }

    //#endregion

    //#region 世界（World）管理

    /**
     * 多世界管理集合（多世界隔离 / 动态房间 / 多场景）：
     * - 每个世界伴生一个 RootSystem（`world.root`）；实体操作见 `world.getEntity` / `getSingleton` 等。
     * - `ecs.world.get(name?)`                 获取或创建世界（不传名返回默认世界）
     * - `ecs.world.default()`                  获取默认世界
     * - `ecs.world.current`                  获取当前世界
     * - `ecs.world.use(w)`                     切换当前世界，返回切换前的世界
     * - `ecs.world.inWorld(w, fn)`             在指定世界中执行 fn，结束后自动还原当前世界
     * - `ecs.world.all()`                      列出所有世界实例（含默认世界）
     * - `ecs.world.remove(name)`               销毁根系统并移除具名世界（不可移除默认世界）
     * - `ecs.world.createSystems(w, ...ctors)` 为指定世界创建唯一 RootSystem 并装配系统
     * - `ecs.world.defer(fn)`                    延迟结构变更，帧末由 RootSystem.execute 统一应用
     * - `ecs.world.flushCommands()`              立即 flush 当前世界命令缓冲
     */
    export const world = ecsWorldManager;

    //#endregion

    //#region 对象池

    /**
     * 对象池管理（实体 / 组件动态池 + Mask 位掩码池）：
     * - `ecs.pool.getPool(name, factory)`   获取或创建指定类型池（框架内部常用）
     * - `ecs.pool.clearAll()`               清空所有实体 / 组件动态池
     * - `ecs.pool.clearPools()`             清空 Mask 池 + 所有动态池（不触碰存活数据）
     * - `ecs.pool.getAllMetrics()`          获取各池统计信息
     */
    export const pool = ecsPoolCoordinator;

    //#endregion

    //#region 系统调度（声明式执行顺序）

    /**
     * 系统调度装饰器集合（声明式执行顺序，拓扑排序 + 环检测）：
     * - `@ecs.system.executeBefore(类|类名)` 声明本系统须在指定系统之前执行
     * - `@ecs.system.executeAfter(类|类名)`  声明本系统须在指定系统之后执行（可用 'set:名' 依赖集合）
     * - `@ecs.system.inSet(名)`              把本系统加入集合（虚拟分组），供其他系统用 'set:名' 批量依赖
     */
    export const system = ecsSystemScheduler;

    //#endregion

    //#region 存储策略（默认 AoS，可选 SoA）

    /**
     * 存储策略集合（默认 AoS 对象池，可选 SoA 列存储）：
     * - `@ecs.storage.enableSoA` 类装饰器：为组件启用 SoA 列存储（opt-in）
     * - `@ecs.storage.float64/float32/int32/uint32/int16/uint16/int8/uint8` 字段装饰器：指定列的 TypedArray 类型
     * - `ecs.storage.getSoAStorage(ctor)` 获取某 SoA 组件的列存储（用于热点系统批处理）
     */
    export const storage = ecsStorage;

    //#endregion

    //#region 网络同步（@sync）

    /**
     * 网络同步集合（@sync 字段标记 / 编解码 / 世界级增量同步）：
     * - `@ecs.network.sync(类型)`              字段装饰器：标记组件字段参与网络同步
     * - `ecs.network.SyncType` / `ecs.network.SyncOp`  同步字段类型与操作类型枚举
     * - `ecs.network.net`                      网络同步门面（encodeWorld / applyToWorld / track / clearDirty）
     * - `ecs.network.SyncCodec`                底层同步编解码器
     * - `ecs.network.ByteWriter` / `ByteReader`  二进制读写缓冲
     * - `ecs.network.ensureSyncTracker(inst)`  为组件实例初始化变更追踪器
     * - `ecs.network.getSyncTracker(inst)`     获取组件实例的变更追踪器
     */
    export const network = ecsNetwork;

    //#endregion

    //#region 序列化 / 增量序列化

    /**
     * 序列化集合（全量 JSON + 增量快照/差分）：
     * - `@ecs.serialize.serialize()`         字段装饰器：标记组件需要持久化的字段
     * - `ecs.serialize.serializeWorld(pretty?)`  序列化当前世界为 JSON
     * - `ecs.serialize.deserializeWorld(json)`   从 JSON 反序列化到当前世界
     * - `ecs.serialize.snapshot()`               对当前世界拍快照（增量基线）
     * - `ecs.serialize.computeDelta(base)`       计算相对 base 快照的增量
     * - `ecs.serialize.applyDelta(delta)`        将增量应用到当前世界
     */
    export const serialize = ecsSerialize;

    //#endregion
}
