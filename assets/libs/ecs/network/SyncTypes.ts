/** 同步字段类型 */
export enum SyncType {
    /** 布尔 */
    Bool = 0,
    /** 有符号 8 位整数 */
    Int8 = 1,
    /** 无符号 8 位整数 */
    Uint8 = 2,
    /** 有符号 16 位整数 */
    Int16 = 3,
    /** 无符号 16 位整数 */
    Uint16 = 4,
    /** 有符号 32 位整数 */
    Int32 = 5,
    /** 无符号 32 位整数 */
    Uint32 = 6,
    /** 32 位浮点数 */
    Float32 = 7,
    /** 64 位浮点数 */
    Float64 = 8,
    /** 字符串 */
    String = 9
}

/** 同步操作类型 */
export enum SyncOp {
    /** 全量（所有字段） */
    Full = 0,
    /** 增量（仅脏字段） */
    Delta = 1
}

/** 单个同步字段的元数据 */
export interface SyncField {
    /** 字段名 */
    name: string;
    /** 同步类型 */
    type: SyncType;
    /** 字段在同步列表中的索引 */
    index: number;
}

/** 组件类型上的同步元数据键 */
export const SYNC_FIELDS = '__ecsSyncFields';
