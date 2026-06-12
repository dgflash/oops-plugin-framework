import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';

/**
 * 实体分组（响应式查询）
 *
 * 内部采用 SparseSet：紧凑数组 `_dense` 存实体 + `_index`（eid -> 下标）支持 O(1) 增删
 * （删除用 swap-pop）。遍历时返回稳定快照 `_cache`，避免系统在遍历过程中增删组件破坏迭代；
 * 快照仅在结构发生变化后首次访问时重建（从紧凑数组拷贝，无 Map 迭代器开销）。
 */
export class ECSGroup<E extends ECSEntity = ECSEntity> {
    /** 实体筛选规则 */
    private readonly matcher: ecs.IMatcher;

    /** 紧凑实体数组（SparseSet dense） */
    private readonly _dense: E[] = [];
    /** eid -> dense 下标 */
    private readonly _index: Map<number, number> = new Map();

    /** 对外遍历用的稳定快照 */
    private _cache: E[] = [];
    /** 快照是否有效（结构未变时可复用 _cache） */
    private _cacheValid = false;

    /** 本帧新进入 group 的实体（需配合 watchEntityEnterAndRemove 使用） */
    private _enteredEntities: Map<number, E> | null = null;
    /** 本帧从 group 移除的实体（需配合 watchEntityEnterAndRemove 使用） */
    private _removedEntities: Map<number, E> | null = null;

    /**
     * @param matcher 实体筛选规则
     */
    constructor(matcher: ecs.IMatcher) {
        this.matcher = matcher;
    }

    /**
     * 当前 group 中实体数量。
     * 注：不要手动修改。
     */
    get count(): number {
        return this._dense.length;
    }

    /**
     * 符合规则的实体（稳定快照）
     *
     * 仅在结构变化后首次访问时重建，复用同一数组以减少 GC。
     */
    get matchEntities(): E[] {
        if (!this._cacheValid) {
            const dense = this._dense;
            const n = dense.length;
            const cache = this._cache;
            cache.length = n;
            for (let i = 0; i < n; i++) cache[i] = dense[i];
            this._cacheValid = true;
        }
        return this._cache;
    }

    /** 获取第一个匹配实体 */
    get entity(): E | undefined {
        return this._dense[0];
    }

    /**
     * 实体组件增删时回调，根据 matcher 规则维护 group 成员。
     * @param entity 发生组件变更的实体
     */
    onComponentAddOrRemove(entity: E): void {
        const index = this._index;
        const eid = entity.eid;
        const has = index.has(eid);

        if (this.matcher.isMatch(entity)) {
            // Group 只关心指定组件在实体身上的添加和删除动作
            if (!has) {
                index.set(eid, this._dense.length);
                this._dense.push(entity);
                this._cacheValid = false;

                if (this._enteredEntities) {
                    this._enteredEntities.set(eid, entity);
                    this._removedEntities!.delete(eid);
                }
            }
        }
        else if (has) {
            // 不再满足规则：swap-pop O(1) 删除
            const dense = this._dense;
            const idx = index.get(eid)!;
            const last = dense.length - 1;
            if (idx !== last) {
                const moved = dense[last];
                dense[idx] = moved;
                index.set(moved.eid, idx);
            }
            dense.pop();
            index.delete(eid);
            this._cacheValid = false;

            if (this._enteredEntities) {
                this._enteredEntities.delete(eid);
                this._removedEntities!.set(eid, entity);
            }
        }
    }

    /**
     * 开启进入/离开实体追踪，供系统帧内查询本帧变化。
     * @param enteredEntities 本帧新进入的实体 map（eid -> entity）
     * @param removedEntities 本帧离开的实体 map（eid -> entity）
     */
    watchEntityEnterAndRemove(enteredEntities: Map<number, E>, removedEntities: Map<number, E>): void {
        this._enteredEntities = enteredEntities;
        this._removedEntities = removedEntities;
    }

    /** 清空 group 内所有实体、快照及进入/离开追踪 */
    clear(): void {
        this._dense.length = 0;
        this._index.clear();
        this._cache.length = 0;
        this._cacheValid = false;
        this._enteredEntities?.clear();
        this._removedEntities?.clear();
    }
}
