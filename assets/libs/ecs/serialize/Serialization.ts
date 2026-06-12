import { registry } from '../registry/ECSTypeRegistry';
import { ecsWorldManager } from '../world/ECSWorldManager';
import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { CompCtor, EntityCtor } from '../registry/ECSTypes';
import { IncrementalSerializer, type IncrementalDelta, type Snapshot } from './Incremental';

/** 组件可序列化字段元数据键 */
const SERIALIZE_FIELDS = '__ecsSerializeFields';

/** 组件序列化字段元数据 */
interface SerializeMeta {
    /** 标记为可序列化的字段名集合 */
    fields: Set<string>;
}

/** 获取或创建组件构造器上的序列化元数据 */
function getMeta(ctor: object): SerializeMeta {
    const anyCtor = ctor as unknown as Record<string, unknown>;
    let meta = anyCtor[SERIALIZE_FIELDS] as SerializeMeta | undefined;
    if (!meta || !Object.prototype.hasOwnProperty.call(ctor, SERIALIZE_FIELDS)) {
        const parentMeta = meta;
        meta = { fields: new Set(parentMeta ? parentMeta.fields : undefined) };
        anyCtor[SERIALIZE_FIELDS] = meta;
    }
    return meta;
}

/**
 * 字段序列化装饰器：标记组件上需要持久化的字段。
 * @example
 *   @ecs.register('Pos')
 *   class Pos extends ecs.Comp { @ecs.serialize() x = 0; @ecs.serialize() y = 0; reset(){} }
 */
export function serialize() {
    return function (target: object, propertyKey: string): void {
        getMeta(target.constructor as object).fields.add(propertyKey);
    };
}

/** 序列化后的组件 */
export interface SerializedComponent {
    /** 组件类型名 */
    type: string;
    /** 可序列化字段数据 */
    data: Record<string, unknown>;
}

/** 序列化后的实体 */
export interface SerializedEntity {
    /** 实体 ID */
    eid: number;
    /** 实体注册名 */
    name: string;
    /** 父实体 ID，无父级时为 null */
    parentEid: number | null;
    /** 实体上的序列化组件列表 */
    components: SerializedComponent[];
}

/** 序列化后的场景 */
export interface SerializedScene {
    /** 场景格式版本号 */
    version: number;
    /** 场景中所有实体 */
    entities: SerializedEntity[];
}

/** 当前场景序列化格式版本 */
const SCENE_VERSION = 1;

/** 按名字查找组件构造函数 */
export function getCompCtorByName(name: string): CompCtor<ecs.IComp> | undefined {
    const list = registry.compCtors;
    for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].compName === name) return list[i];
    }
    return undefined;
}

/** 按名字查找实体构造函数 */
export function getEntityCtorByName(name: string): EntityCtor<ECSEntity> | undefined {
    let found: EntityCtor<ECSEntity> | undefined;
    registry.entityCtors.forEach((n, ctor) => {
        if (n === name) found = ctor;
    });
    return found;
}

/**
 * 序列化器：场景 / 实体 / 组件 与 JSON 互转。
 * 仅序列化通过 @ecs.serialize 标记的字段；保留实体层级（parentEid）。
 */
export class Serializer {
    /** 序列化单个组件 */
    static serializeComponent(comp: ecs.IComp): SerializedComponent | null {
        const ctor = comp.constructor as CompCtor<ecs.IComp>;
        const meta = (ctor as unknown as Record<string, SerializeMeta | undefined>)[SERIALIZE_FIELDS];
        if (!meta || meta.fields.size === 0) return null;

        const data: Record<string, unknown> = {};
        const anyComp = comp as unknown as Record<string, unknown>;
        meta.fields.forEach((field) => {
            data[field] = anyComp[field];
        });
        return { type: ctor.compName, data };
    }

    /** 序列化单个实体 */
    static serializeEntity(entity: ECSEntity): SerializedEntity {
        const components: SerializedComponent[] = [];
        entity.forEachComponent((comp) => {
            const sc = Serializer.serializeComponent(comp);
            if (sc) components.push(sc);
        });
        return {
            eid: entity.eid,
            name: entity.name,
            parentEid: entity.parent ? entity.parent.eid : null,
            components
        };
    }

    /** 序列化整个世界 */
    static serializeWorld(pretty = false): string {
        const entities: SerializedEntity[] = [];
        ecsWorldManager.current.entities.forEach((e) => {
            if (e.isValid) entities.push(Serializer.serializeEntity(e));
        });
        const scene: SerializedScene = { version: SCENE_VERSION, entities };
        return pretty ? JSON.stringify(scene, null, 2) : JSON.stringify(scene);
    }

    /**
     * 反序列化到世界。
     * 两阶段：先建实体+组件，再按 parentEid 重建层级。
     * @param createEntity 由 ecs 注入的实体创建函数（按名）。
     */
    static deserializeWorld(
        json: string,
        createEntity: (ctor: EntityCtor<ECSEntity>) => ECSEntity
    ): void {
        const scene = JSON.parse(json) as SerializedScene;
        const eidMap = new Map<number, ECSEntity>();

        for (const se of scene.entities) {
            const ctor = getEntityCtorByName(se.name);
            if (!ctor) {
                console.warn(`[ECS] 反序列化跳过未注册实体: ${se.name}`);
                continue;
            }
            const entity = createEntity(ctor);
            eidMap.set(se.eid, entity);

            for (const sc of se.components) {
                const cctor = getCompCtorByName(sc.type);
                if (!cctor) {
                    console.warn(`[ECS] 反序列化跳过未注册组件: ${sc.type}`);
                    continue;
                }
                const comp = entity.add(cctor) as ecs.IComp;
                const anyComp = comp as unknown as Record<string, unknown>;
                for (const key in sc.data) anyComp[key] = sc.data[key];
            }
        }

        for (const se of scene.entities) {
            if (se.parentEid !== null) {
                const child = eidMap.get(se.eid);
                const parent = eidMap.get(se.parentEid);
                if (child && parent) parent.addChild(child);
            }
        }
    }
}

/** 序列化 API 集合（`ecs.serialize` 即此对象） */
export const ecsSerialize = {
    /** @ecs.serialize() 字段装饰器：标记组件需要持久化的字段 */
    serialize,
    /**
     * 全量序列化当前世界为 JSON
     * @param pretty 是否格式化输出（缩进）
     */
    serializeWorld(pretty = false): string {
        return Serializer.serializeWorld(pretty);
    },
    /**
     * 从 JSON 反序列化到当前世界
     * @param json 由 serializeWorld 生成的场景 JSON
     */
    deserializeWorld(json: string): void {
        Serializer.deserializeWorld(json, (c) => ecsWorldManager.current.getEntity(c as EntityCtor<ECSEntity>));
    },
    /** 对当前世界拍快照（增量序列化基线） */
    snapshot(): Snapshot {
        return IncrementalSerializer.createSnapshot();
    },
    /**
     * 计算当前世界相对 base 快照的增量
     * @param base 基线快照
     */
    computeDelta(base: Snapshot): { delta: IncrementalDelta; snapshot: Snapshot } {
        return IncrementalSerializer.computeDelta(base);
    },
    /**
     * 将增量应用到当前世界
     * @param delta 增量对象或 JSON 字符串
     */
    applyDelta(delta: IncrementalDelta | string): void {
        IncrementalSerializer.applyDelta(delta, (name) => {
            const ctor = getEntityCtorByName(name);
            return ctor ? ecsWorldManager.current.getEntity(ctor as EntityCtor<ECSEntity>) : undefined;
        });
    },
};
