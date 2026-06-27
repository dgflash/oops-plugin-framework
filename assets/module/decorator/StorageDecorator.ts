import { oops } from '../../core/Oops';

/**
 * 存储装饰器命名空间
 *
 * 提供属性声明式存储功能，key 必须为 {@link GameStorageKey} 中注册的合法值：
 * - @storage.string  - 字符串类型
 * - @storage.number  - 数值类型
 * - @storage.boolean - 布尔类型
 * - @storage.json    - JSON对象/数组类型
 *
 * 使用步骤：
 * 1. 在 `types/game-storage.d.ts` 中扩展 `OopsFramework.TypedGameStorageKey` 注册 key
 * 2. 在属性上添加 @storage.xxx(key, defaultValue) 装饰器
 * 3. 在构造函数中调用 storage.init(this)
 * 4. 访问属性自动从 storage 读取，修改属性自动保存到 storage
 *
 * @example
 * ```typescript
 * // types/game-storage.d.ts
 * declare global {
 *     namespace OopsFramework {
 *         interface TypedGameStorageKey {
 *             PlayerName: 'PlayerName';
 *             PlayerLevel: 'PlayerLevel';
 *         }
 *     }
 * }
 *
 * // PlayerData.ts
 * class PlayerData {
 *     @storage.string('PlayerName', 'Guest')
 *     name!: string;
 *
 *     @storage.number('PlayerLevel', 1)
 *     level!: number;
 *
 *     constructor() {
 *         storage.init(this);
 *     }
 * }
 * ```
 */
export namespace storage {
    /** 字符串存储装饰器 */
    export function string(key: GameStorageKey, defaultValue: string = ''): PropertyDecorator {
        return createDecorator('string', key, defaultValue);
    }

    /** 数值存储装饰器 */
    export function number(key: GameStorageKey, defaultValue: number = 0): PropertyDecorator {
        return createDecorator('number', key, defaultValue);
    }

    /** 布尔存储装饰器 */
    export function boolean(key: GameStorageKey, defaultValue: boolean = false): PropertyDecorator {
        return createDecorator('boolean', key, defaultValue);
    }

    /** JSON 存储装饰器 */
    export function json<T = any>(key: GameStorageKey, defaultValue?: T): PropertyDecorator {
        return createDecorator('json', key, defaultValue);
    }

    /**
     * 初始化实例的存储属性
     * 在类构造函数中调用，为所有装饰属性设置 getter/setter
     */
    export function init(instance: any): void {
        const metadata = metadataMap.get(Object.getPrototypeOf(instance));
        if (!metadata) return;

        for (const meta of metadata) {
            const privateKey = Symbol.for(`stg:${meta.propertyKey}`);
            const loadedKey = Symbol.for(`stg:${meta.propertyKey}:ld`);

            Object.defineProperty(instance, meta.propertyKey, {
                get() {
                    if ((this as any)[loadedKey]) {
                        return (this as any)[privateKey];
                    }
                    const value = load(meta.GameStorageKey, meta.defaultValue, meta.valueType);
                    (this as any)[privateKey] = value;
                    (this as any)[loadedKey] = true;
                    return value;
                },
                set(value: any) {
                    (this as any)[privateKey] = value;
                    (this as any)[loadedKey] = true;
                    oops.storage?.set(meta.GameStorageKey, value);
                },
                enumerable: true,
                configurable: true
            });
        }
    }

    // ========================================
    // 内部实现
    // ========================================

    type ValueType = 'string' | 'number' | 'boolean' | 'json';

    interface Metadata {
        propertyKey: string;
        GameStorageKey: GameStorageKey;
        defaultValue: any;
        valueType: ValueType;
    }

    const metadataMap = new WeakMap<any, Metadata[]>();

    function createDecorator(valueType: ValueType, key: GameStorageKey, defaultValue: any): PropertyDecorator {
        return (target: any, propertyKey: string | symbol) => {
            const propKey = String(propertyKey);

            let list = metadataMap.get(target);
            if (!list) {
                list = [];
                metadataMap.set(target, list);
            }
            list.push({ propertyKey: propKey, GameStorageKey: key, defaultValue, valueType });
        };
    }

    function load(key: GameStorageKey, defaultValue: any, type: ValueType): any {
        if (!oops.storage) return defaultValue;

        switch (type) {
            case 'number': return oops.storage.getNumber(key, defaultValue);
            case 'boolean': return oops.storage.getBoolean(key, defaultValue);
            case 'json': return oops.storage.getJson(key, defaultValue);
            default: return oops.storage.get(key, defaultValue);
        }
    }
}
