import { registry } from '../registry/ECSTypeRegistry';
import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { CompCtor, EntityCtor } from '../registry/ECSTypes';

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
 * 序列化单个组件。
 * 仅序列化通过 @ecs.serialize 标记的字段。
 */
export function serializeComponent(comp: ecs.IComp): SerializedComponent | null {
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

/**
 * 序列化单个实体（含其所有可序列化组件）。
 */
export function serializeEntity(entity: ECSEntity): SerializedEntity {
    const components: SerializedComponent[] = [];
    entity.forEachComponent((comp) => {
        const sc = serializeComponent(comp);
        if (sc) components.push(sc);
    });
    return {
        eid: entity.eid,
        name: entity.name,
        parentEid: entity.parent ? entity.parent.eid : null,
        components
    };
}
