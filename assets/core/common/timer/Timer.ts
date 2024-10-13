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

    private _elapsedTime: number = 0;

    get elapsedTime(): number {
        return this._elapsedTime;
    }

    private _step: number = -1;
    /** 触发间隔时间（秒） */
    get step(): number {
        return this._step;
    }
    set step(step: number) {
        this._step = step;                     // 每次修改时间
        this._elapsedTime = 0;                 // 逝去时间
    }

    get progress(): number {
        return this._elapsedTime / this._step;
    }

    /**
     * 定时触发组件
     * @param step  触发间隔时间（秒）
     */
    constructor(step: number = 0) {
        this.step = step;
    }

    update(dt: number) {
        if (this.step <= 0) return false;

        this._elapsedTime += dt;

        if (this._elapsedTime >= this._step) {
            this._elapsedTime -= this._step;
            this.callback?.call(this);
            return true;
        }
        return false;
    }

    reset() {
        this._elapsedTime = 0;
    }

    stop() {
        this._elapsedTime = 0;
        this.step = -1;
    }
}