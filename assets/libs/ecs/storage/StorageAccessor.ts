import type { CompCtor, IComp } from '../registry/ECSTypes';
import type { ECSWorld } from '../world/ECSWorld';
import type { StorageSoA } from './StorageSoA';

/** SoA 列存储访问器（由 StorageSoA 模块加载时注入，避免循环依赖） */
export interface SoAStorageAccessor {
    managerFor(world: ECSWorld): { getStorage<T extends IComp>(ctor: CompCtor<T>): StorageSoA<T> };
}

let accessor: SoAStorageAccessor | null = null;

/** 注册 SoA 列存储访问器（StorageSoA 模块加载时调用） */
export function bindSoAStorageAccessor(value: SoAStorageAccessor): void {
    accessor = value;
}

/** 获取已注册的 SoA 列存储访问器 */
export function getSoAStorageAccessor(): SoAStorageAccessor | null {
    return accessor;
}
