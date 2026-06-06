import { oops } from '../../core/Oops';

/**
 * 存储装饰器命名空间
 *
 * 提供属性声明式存储功能：
 * - @storage.string  - 字符串类型
 * - @storage.number  - 数值类型
 * - @storage.boolean - 布尔类型
 * - @storage.json    - JSON对象/数组类型
 *
 * 使用方法：
 * 1. 在属性上添加 @storage.xxx 装饰器
 * 2. 在构造函数中调用 storage.init(this)
 * 3. 访问属性自动从 storage 读取
 * 4. 修改属性自动保存到 storage
 *
 * @example
 * ```typescript
 * class PlayerData {
 *     @storage.string('player_name', 'Guest')
 *     name!: string;
 *
 *     @storage.number('player_level', 1)
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
    export function string(key?: string, defaultValue: string = ''): PropertyDecorator {
        return createDecorator('string', key, defaultValue);
    }

    /** 数值存储装饰器 */
    export function number(key?: string, defaultValue: number = 0): PropertyDecorator {
        return createDecorator('number', key, defaultValue);
    }

    /** 布尔存储装饰器 */
    export function boolean(key?: string, defaultValue: boolean = false): PropertyDecorator {
        return createDecorator('boolean', key, defaultValue);
    }

    /** JSON 存储装饰器 */
    export function json<T = any>(key?: string, defaultValue?: T): PropertyDecorator {
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
                    const value = load(meta.storageKey, meta.defaultValue, meta.valueType);
                    (this as any)[privateKey] = value;
                    (this as any)[loadedKey] = true;
                    return value;
                },
                set(value: any) {
                    (this as any)[privateKey] = value;
                    (this as any)[loadedKey] = true;
                    oops.storage?.set(meta.storageKey, value);
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
        storageKey: string;
        defaultValue: any;
        valueType: ValueType;
    }

    const metadataMap = new WeakMap<any, Metadata[]>();

    function createDecorator(valueType: ValueType, key: string | undefined, defaultValue: any): PropertyDecorator {
        return (target: any, propertyKey: string | symbol) => {
            const propKey = String(propertyKey);
            const storageKey = key || propKey;

            let list = metadataMap.get(target);
            if (!list) {
                list = [];
                metadataMap.set(target, list);
            }
            list.push({ propertyKey: propKey, storageKey, defaultValue, valueType });
        };
    }

    function load(key: string, defaultValue: any, type: ValueType): any {
        if (!oops.storage) return defaultValue;

        switch (type) {
            case 'number': return oops.storage.getNumber(key, defaultValue);
            case 'boolean': return oops.storage.getBoolean(key, defaultValue);
            case 'json': return oops.storage.getJson(key, defaultValue);
            default: return oops.storage.get(key, defaultValue);
        }
    }
}
