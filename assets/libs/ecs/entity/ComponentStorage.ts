import type { CompCtor, IComp } from '../registry/ECSTypes';
import type { ECSWorld } from '../world/ECSWorld';

/**
 * 组件存储提供者端口（依赖倒置）。
 *
 * 核心默认以 AoS（对象池）方式创建/回收组件，对存储细节零认知。
 * 可选的列式存储（SoA）由 storage/ 模块实现本接口并通过 {@link setStorageProvider} 注入，
 * 从而让 storage 成为「可插拔插件」——核心不 import storage，删除 storage 也不影响基础 ECS。
 *
 * 约定：`handles(ctor)` 返回 false 的组件一律走核心 AoS 路径，提供者完全不介入。
 */
export interface IComponentStorageProvider {
    /** 该组件类型是否由本提供者接管存储（true 时 acquire/release 交给提供者） */
    handles(ctor: CompCtor<IComp>): boolean;

    /** 为实体分配并返回组件实例（如 SoA 的列槽位 + Proxy 视图） */
    acquire(world: ECSWorld, eid: number, ctor: CompCtor<IComp>): IComp;

    /** 释放实体在该组件类型上占用的存储（如 SoA 列槽位） */
    release(world: ECSWorld, eid: number, ctor: CompCtor<IComp>): void;

    /** 清空某个世界的全部托管存储（world.clear 时调用） */
    clearWorld(world: ECSWorld): void;
}

/** 当前注入的存储提供者；未注入（纯 AoS）时为 null */
let provider: IComponentStorageProvider | null = null;

/**
 * 注入组件存储提供者（由 storage/ 模块在加载时调用）。
 * 传 null 可解除注入，退回纯 AoS。
 */
export function setStorageProvider(p: IComponentStorageProvider | null): void {
    provider = p;
}

/** 获取当前存储提供者（核心据此决定组件走 AoS 还是托管存储） */
export function getStorageProvider(): IComponentStorageProvider | null {
    return provider;
}
