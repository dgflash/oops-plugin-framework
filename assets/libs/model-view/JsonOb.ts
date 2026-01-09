/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 17:18:05
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
const OAM = ['push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'splice'];

/**
 * 实现属性拦截的类
 */
export class JsonOb<T> {
    constructor(obj: T, callback: (newVal: any, oldVal: any, pathArray: string[]) => void) {
        if (OP.toString.call(obj) !== types.obj && OP.toString.call(obj) !== types.array) {
            console.error('请传入一个对象或数组');
        }
        this._callback = callback;
        this._root = obj;
        this._observedObjects = new WeakSet();
        this._overriddenArrays = new WeakMap();
        this.observe(obj);
    }

    private _callback;
    private _root: T;
    private _observedObjects: WeakSet<any>;
    private _overriddenArrays: WeakMap<any, any>;
    private _isDestroyed = false;

    /** 对象属性劫持 */
    private observe<T>(obj: T, path?: any) {
        if (this._isDestroyed) return;
        
        // 防止重复观察同一个对象
        if (this._observedObjects.has(obj)) return;
        this._observedObjects.add(obj);

        // 深度限制，防止过深递归（最大深度10）
        if (path && path.length > 10) {
            console.warn('JsonOb: 对象嵌套深度超过10层，停止监听');
            return;
        }

        if (OP.toString.call(obj) === types.array) {
            this.overrideArrayProto(obj, path);
        }

        // @ts-ignore  注：避免API生成工具报错
        Object.keys(obj).forEach((key) => {
            const self = this;
            // @ts-ignore
            let oldVal = obj[key];
            // 创建路径数组的副本，避免引用问题
            const pathArray = path ? [...path, key] : [key];
            
            Object.defineProperty(obj, key, {
                get: function () {
                    return oldVal;
                },
                set: function (newVal) {
                    if (self._isDestroyed) return;
                    
                    if (oldVal !== newVal) {
                        if (OP.toString.call(newVal) === types.obj) {
                            self.observe(newVal, pathArray);
                        }

                        const ov = oldVal;
                        oldVal = newVal;
                        // 传递路径数组的副本，防止外部修改
                        self._callback(newVal, ov, pathArray.slice());
                    }
                }
            });

            // @ts-ignore
            const o = obj[key];
            if (OP.toString.call(o) === types.obj || OP.toString.call(o) === types.array) {
                this.observe(o, pathArray);
            }
        }, this);
    }

    /**
     * 对数组类型进行动态绑定
     * @param array
     * @param path
     */
    private overrideArrayProto(array: any, path: any) {
        if (this._isDestroyed) return;
        
        // 检查是否已经重写过该数组
        if (this._overriddenArrays.has(array)) return;

        // 保存原始 Array 原型
        const originalProto = Array.prototype;
        // 通过 Object.create 方法创建一个对象，该对象的原型是Array.prototype
        const overrideProto = Object.create(Array.prototype);
        const self = this;
        
        // 存储原始原型引用，用于后续恢复
        this._overriddenArrays.set(array, originalProto);

        // 遍历要重写的数组方法
        OAM.forEach((method: any) => {
            Object.defineProperty(overrideProto, method, {
                value: function () {
                    if (self._isDestroyed) return originalProto[method].apply(this, arguments);
                    
                    const oldVal = this.slice();
                    // 调用原始原型上的方法
                    const result = originalProto[method].apply(this, arguments);
                    // 继续监听新数组
                    self.observe(this, path);
                    // 传递路径数组的副本
                    self._callback(this, oldVal, path ? path.slice() : path);
                    return result;
                },
                writable: true,
                configurable: true
            });
        });

        // 使用 Object.setPrototypeOf 代替直接修改 __proto__（更安全）
        try {
            Object.setPrototypeOf(array, overrideProto);
        } catch (e) {
            // 降级方案：如果不支持 setPrototypeOf，使用 __proto__
            array['__proto__'] = overrideProto;
        }
    }

    /**
     * 销毁监听，释放内存
     * 注意：无法完全恢复属性劫持，但可以停止回调和清理引用
     */
    destroy() {
        if (this._isDestroyed) return;
        
        this._isDestroyed = true;
        
        // 清空回调引用
        // @ts-ignore
        this._callback = null;
        
        // 尝试恢复数组原型（只能恢复我们记录的）
        // 注意：由于 WeakMap 的特性，这里无法遍历所有数组
        // 但当数组被垃圾回收时，WeakMap 会自动清理
        
        // 清空引用
        // @ts-ignore
        this._root = null;
    }
}
