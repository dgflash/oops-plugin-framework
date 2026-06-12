import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { CompCtor, EntityCtor } from './ECSTypes';

/**
 * 类型注册表 —— 记录"框架里存在哪些类型"（组件 / 实体 / 系统），跨世界共享、单进程唯一。
 *
 * 这里存的是类型元数据，与某个 {@link ECSWorld} 里有哪些实体实例无关：
 * - 组件 tid 直接写在组件构造函数上（`ctor.tid`），所有世界必须一致，因此类型注册天然全局。
 * - 实体 / 系统注册同理，按名登记一次，全世界通用。
 *
 * 运行期的实体数据（实体表 / 分组 / SoA / eid / 命令缓冲 / epoch）不在这里，而是每个 ECSWorld 各持一份。
 */
export class ECSTypeRegistry {
    /** 实体构造函数 -> 注册名 */
    readonly entityCtors: Map<EntityCtor<ECSEntity>, string> = new Map();

    /** 组件类型 id 自增计数器（下一个待分配的 tid） */
    compTid = 0;

    /** 组件构造函数表（按 tid 下标索引），ecs.register 注册时写入 */
    readonly compCtors: CompCtor<ecs.IComp>[] = [];

    /**
     * 系统注册表（注册名 -> 该名下的系统类列表）。
     * 存「类」而非「实例」：实例由各世界的 RootSystem.init 按需 new 并绑定到所属世界，
     * 从而支持同一套全局系统在多个世界各自拥有独立实例与分组。
     */
    readonly systems: Map<string, Array<new () => ecs.ComblockSystem>> = new Map();

    /**
     * 组件位掩码所需的 32 位字数（= ⌊compTid/32⌋ + 1）。
     * 供 {@link ECSMask} 构造时确定底层 Uint32Array 长度，避免 ECSMask 反向依赖全局计数。
     */
    get maskWordCount(): number {
        return (this.compTid >>> 5) + 1;
    }
}

/** 全局唯一的类型注册表实例 */
export const registry = new ECSTypeRegistry();
