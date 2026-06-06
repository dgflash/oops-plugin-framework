/**
 * 属性监听装饰器
 *
 * 提供属性变化监听功能，当属性值变化时自动触发指定方法
 *
 * 使用方法：
 * 1. 在属性上添加 @watch.onChange('methodName') 装饰器
 * 2. 在类中定义对应的处理方法
 *
 * @example
 * ```typescript
 * class PlayerData {
 *     @watch.onChange('onLevelChange')
 *     level: number = 1;
 *
 *     @watch.onChange('onNameChange')
 *     name: string = '';
 *
 *     @watch.onChange('onHpChange', true)
 *     hp: number = 100;
 *
 *     // 深度监听对象内部属性变化
 *     @watch.deepOnChange('onConfigChange')
 *     config: { level: number, name: string } = { level: 1, name: '' };
 *
 *     // 变化回调方法
 *     private onLevelChange(newValue: number, oldValue: number, propertyKey: string) {
 *         console.log(`等级变化: ${oldValue} -> ${newValue}`);
 *     }
 *
 *     private onNameChange(newValue: string, oldValue: string) {
 *         console.log(`名称变化: ${oldValue} -> ${newValue}`);
 *     }
 *
 *     // immediate=true 时初始化也会触发
 *     private onHpChange(newValue: number, oldValue: number) {
 *         console.log(`血量变化: ${oldValue} -> ${newValue}`);
 *     }
 *
 *     // 深度监听回调
 *     private onConfigChange(newValue: any, oldValue: any, propertyKey: string, path: string) {
 *         console.log(`配置变化 [${path}]:`, oldValue, '->', newValue);
 *     }
 * }
 * ```
 */
export namespace watch {
    /**
     * 属性变化监听装饰器（浅监听，仅监听直接赋值）
     * @param methodName 变化时触发的方法名
     * @param immediate 是否立即触发（初始化时触发一次），默认 false
     */
    export function onChange(methodName: string, immediate: boolean = false): PropertyDecorator {
        return createWatchDecorator(methodName, immediate, false);
    }

    /**
     * 深度属性变化监听装饰器（监听对象内部属性变化）
     * @param methodName 变化时触发的方法名
     * @param immediate 是否立即触发（初始化时触发一次），默认 false
     *
     * 回调方法参数：(newValue, oldValue, propertyKey, path)
     * - path: 变化的路径，如 "config.level"、"items[0].name"
     */
    export function deepOnChange(methodName: string, immediate: boolean = false): PropertyDecorator {
        return createWatchDecorator(methodName, immediate, true);
    }

    // ========================================
    // 内部实现
    // ========================================

    interface WatchMetadata {
        propertyKey: string;
        methodName: string;
        immediate: boolean;
        deep: boolean;
    }

    // 存储每个原型类的元数据
    const watchMetadataMap = new WeakMap<any, WatchMetadata[]>();

    // 存储深度代理对象的 WeakMap，用于避免重复代理
    const proxyMap = new WeakMap<any, any>();

    /**
     * 创建监听装饰器
     */
    function createWatchDecorator(methodName: string, immediate: boolean, deep: boolean): PropertyDecorator {
        return function (target: any, propertyKey: string | symbol): void {
            const propKey = String(propertyKey);

            // 获取或创建类的元数据数组
            let metadata = watchMetadataMap.get(target);
            if (!metadata) {
                metadata = [];
                watchMetadataMap.set(target, metadata);
            }

            metadata.push({
                propertyKey: propKey,
                methodName,
                immediate,
                deep
            });
        };
    }

    /**
     * 初始化监听装饰器
     * 为实例的属性设置 getter/setter，必须在构造函数中调用
     * @param target 目标实例
     */
    export function init(target: any): void {
        const proto = Object.getPrototypeOf(target);
        const metadata = watchMetadataMap.get(proto);

        if (!metadata) {
            console.warn('[WatchDecorator] 未找到监听元数据，请确保在类定义后调用');
            return;
        }

        for (const meta of metadata) {
            if (meta.deep) {
                setupDeepPropertyWatcher(target, meta);
            } else {
                setupPropertyWatcher(target, meta);
            }
        }
    }

    /**
     * 为单个属性设置 getter/setter（浅监听）
     */
    function setupPropertyWatcher(instance: any, meta: WatchMetadata): void {
        const { propertyKey, methodName, immediate } = meta;
        // 使用 Symbol 作为私有属性 key，避免命名冲突
        const privateKey = Symbol.for(`watch:${propertyKey}`);
        const initializedKey = Symbol.for(`watch:${propertyKey}:init`);

        // 获取初始值
        const descriptor = Object.getOwnPropertyDescriptor(instance, propertyKey);
        const initialValue = descriptor?.value;

        // 设置初始值到私有属性
        instance[privateKey] = initialValue;
        instance[initializedKey] = false;

        // 定义 getter/setter
        Object.defineProperty(instance, propertyKey, {
            get: function () {
                return this[privateKey];
            },
            set: function (newValue: any) {
                const oldValue = this[privateKey];

                // 值未变化时不触发
                if (oldValue === newValue) {
                    this[privateKey] = newValue;
                    return;
                }

                // 更新值
                this[privateKey] = newValue;

                // 获取回调方法
                const callback = this[methodName];
                if (typeof callback !== 'function') {
                    console.warn(`[WatchDecorator] 未找到方法: ${methodName}`);
                    return;
                }

                // 首次初始化且 immediate 为 false 时不触发
                if (!this[initializedKey] && !immediate) {
                    this[initializedKey] = true;
                    return;
                }

                this[initializedKey] = true;

                // 触发回调
                try {
                    // 优先尝试传入 (newValue, oldValue, propertyKey)
                    const result = callback.call(this, newValue, oldValue, propertyKey);
                    // 如果方法返回 false，表示阻止后续处理（可选）
                    if (result === false) {
                        // 可以在这里添加回滚逻辑
                    }
                } catch (error) {
                    console.error(`[WatchDecorator] 执行 ${methodName} 时出错:`, error);
                }
            },
            enumerable: true,
            configurable: true
        });

        // 如果 immediate 为 true，立即触发一次回调
        if (immediate && typeof instance[methodName] === 'function') {
            try {
                instance[methodName].call(instance, initialValue, undefined, propertyKey);
                instance[initializedKey] = true;
            } catch (error) {
                console.error(`[WatchDecorator] 执行 ${methodName} 时出错:`, error);
            }
        }
    }

    /**
     * 为单个属性设置深度监听（监听对象内部属性变化）
     */
    function setupDeepPropertyWatcher(instance: any, meta: WatchMetadata): void {
        const { propertyKey, methodName, immediate } = meta;
        // 使用 Symbol 作为私有属性 key，避免命名冲突
        const privateKey = Symbol.for(`watch:deep:${propertyKey}`);
        const initializedKey = Symbol.for(`watch:deep:${propertyKey}:init`);

        // 获取初始值
        const descriptor = Object.getOwnPropertyDescriptor(instance, propertyKey);
        let initialValue = descriptor?.value;

        // 如果是对象，创建深度代理
        if (isObject(initialValue)) {
            initialValue = createDeepProxy(instance, methodName, initialValue, propertyKey, '');
        }

        // 设置初始值到私有属性
        instance[privateKey] = initialValue;
        instance[initializedKey] = false;

        // 定义 getter/setter
        Object.defineProperty(instance, propertyKey, {
            get: function () {
                return this[privateKey];
            },
            set: function (newValue: any) {
                const oldValue = this[privateKey];

                // 值未变化时不触发
                if (oldValue === newValue) {
                    return;
                }

                // 如果是对象，创建深度代理
                let wrappedValue = newValue;
                if (isObject(newValue)) {
                    wrappedValue = createDeepProxy(this, methodName, newValue, propertyKey, '');
                }

                // 更新值
                this[privateKey] = wrappedValue;

                // 获取回调方法
                const callback = this[methodName];
                if (typeof callback !== 'function') {
                    console.warn(`[WatchDecorator] 未找到方法: ${methodName}`);
                    return;
                }

                // 首次初始化且 immediate 为 false 时不触发
                if (!this[initializedKey] && !immediate) {
                    this[initializedKey] = true;
                    return;
                }

                this[initializedKey] = true;

                // 触发回调
                try {
                    callback.call(this, newValue, oldValue, propertyKey, propertyKey);
                } catch (error) {
                    console.error(`[WatchDecorator] 执行 ${methodName} 时出错:`, error);
                }
            },
            enumerable: true,
            configurable: true
        });

        // 如果 immediate 为 true，立即触发一次回调
        if (immediate && typeof instance[methodName] === 'function') {
            try {
                const originalValue = descriptor?.value;
                instance[methodName].call(instance, originalValue, undefined, propertyKey, propertyKey);
                instance[initializedKey] = true;
            } catch (error) {
                console.error(`[WatchDecorator] 执行 ${methodName} 时出错:`, error);
            }
        }
    }

    /**
     * 创建深度代理对象
     */
    function createDeepProxy(
        instance: any,
        methodName: string,
        target: any,
        rootPropertyKey: string,
        path: string
    ): any {
        // 如果已经是代理，直接返回
        if (proxyMap.has(target)) {
            return proxyMap.get(target);
        }

        // 如果不是对象，直接返回
        if (!isObject(target)) {
            return target;
        }

        // 如果是数组
        if (Array.isArray(target)) {
            const proxy = new Proxy(target, {
                get(target, prop, receiver) {
                    const value = Reflect.get(target, prop, receiver);
                    // 递归代理嵌套对象
                    if (isObject(value)) {
                        const currentPath = path ? `${path}[${String(prop)}]` : `[${String(prop)}]`;
                        return createDeepProxy(instance, methodName, value, rootPropertyKey, currentPath);
                    }
                    return value;
                },
                set(target, prop, value, receiver) {
                    const oldValue = Reflect.get(target, prop, receiver);
                    const result = Reflect.set(target, prop, value, receiver);

                    // 值变化时触发回调
                    if (oldValue !== value) {
                        const currentPath = path ? `${path}[${String(prop)}]` : `[${String(prop)}]`;
                        triggerDeepCallback(instance, methodName, value, oldValue, rootPropertyKey, currentPath);
                    }

                    return result;
                }
            });
            proxyMap.set(target, proxy);
            return proxy;
        }

        // 如果是普通对象
        const proxy = new Proxy(target, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // 递归代理嵌套对象
                if (isObject(value)) {
                    const currentPath = path ? `${path}.${String(prop)}` : String(prop);
                    return createDeepProxy(instance, methodName, value, rootPropertyKey, currentPath);
                }
                return value;
            },
            set(target, prop, value, receiver) {
                const oldValue = Reflect.get(target, prop, receiver);
                const result = Reflect.set(target, prop, value, receiver);

                // 值变化时触发回调
                if (oldValue !== value) {
                    const currentPath = path ? `${path}.${String(prop)}` : String(prop);
                    triggerDeepCallback(instance, methodName, value, oldValue, rootPropertyKey, currentPath);
                }

                return result;
            }
        });
        proxyMap.set(target, proxy);
        return proxy;
    }

    /**
     * 触发深度监听回调
     */
    function triggerDeepCallback(
        instance: any,
        methodName: string,
        newValue: any,
        oldValue: any,
        propertyKey: string,
        path: string
    ): void {
        const callback = instance[methodName];
        if (typeof callback !== 'function') {
            console.warn(`[WatchDecorator] 未找到方法: ${methodName}`);
            return;
        }

        try {
            callback.call(instance, newValue, oldValue, propertyKey, path);
        } catch (error) {
            console.error(`[WatchDecorator] 执行 ${methodName} 时出错:`, error);
        }
    }

    /**
     * 判断是否为对象（需要代理的类型）
     */
    function isObject(value: any): boolean {
        return value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof RegExp);
    }
}
