import type { CompCtor, IComp } from '../registry/ECSTypes';
import { ecsWorldManager } from '../world/ECSWorldManager';
import { getSoAStorageAccessor } from './StorageAccessor';
import { ensureSoAFields, isSoAEnabled, type SoAMeta } from './StorageMeta';
import type { StorageSoA } from './StorageSoA';
import type { SoAArrayKind } from './StorageTypes';

/** 创建指定 TypedArray 类型的 SoA 字段装饰器 */
function makeFieldDecorator(kind: SoAArrayKind) {
    return function (target: object, propertyKey: string): void {
        ensureSoAFields(target).set(propertyKey, kind);
    };
}

/**
 * 类装饰器：为组件启用 SoA（Structure of Arrays）列存储。
 *
 * 默认所有组件走 AoS（对象池）。仅当标记 @ecs.storage.enableSoA 时，
 * 其数值/布尔字段会被存入 TypedArray，适合大规模同构实体的批量计算。
 * `entity.add/get` 仍返回「像组件一样的对象」（Proxy 视图），API 不变。
 */
export function enableSoA<T>(target: CompCtor<T>): CompCtor<T> {
    (target as unknown as SoAMeta).__enableSoA = true;
    return target;
}

/** 字段装饰器：Float64Array 列存储（高精度） */
export const float64 = makeFieldDecorator('float64');
/** 字段装饰器：Float32Array 列存储（默认浮点） */
export const float32 = makeFieldDecorator('float32');
/** 字段装饰器：Int32Array 列存储 */
export const int32 = makeFieldDecorator('int32');
/** 字段装饰器：Uint32Array 列存储 */
export const uint32 = makeFieldDecorator('uint32');
/** 字段装饰器：Int16Array 列存储 */
export const int16 = makeFieldDecorator('int16');
/** 字段装饰器：Uint16Array 列存储 */
export const uint16 = makeFieldDecorator('uint16');
/** 字段装饰器：Int8Array 列存储 */
export const int8 = makeFieldDecorator('int8');
/** 字段装饰器：Uint8Array 列存储 */
export const uint8 = makeFieldDecorator('uint8');

/** 获取某 SoA 组件的列存储（非 SoA 组件返回 undefined） */
function getSoAStorage<T extends IComp>(ctor: CompCtor<T>): StorageSoA<T> | undefined {
    const accessor = getSoAStorageAccessor();
    if (!isSoAEnabled(ctor) || !accessor) return undefined;
    return accessor.managerFor(ecsWorldManager.current).getStorage(ctor);
}

/** 存储策略 API 集合（`ecs.storage` 即此对象） */
export const ecsStorage = {
    /** 类装饰器：为组件启用 SoA 列存储（默认 AoS，opt-in） */
    enableSoA,
    /** 字段装饰器：Float64Array 列存储 */
    float64,
    /** 字段装饰器：Float32Array 列存储 */
    float32,
    /** 字段装饰器：Int32Array 列存储 */
    int32,
    /** 字段装饰器：Uint32Array 列存储 */
    uint32,
    /** 字段装饰器：Int16Array 列存储 */
    int16,
    /** 字段装饰器：Uint16Array 列存储 */
    uint16,
    /** 字段装饰器：Int8Array 列存储 */
    int8,
    /** 字段装饰器：Uint8Array 列存储 */
    uint8,
    /** 获取某 SoA 组件的列存储（非 SoA 组件返回 undefined） */
    getSoAStorage,
};
