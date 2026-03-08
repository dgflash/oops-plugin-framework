/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-05 14:21:54
 */
import type { ecs } from './ECS';
import type { ECSEntity } from './ECSEntity';

export class ECSGroup<E extends ECSEntity = ECSEntity> {
    /** 实体筛选规则 */
    private readonly matcher: ecs.IMatcher;

    private readonly _matchEntities: Map<number, E> = new Map();

    private _entitiesCache: E[] = [];
    private _cacheValid = false;

    /**
     * 符合规则的实体（带数组容量管理）
     */
    get matchEntities(): E[] {
        if (!this._cacheValid) {
            const cache = this._entitiesCache;
            const targetSize = this._matchEntities.size;
            
            // 如果缓存数组过大，重新创建以释放内存
            if (cache.length > targetSize * 2 && targetSize < 100) {
                this._entitiesCache = [];
            } else {
                cache.length = 0;
            }
            
            // 直接遍历 Map values 比 Array.from 更高效
            const iterator = this._matchEntities.values();
            let result = iterator.next();
            while (!result.done) {
                this._entitiesCache.push(result.value);
                result = iterator.next();
            }
            
            this._cacheValid = true;
        }
        return this._entitiesCache;
    }

    /**
     * 当前group中实体的数量
     *
     * 注：不要手动修改这个属性值。
     * 注：其实可以通过this._matchEntities.size获得实体数量，但是需要封装get方法。为了减少一次方法的调用所以才直接创建一个count属性
     */
    count = 0;

    /** 获取matchEntities中第一个实体 */
    get entity(): E | undefined {
        return this.matchEntities[0];
    }

    private _enteredEntities: Map<number, E> | null = null;
    private _removedEntities: Map<number, E> | null = null;

    constructor(matcher: ecs.IMatcher) {
        this.matcher = matcher;
    }

    onComponentAddOrRemove(entity: E): void {
        if (this.matcher.isMatch(entity)) { // Group只关心指定组件在实体身上的添加和删除动作。
            if (!this._matchEntities.has(entity.eid)) {
                this._matchEntities.set(entity.eid, entity);
                this._cacheValid = false;
                this.count++;

                if (this._enteredEntities) {
                    this._enteredEntities.set(entity.eid, entity);
                    this._removedEntities!.delete(entity.eid);
                }
            }
        }
        else if (this._matchEntities.has(entity.eid)) { // 如果Group中有这个实体，但是这个实体已经不满足匹配规则，则从Group中移除该实体
            this._matchEntities.delete(entity.eid);
            this._cacheValid = false;
            this.count--;

            if (this._enteredEntities) {
                this._enteredEntities.delete(entity.eid);
                this._removedEntities!.set(entity.eid, entity);
            }
        }
    }

    watchEntityEnterAndRemove(enteredEntities: Map<number, E>, removedEntities: Map<number, E>): void {
        this._enteredEntities = enteredEntities;
        this._removedEntities = removedEntities;
    }

    clear(): void {
        this._matchEntities.clear();
        this._entitiesCache.length = 0;
        this._cacheValid = false;
        this.count = 0;
        this._enteredEntities?.clear();
        this._removedEntities?.clear();
    }
}
