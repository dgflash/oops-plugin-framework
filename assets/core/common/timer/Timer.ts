/*
 * @Author: dgflash
 * @Date: 2023-01-19 11:09:38
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-19 14:28:05
 */

/**
 * 定时触发组件
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037964&doc_id=2873565
 * @example
    export class Test extends Component {
        // 创建一个定时跳动组件
        private timer: Timer = new Timer(1);

        update(dt: number) {
            if (this.timer.update(this.dt)) {
                console.log(每一秒触发一次);
            }
        }
    }
 */
export class Timer {
    callback: Function | null = null;

    private _elapsedTime = 0;

    get elapsedTime(): number {
        return this._elapsedTime;
    }

    private _step = -1;
    /** 触发间隔时间（秒） */
    get step(): number {
        return this._step;
    }
    set step(step: number) {
        this._step = step; // 每次修改时间
        this._elapsedTime = 0; // 逝去时间
    }

    get progress(): number {
        // 添加零除数检查，避免 NaN
        return this._step > 0 ? this._elapsedTime / this._step : 0;
    }

    /**
     * 定时触发组件
     * @param step  触发间隔时间（秒）
     */
    constructor(step = 0) {
        this.step = step;
    }

    /**
     * 更新定时器
     * @param dt 增量时间（秒）
     * @returns 如果定时器触发返回 true，否则返回 false
     */
    update(dt: number): boolean {
        // 快速返回，避免不必要的计算
        if (this._step <= 0) return false;

        this._elapsedTime += dt;

        // 使用局部变量缓存，减少属性访问
        const step = this._step;
        if (this._elapsedTime >= step) {
            // 修正时间累积误差：当累积时间远大于步长时，使用取模运算
            // 避免长时间运行后的精度损失
            if (this._elapsedTime >= step * 2) {
                this._elapsedTime = this._elapsedTime % step;
            } 
            else {
                this._elapsedTime -= step;
            }
            
            // 优化回调调用，避免可选链和 call 的开销
            if (this.callback) {
                this.callback.call(this);
            }
            return true;
        }
        return false;
    }

    /**
     * 重置定时器，清除已累积的时间
     */
    reset(): void {
        this._elapsedTime = 0;
    }

    /**
     * 停止定时器
     */
    stop(): void {
        this._elapsedTime = 0;
        this._step = -1;
    }

    /**
     * 销毁定时器，释放内存
     */
    destroy(): void {
        this.callback = null;
        this._elapsedTime = 0;
        this._step = -1;
    }
}
