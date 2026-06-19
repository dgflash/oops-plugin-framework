import { ecsWorldManager } from '../world/ECSWorldManager';
import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import { SerializedComponent, SerializedEntity, getCompCtorByName, serializeEntity } from './SerializationBase';

/** 世界快照（按 eid 索引序列化实体） */
export interface Snapshot {
    /** 快照格式版本号 */
    version: number;
    /** eid -> 序列化实体 */
    entities: Map<number, SerializedEntity>;
}

/** 单个实体的变更 */
export interface EntityDelta {
    /** 实体 ID */
    eid: number;
    /** 变更后的父实体 ID */
    parentEid?: number | null;
    /** 新增或更新的组件 */
    upserted?: SerializedComponent[];
    /** 被移除的组件类型名 */
    removed?: string[];
}

/** 两次快照之间的增量 */
export interface IncrementalDelta {
    /** 增量格式版本号 */
    version: number;
    /** 新增的实体 */
    added: SerializedEntity[];
    /** 被移除的实体 eid 列表 */
    removed: number[];
    /** 发生变更的实体 */
    changed: EntityDelta[];
}

/** 当前快照格式版本 */
const SNAPSHOT_VERSION = 1;

/** 比较两份组件字段数据是否相等 */
function dataEquals(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** added 实体原 eid -> 新实体，用于一次 applyDelta 内的父子重建 */
const addedEidMap = new Map<number, ECSEntity>();

/**
 * 增量序列化器：基于 @ecs.serialize 字段，对世界做快照、计算 diff、应用 diff。
 * 适合存档/回放/带宽优化：仅传输自上次快照以来变化的实体与组件。
 */
export class IncrementalSerializer {
    /** 对当前世界拍快照 */
    static createSnapshot(): Snapshot {
        const entities = new Map<number, SerializedEntity>();
        ecsWorldManager.current.entities.forEach(e => {
            if (e.isValid) entities.set(e.eid, serializeEntity(e));
        });
        return { version: SNAPSHOT_VERSION, entities };
    }

    /** 计算当前世界相对 base 快照的增量，并返回最新快照供链式调用 */
    static computeDelta(base: Snapshot): { delta: IncrementalDelta; snapshot: Snapshot } {
        const snapshot = IncrementalSerializer.createSnapshot();
        const added: SerializedEntity[] = [];
        const removed: number[] = [];
        const changed: EntityDelta[] = [];

        snapshot.entities.forEach((cur, eid) => {
            const prev = base.entities.get(eid);
            if (!prev) {
                added.push(cur);
                return;
            }
            const ed = IncrementalSerializer.diffEntity(prev, cur);
            if (ed) changed.push(ed);
        });

        base.entities.forEach((_prev, eid) => {
            if (!snapshot.entities.has(eid)) removed.push(eid);
        });

        return { delta: { version: SNAPSHOT_VERSION, added, removed, changed }, snapshot };
    }

    /** 比较两个序列化实体，返回有差异时的变更描述 */
    private static diffEntity(prev: SerializedEntity, cur: SerializedEntity): EntityDelta | null {
        const ed: EntityDelta = { eid: cur.eid };
        let dirty = false;

        if (prev.parentEid !== cur.parentEid) {
            ed.parentEid = cur.parentEid;
            dirty = true;
        }

        const prevMap = new Map(prev.components.map(c => [c.type, c]));
        const curMap = new Map(cur.components.map(c => [c.type, c]));

        const upserted: SerializedComponent[] = [];
        curMap.forEach((c, key) => {
            const p = prevMap.get(key);
            if (!p || !dataEquals(p.data, c.data)) upserted.push(c);
        });
        const removedComps: string[] = [];
        prevMap.forEach((_c, key) => {
            if (!curMap.has(key)) removedComps.push(key);
        });

        if (upserted.length > 0) {
            ed.upserted = upserted;
            dirty = true;
        }
        if (removedComps.length > 0) {
            ed.removed = removedComps;
            dirty = true;
        }

        return dirty ? ed : null;
    }

    /** 序列化增量为 JSON */
    static stringify(delta: IncrementalDelta, pretty = false): string {
        return pretty ? JSON.stringify(delta, null, 2) : JSON.stringify(delta);
    }

    /**
     * 将增量应用到世界（按 eid 匹配）。
     * @param createEntityByName 由 ecs 注入：按实体名创建实体。
     */
    static applyDelta(
        deltaOrJson: IncrementalDelta | string,
        createEntityByName: (name: string) => ECSEntity | undefined
    ): void {
        const delta: IncrementalDelta = typeof deltaOrJson === 'string' ? JSON.parse(deltaOrJson) : deltaOrJson;

        for (const eid of delta.removed) {
            const e = ecsWorldManager.current.entities.get(eid);
            if (e) e.destroy();
        }

        const pendingParents: Array<{ eid: number; parentEid: number | null }> = [];

        for (const se of delta.added) {
            const e = createEntityByName(se.name);
            if (!e) {
                console.warn(`[ECS] 增量应用跳过未注册实体: ${se.name}`);
                continue;
            }
            IncrementalSerializer.applyComponents(e, se.components);
            pendingParents.push({ eid: e.eid, parentEid: se.parentEid });
            addedEidMap.set(se.eid, e);
        }

        for (const ed of delta.changed) {
            const e = ecsWorldManager.current.entities.get(ed.eid);
            if (!e) continue;
            if (ed.upserted) IncrementalSerializer.applyComponents(e, ed.upserted);
            if (ed.removed) {
                for (const typeName of ed.removed) {
                    const cctor = getCompCtorByName(typeName);
                    if (cctor) e.remove(cctor);
                }
            }
            if (ed.parentEid !== undefined) {
                pendingParents.push({ eid: e.eid, parentEid: ed.parentEid });
            }
        }

        for (const { eid, parentEid } of pendingParents) {
            const child = ecsWorldManager.current.entities.get(eid);
            if (!child) continue;
            if (parentEid === null) {
                if (child.parent) child.parent.removeChild(child, false);
                continue;
            }
            const parent = ecsWorldManager.current.entities.get(parentEid) ?? addedEidMap.get(parentEid);
            if (parent && parent !== child) parent.addChild(child);
        }
        addedEidMap.clear();
    }

    /** 将序列化组件数据写入实体（新增或覆盖字段） */
    private static applyComponents(entity: ECSEntity, comps: SerializedComponent[]): void {
        for (const sc of comps) {
            const cctor = getCompCtorByName(sc.type);
            if (!cctor) {
                console.warn(`[ECS] 增量应用跳过未注册组件: ${sc.type}`);
                continue;
            }
            let comp = entity.get(cctor) as ecs.IComp | undefined;
            if (!comp) comp = entity.add(cctor) as ecs.IComp;
            const anyComp = comp as unknown as Record<string, unknown>;
            for (const key in sc.data) anyComp[key] = sc.data[key];
        }
    }
}
