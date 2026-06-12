import type { ECSEntity } from './ECSEntity';

/** 世界实体表：eid -> 存活实体（登记/查找/遍历，不负责 eid 分配与销毁） */
export class ECSEntityTable {
    private readonly _map: Map<number, ECSEntity> = new Map();

    /** 登记实体（创建/取出时，以 entity.eid 为键） */
    track(entity: ECSEntity): void {
        this._map.set(entity.eid, entity);
    }

    /** 以指定 eid 登记实体（反序列化/状态恢复时保持编号一致） */
    set(eid: number, entity: ECSEntity): void {
        this._map.set(eid, entity);
    }

    /** 按 eid 获取实体 */
    get<E extends ECSEntity = ECSEntity>(eid: number): E | undefined {
        return this._map.get(eid) as E | undefined;
    }

    /** 是否存在指定 eid 的实体 */
    has(eid: number): boolean {
        return this._map.has(eid);
    }

    /** 移除 eid 登记（不触发实体销毁） */
    delete(eid: number): boolean {
        return this._map.delete(eid);
    }

    /** 遍历全部存活实体 */
    forEach(cb: (entity: ECSEntity, eid: number, map: Map<number, ECSEntity>) => void, thisArg?: unknown): void {
        this._map.forEach(cb, thisArg);
    }

    /** 实体值迭代器 */
    values(): IterableIterator<ECSEntity> {
        return this._map.values();
    }

    /** 全部存活实体快照（遍历期间需增删时使用，避免迭代器失效） */
    snapshot<E extends ECSEntity = ECSEntity>(): E[] {
        return Array.from(this._map.values()) as E[];
    }

    /** 当前存活实体数量 */
    get size(): number {
        return this._map.size;
    }

    /** 清空登记表（不销毁实体，由调用方先 destroy） */
    clear(): void {
        this._map.clear();
    }
}
