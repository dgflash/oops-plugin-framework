/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2024-03-08 10:00:00
 * 
 * JsonOb 性能优化版本（默认实现）
 * 
 * 优化特性：
 * - 防止重复观察同一对象
 * - 优化数组操作（只监听新增元素）
 * - 支持冻结数据（不监听静态配置）
 * - 支持批量更新（减少回调次数）
 * - 支持自定义深度限制
 * - 更安全的内存管理
 * 
 * API 完全兼容原始版本，可零改动升级
 */

/**
 * 实现动态绑定的核心部分，
 * 每次修改属性值，都会调用对应函数，并且获取值的路径
 */
const OP = Object.prototype;
const types = {
    obj: '[object Object]',
    array: '[object Array]'
};

/** 冻结标记 */
const FROZEN_KEY = Symbol('__frozen__');

/** 配置选项 */
export interface JsonObOptions {
    /** 最大监听深度，默认 10 */
    maxDepth?: number;
    /** 冻结的属性列表（不监听这些属性） */
    frozenKeys?: string[];
    /** 是否启用批量更新，默认 false */
    enableBatch?: boolean;
    /** 批量更新延迟（毫秒），默认 16ms（一帧） */
    batchDelay?: number;
}

/**
 * 标记对象为冻结状态（不会被监听）
 * 适用于静态配置数据，可提升性能
 */
export function freezeData(obj: any): void {
    if (typeof obj === 'object' && obj !== null) {
        obj[FROZEN_KEY] = true;
    }
}

/**
 * 检查对象是否被冻结
 */
export function isFrozen(obj: any): boolean {
    return obj && obj[FROZEN_KEY] === true;
}

/**
 * 实现属性拦截的类（性能优化版）
 */
export class JsonOb<T> {
    constructor(
        obj: T,
        callback: (newVal: any, oldVal: any, pathArray: string[]) => void,
        options?: JsonObOptions
    ) {
        if (OP.toString.call(obj) !== types.obj && OP.toString.call(obj) !== types.array) {
            console.error('请传入一个对象或数组');
        }

        this._callback = callback;
        this._root = obj;
        this._options = {
            maxDepth: 10,
            frozenKeys: [],
            enableBatch: false,
            batchDelay: 16,
            ...options
        };
        this._observedObjects = new WeakSet();
        this._overriddenArrays = new WeakMap();
        this.observe(obj);
    }

    private _callback: ((newVal: any, oldVal: any, pathArray: string[]) => void) | null;
    private _root: T;
    private _options: Required<JsonObOptions>;
    private _observedObjects: WeakSet<any>;
    private _overriddenArrays: WeakMap<any, any>;
    private _isDestroyed = false;

    // 批量更新相关
    private _pendingChanges = new Map<string, { newVal: any, oldVal: any, path: string[] }>();
    private _batchTimer: any = null;

    /** 对象属性劫持 */
    private observe<T>(obj: T, path?: any) {
        if (this._isDestroyed) return;

        // 检查是否被冻结
        if (isFrozen(obj)) return;

        // 防止重复观察同一个对象
        if (this._observedObjects.has(obj)) return;
        this._observedObjects.add(obj);

        // 深度限制
        if (path && path.length >= this._options.maxDepth) {
            if (path.length === this._options.maxDepth) {
                console.warn(`JsonOb: 对象嵌套深度超过${this._options.maxDepth}层，停止监听`);
            }
            return;
        }

        if (OP.toString.call(obj) === types.array) {
            this.overrideArrayProto(obj, path);
        }

        // @ts-ignore
        Object.keys(obj).forEach((key) => {
            // 跳过冻结的属性
            if (this._options.frozenKeys.includes(key)) {
                return;
            }

            const self = this;
            // @ts-ignore
            let oldVal = obj[key];
            const pathArray = path ? [...path, key] : [key];

            Object.defineProperty(obj, key, {
                get: function () {
                    return oldVal;
                },
                set: function (newVal) {
                    if (self._isDestroyed) return;

                    if (oldVal !== newVal) {
                        const ov = oldVal;
                        oldVal = newVal;

                        // 如果新值是对象，继续监听
                        if (OP.toString.call(newVal) === types.obj && !isFrozen(newVal)) {
                            self.observe(newVal, pathArray);
                        }

                        // 触发回调
                        self.triggerChange(newVal, ov, pathArray);
                    }
                },
                enumerable: true,
                configurable: true
            });

            // @ts-ignore
            const o = obj[key];
            if ((OP.toString.call(o) === types.obj || OP.toString.call(o) === types.array) && !isFrozen(o)) {
                this.observe(o, pathArray);
            }
        }, this);
    }

    /**
     * 对数组类型进行动态绑定（优化版）
     */
    private overrideArrayProto(array: any, path: any) {
        if (this._isDestroyed) return;

        // 检查是否已经重写过该数组
        if (this._overriddenArrays.has(array)) return;

        const originalProto = Array.prototype;
        const overrideProto = Object.create(Array.prototype);
        const self = this;

        this._overriddenArrays.set(array, originalProto);

        // 修改型方法
        const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'splice'];

        mutatingMethods.forEach((method: any) => {
            Object.defineProperty(overrideProto, method, {
                value: function () {
                    if (self._isDestroyed) return originalProto[method].apply(this, arguments);

                    const oldVal = this.slice();
                    const result = originalProto[method].apply(this, arguments);

                    // 优化：只监听新增的元素
                    if (method === 'push' || method === 'unshift') {
                        const newItems = Array.from(arguments);
                        const startIndex = method === 'push' ? this.length - newItems.length : 0;

                        newItems.forEach((item, index) => {
                            if ((OP.toString.call(item) === types.obj || OP.toString.call(item) === types.array) && !isFrozen(item)) {
                                const itemPath = path ? [...path, (startIndex + index).toString()] : [(startIndex + index).toString()];
                                self.observe(item, itemPath);
                            }
                        });
                    } else if (method === 'splice') {
                        // splice 可能添加新元素
                        const startIndex = arguments[0];
                        const newItems = Array.prototype.slice.call(arguments, 2);

                        newItems.forEach((item, index) => {
                            if ((OP.toString.call(item) === types.obj || OP.toString.call(item) === types.array) && !isFrozen(item)) {
                                const itemPath = path ? [...path, (startIndex + index).toString()] : [(startIndex + index).toString()];
                                self.observe(item, itemPath);
                            }
                        });
                    }

                    // 触发回调
                    self.triggerChange(this, oldVal, path ? path.slice() : path);
                    return result;
                },
                writable: true,
                configurable: true,
                enumerable: false
            });
        });

        // 使用 Object.setPrototypeOf 代替直接修改 __proto__
        try {
            Object.setPrototypeOf(array, overrideProto);
        } catch (e) {
            // 降级方案
            array['__proto__'] = overrideProto;
        }
    }

    /**
     * 触发变化回调
     */
    private triggerChange(newVal: any, oldVal: any, pathArray: string[]) {
        if (this._options.enableBatch) {
            this.queueChange(newVal, oldVal, pathArray);
        } else {
            this._callback?.(newVal, oldVal, pathArray.slice());
        }
    }

    /**
     * 批量更新：将变化加入队列
     */
    private queueChange(newVal: any, oldVal: any, pathArray: string[]) {
        const pathKey = pathArray.join('.');

        const existing = this._pendingChanges.get(pathKey);
        this._pendingChanges.set(pathKey, {
            newVal,
            oldVal: existing ? existing.oldVal : oldVal,
            path: pathArray
        });

        this.scheduleBatchUpdate();
    }

    /**
     * 调度批量更新
     */
    private scheduleBatchUpdate() {
        if (this._batchTimer !== null) return;

        this._batchTimer = setTimeout(() => {
            this.flushChanges();
        }, this._options.batchDelay);
    }

    /**
     * 刷新所有待处理的变化
     */
    private flushChanges() {
        if (this._isDestroyed || !this._callback) return;

        this._pendingChanges.forEach((change) => {
            this._callback!(change.newVal, change.oldVal, change.path);
        });

        this._pendingChanges.clear();
        this._batchTimer = null;
    }

    /**
     * 立即刷新所有待处理的变化（仅在启用批量更新时有效）
     */
    flush() {
        if (this._batchTimer !== null) {
            clearTimeout(this._batchTimer);
            this._batchTimer = null;
        }
        this.flushChanges();
    }

    /**
     * 销毁监听，释放内存
     */
    destroy() {
        if (this._isDestroyed) return;

        this._isDestroyed = true;

        // 刷新待处理的变化
        if (this._options.enableBatch) {
            this.flush();
        }

        // 清理定时器
        if (this._batchTimer !== null) {
            clearTimeout(this._batchTimer);
            this._batchTimer = null;
        }

        // 清空引用
        this._callback = null;
        // @ts-ignore
        this._root = null;
        this._pendingChanges.clear();
    }
}

