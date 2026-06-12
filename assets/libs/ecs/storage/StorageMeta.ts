import type { SoAArrayKind } from './StorageTypes';

/** 组件构造器上的 SoA 元数据 */
export interface SoAMeta {
    /** 是否启用 SoA 列存储 */
    __enableSoA?: boolean;
    /** 显式声明的 SoA 字段及 TypedArray 类型 */
    __soaFields?: Map<string, SoAArrayKind>;
}

/** 获取或创建组件构造器上的 SoA 字段表 */
export function ensureSoAFields(target: object): Map<string, SoAArrayKind> {
    const ctor = (target as { constructor: SoAMeta }).constructor;
    if (!ctor.__soaFields) ctor.__soaFields = new Map();
    return ctor.__soaFields;
}

/** 组件类型是否启用 SoA */
export function isSoAEnabled(ctor: { tid: number }): boolean {
    return (ctor as unknown as SoAMeta).__enableSoA === true;
}

/** 获取组件类型显式声明的 SoA 字段表 */
export function getSoAFields(ctor: object): Map<string, SoAArrayKind> | undefined {
    return (ctor as SoAMeta).__soaFields;
}
