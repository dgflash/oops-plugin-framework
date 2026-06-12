import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';

/** 组件构造函数上记录 @entityRef 属性集合的 Symbol 键 */
const ENTITY_REF_META = Symbol('ECSEntityRefMeta');
/** 组件实例上存储 @entityRef 实际值的 Symbol 键 */
const ENTITY_REF_VALUES = Symbol('ECSEntityRefValues');

/** 任意带 Symbol 键的对象（内部存取用） */
type SymbolRecord = Record<symbol, unknown>;

/** 获取（惰性创建）组件实例上的 @entityRef 值存储表 */
function getValueMap(comp: ecs.IComp): Map<string, ECSEntity | null> {
    const rec = comp as unknown as SymbolRecord;
    let map = rec[ENTITY_REF_VALUES] as Map<string, ECSEntity | null> | undefined;
    if (!map) {
        map = new Map<string, ECSEntity | null>();
        rec[ENTITY_REF_VALUES] = map;
    }
    return map;
}

/**
 * 属性装饰器：把组件属性标记为"实体引用"。
 *
 * 被引用的实体销毁时，该属性会被框架自动置为 null，避免悬空引用。
 * 底层通过实体所属世界的 {@link ECSReferenceTracker} 记录引用关系。
 */
export function entityRefDecorator(): PropertyDecorator {
    return function (target: object, propertyKey: string | symbol): void {
        const key = String(propertyKey);
        const ctor = (target as { constructor: SymbolRecord }).constructor;

        let props = ctor[ENTITY_REF_META] as Set<string> | undefined;
        if (!props) {
            props = new Set<string>();
            ctor[ENTITY_REF_META] = props;
        }
        props.add(key);

        Object.defineProperty(target, propertyKey, {
            get(this: ecs.IComp): ECSEntity | null {
                return getValueMap(this).get(key) ?? null;
            },
            set(this: ecs.IComp, value: ECSEntity | null): void {
                const map = getValueMap(this);
                const old = map.get(key) ?? null;
                if (old === value) return;

                if (old) {
                    old.world.refs.unregisterReference(old.eid, this, key);
                }

                if (value) {
                    if (value.isValid === false) {
                        map.set(key, null);
                        return;
                    }
                    value.world.refs.registerReference(value.eid, this, key);
                }

                map.set(key, value);
            },
            enumerable: true,
            configurable: true
        });
    };
}

/** 获取组件类/实例声明的所有 @entityRef 属性名 */
export function getEntityRefProperties(comp: ecs.IComp | (new () => ecs.IComp)): string[] {
    const ctor = (typeof comp === 'function' ? comp : comp.constructor) as unknown as SymbolRecord;
    const props = ctor?.[ENTITY_REF_META] as Set<string> | undefined;
    return props ? Array.from(props) : [];
}

/** 组件是否含有 @entityRef 属性（热点路径短路） */
export function hasEntityRef(comp: ecs.IComp): boolean {
    const ctor = (comp.constructor as unknown as SymbolRecord);
    const props = ctor?.[ENTITY_REF_META] as Set<string> | undefined;
    return props !== undefined && props.size > 0;
}

/**
 * 清理某组件持有的全部实体引用：逐个置 null（触发 setter 完成注销）。
 * 在组件被移除/回收时调用，防止池化复用残留过期引用与追踪记录。
 */
export function clearComponentEntityRefs(comp: ecs.IComp): void {
    const ctor = (comp.constructor as unknown as SymbolRecord);
    const props = ctor?.[ENTITY_REF_META] as Set<string> | undefined;
    if (!props || props.size === 0) return;
    const rec = comp as unknown as Record<string, unknown>;
    props.forEach((key) => {
        rec[key] = null;
    });
}
