import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { ECSEntityTable } from '../entity/ECSEntityTable';
import { ECSGroup } from './ECSGroup';

/** 组件增删时的 group 回调 */
type CompAddOrRemove = (entity: ecs.Entity) => void;

/** 响应式查询索引：分组 + 组件增删回调槽（建组时注册回调，增删组件时驱动分组更新） */
export class ECSGroupManager {
    private readonly _groups: Map<number, ECSGroup> = new Map();
    private readonly _compCallbacks: Map<number, CompAddOrRemove[]> = new Map();

    /**
     * @param registeredTids 已注册组件 tid，预建回调槽（晚于注册创建的世界也能查询）
     */
    constructor(registeredTids?: number[]) {
        if (registeredTids) {
            for (let i = 0; i < registeredTids.length; i++) {
                this._compCallbacks.set(registeredTids[i], []);
            }
        }
    }

    /** 确保某组件 tid 存在回调槽（注册新组件或建组时调用） */
    ensureCompSlot(tid: number): void {
        if (!this._compCallbacks.has(tid)) this._compCallbacks.set(tid, []);
    }

    /** 获取某组件 tid 的增删回调列表（EntityHelper 广播用） */
    getCompCallbacks(tid: number): CompAddOrRemove[] | undefined {
        return this._compCallbacks.get(tid);
    }

    /** 创建或获取分组，并注册到对应组件 tid 的回调槽 */
    createGroup<E extends ECSEntity = ECSEntity>(matcher: ecs.IMatcher): ECSGroup<E> {
        let group = this._groups.get(matcher.mid);
        if (!group) {
            group = new ECSGroup(matcher);
            this._groups.set(matcher.mid, group);
            const indices = matcher.indices;
            for (let i = 0; i < indices.length; i++) {
                this.ensureCompSlot(indices[i]);
                this._compCallbacks.get(indices[i])!.push(group.onComponentAddOrRemove.bind(group));
            }
        }
        return group as unknown as ECSGroup<E>;
    }

    /** 获取已存在的分组（不存在返回 undefined，不会建组） */
    getGroup<E extends ECSEntity = ECSEntity>(mid: number): ECSGroup<E> | undefined {
        return this._groups.get(mid) as unknown as ECSGroup<E> | undefined;
    }

    /** 动态查询实体（首次查询自动建组并回填现有实体） */
    query<E extends ECSEntity = ECSEntity>(entities: ECSEntityTable, matcher: ecs.IMatcher): E[] {
        let group = this.getGroup<E>(matcher.mid);
        if (!group) {
            group = this.createGroup<E>(matcher);
            const onChange = group.onComponentAddOrRemove.bind(group) as (entity: ECSEntity) => void;
            entities.forEach(onChange);
        }
        return group.matchEntities as unknown as E[];
    }

    /** 当前分组数量 */
    get size(): number {
        return this._groups.size;
    }

    /** 清空全部分组与各回调槽（保留槽结构，与世界 clear 语义一致） */
    clear(): void {
        this._groups.forEach((group) => group.clear());
        this._groups.clear();
        this._compCallbacks.forEach((list) => { list.length = 0; });
    }
}
