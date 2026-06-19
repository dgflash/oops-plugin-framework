/**
 * 防连点装饰器
 *
 * 提供方法防抖功能，防止用户在短时间内连续点击触发多次调用。
 * 在指定间隔内，重复调用会被忽略。
 *
 * 使用方式：
 * 1. 装饰器方式：@debounce.click() 或 @debounce.click(1000)
 * 2. 手动包装方式：debounce.wrap(this.onClick, 500, this)
 *    当微信小游戏构建导致装饰器失效时，可用手动包装作为降级方案
 *
 * @example
 * ```typescript
 * class GameView {
 *     // 默认间隔 500ms
 *     @debounce.click()
 *     onClickConfirm() {
 *         console.log('确认按钮被点击');
 *     }
 *
 *     // 自定义间隔 1000ms
 *     @debounce.click(1000)
 *     onClickSubmit() {
 *         console.log('提交按钮被点击');
 *     }
 *
 *     // 带回调的防连点，被拦截时触发
 *     @debounce.click(500, 'onDebounced')
 *     onClickPay() {
 *         console.log('支付按钮被点击');
 *     }
 *
 *     // 被拦截时的回调（可选）
 *     private onDebounced() {
 *         console.log('操作太频繁，请稍后再试');
 *     }
 * }
 * ```
 */
export namespace debounce {
    /**
     * 防连点方法装饰器
     * @param interval 防连点间隔时间（毫秒），默认 500ms
     * @param rejectMethodName 被拦截时调用的回调方法名（可选）
     */
    export function click(interval: number = DEFAULT_INTERVAL, rejectMethodName?: string): MethodDecorator {
        return function (
            _target: any,
            propertyKey: string | symbol,
            descriptor: PropertyDescriptor
        ): PropertyDescriptor {
            const originalMethod = descriptor.value;
            if (typeof originalMethod !== 'function') {
                console.warn(`[DebounceDecorator] @debounce.click() 只能用于方法，${String(propertyKey)} 不是函数`);
                return descriptor;
            }
            // WeakMap 存储每个实例的上次调用时间，避免实例属性污染
            const timeMap = new WeakMap<object, number>();
            descriptor.value = function (this: any, ...args: any[]) {
                const now = Date.now();
                const lastCall = timeMap.get(this) || 0;
                if (now - lastCall < interval) {
                    if (rejectMethodName && typeof this[rejectMethodName] === 'function') {
                        this[rejectMethodName]();
                    }
                    return;
                }
                timeMap.set(this, now);
                return originalMethod.apply(this, args);
            };
            return descriptor;
        };
    }

    /**
     * 手动包装防连点（装饰器在微信小游戏构建失效时的降级方案）
     * @param fn 需要防连点的函数
     * @param interval 间隔时间（毫秒），默认 500ms
     * @param context 函数绑定的 this 上下文（可选）
     * @returns 包装后的防连点函数
     *
     * @example
     * ```typescript
     * class GameView extends Component {
     *     private debouncedClick: Function;
     *
     *     onLoad() {
     *         // 手动包装，适用于装饰器失效的场景
     *         this.debouncedClick = debounce.wrap(this.onClick, 500, this);
     *     }
     *
     *     onClick() {
     *         console.log('点击');
     *     }
     * }
     * ```
     */
    export function wrap<T extends (...args: any[]) => any>(
        fn: T,
        interval: number = DEFAULT_INTERVAL,
        context?: any
    ): T {
        let lastCall = 0;
        const wrapped = function (this: any, ...args: any[]) {
            const now = Date.now();
            if (now - lastCall < interval) return;
            lastCall = now;
            return fn.apply(context ?? this, args);
        };
        return wrapped as T;
    }

    // ========================================
    // 内部常量
    // ========================================

    /** 默认防连点间隔（毫秒） */
    const DEFAULT_INTERVAL = 500;
}
