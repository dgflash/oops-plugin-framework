import { Component } from "cc";
import { StringUtil } from "../../utils/StringUtil";
import { EventDispatcher } from "../event/EventDispatcher";

/** 时间管理 */
export class TimerManager extends EventDispatcher {
    private static times: any = {};
    private schedules: any = {};
    private scheduleCount: number = 1;

    private initTime: number = (new Date()).getTime();      // 当前游戏进入的时间毫秒值
    private component: Component;

    // 服务器时间与本地时间同步
    private serverTime: number = 0;

    /**
     * 构造函数
     * @param component cc.Component对象
     */
    constructor(component: Component) {
        super();
        this.component = component;
        this.schedule(this.onUpdate.bind(this), 1);
    }

    /**
     * 服务器时间与本地时间同步
     * @param val   服务器时间刻度
     * 
     */
    setServerTime(val?: number): number {
        if (val) {
            this.serverTime = val;
        }
        return this.serverTime;
    }
    getServerTime(): number {
        return this.serverTime + this.getTime();
    }

    /**
     * 格式化日期显示
     * @param format 格式化字符串（例：yyyy-MM-dd hh:mm:ss）
     * @param date   时间对象
     */
    format(format: string, date: Date): string {
        let o: any = {
            "M+": date.getMonth() + 1,                      // month 
            "d+": date.getDate(),                           // day 
            "h+": date.getHours(),                          // hour 
            "m+": date.getMinutes(),                        // minute 
            "s+": date.getSeconds(),                        // second 
            "q+": Math.floor((date.getMonth() + 3) / 3),    // quarter 
            "S": date.getMilliseconds()                     // millisecond 
        }
        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }

        for (let k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
            }
        }
        return format;
    }

    /** 获取游戏开始到现在逝去的时间 */
    getTime(): number {
        return this.getLocalTime() - this.initTime;
    }

    /** 获取本地时间刻度 */
    getLocalTime(): number {
        return Date.now();
    }

    /**
     * 注册一个固定间隔时间的触发器
     * @param callback  触发时的回调方法
     * @param interval  固定间隔触发时间
     * @returns string
     * @example
    oops.timer.schedule(()=>{
        // 每秒触发一次
    }, 1000);
     */
    schedule(callback: Function, interval: number): string {
        let uuid = `schedule_${this.scheduleCount++}`
        this.schedules[uuid] = callback;
        this.component.schedule(callback, interval);
        return uuid;
    }

    /**
     * 注册一个只触发一次的延时的触发器
     * @param callback  触发时的回调方法
     * @param delay     延时触发时间
     * @returns string
     * @example
    oops.timer.scheduleOnce(()=>{
        // 1秒后触发一次后不会在触发
    }, 1000);
     */
    scheduleOnce(callback: Function, delay: number = 0): string {
        let uuid = `scheduleOnce_${this.scheduleCount++}`;
        this.schedules[uuid] = callback;
        this.component.scheduleOnce(() => {
            let cb = this.schedules[uuid];
            if (cb) {
                cb();
            }
            this.unschedule(uuid);
        }, Math.max(delay, 0));
        return uuid;
    }

    /**
     * 删除一个时间触发器
     * @param uuid  唯一标识
     * @example
    var uuid = oops.timer.schedule(()=>{
        // 每秒触发一次
    }, 1000);

    // 删除指定标识的触发器
    oops.timer.unschedule(uuid);
     */
    unschedule(uuid: string) {
        let cb = this.schedules[uuid];
        if (cb) {
            this.component.unschedule(cb);
            delete this.schedules[uuid];
        }
    }

    /** 删除所有时间触发器  */
    unscheduleAll() {
        for (let k in this.schedules) {
            this.component.unschedule(this.schedules[k]);
        }
        this.schedules = {};
    }

    private onUpdate(dt: number) {
        // 后台管理倒计时完成事件
        for (let key in TimerManager.times) {
            let data = TimerManager.times[key];
            if (data.object[data.field] > 0) {
                data.object[data.field]--;

                if (data.object[data.field] == 0) {
                    this.onTimerComplete(data);
                }
                else {                                                          // 修改是否完成状态
                    if (data.onSecond) {
                        data.onSecond.call(data.object);                        // 触发每秒回调事件  
                    }
                }
            }
        }
    }

    /** 触发倒计时完成事件 */
    private onTimerComplete(data: any) {
        if (data.onComplete) data.onComplete.call(data.object);
        if (data.event) this.dispatchEvent(data.event);
    }

    /**
     * 在指定对象上注册一个倒计时的回调管理器
     * @param object        注册定时器的对象
     * @param field         时间字段
     * @param onSecond      每秒事件
     * @param onComplete    倒计时完成事件
     * @returns 
     * @example
    export class Test extends Component {
        private timeId!: string;
        
        start() {
            // 在指定对象上注册一个倒计时的回调管理器
            this.timeId = oops.timer.register(this, "countDown", this.onSecond, this.onComplete);
        }
        
        private onSecond() {
            console.log("每秒触发一次");
        }

        private onComplete() {
            console.log("倒计时完成触发");
        }
    }
     */
    register(object: any, field: string, onSecond: Function, onComplete: Function): any {
        let data: any = {};
        data.id = StringUtil.guid();
        data.object = object;                                   // 管理对象
        data.field = field;                                     // 时间字段
        data.onSecond = onSecond;                               // 每秒事件
        data.onComplete = onComplete;                           // 倒计时完成事件
        TimerManager.times[data.id] = data;
        return data.id;
    }

    /** 
     * 在指定对象上注销一个倒计时的回调管理器 
     * @param id         时间对象唯一表示
     * @example
    export class Test extends Component {
        private timeId!: string;

        start() {
            this.timeId = oops.timer.register(this, "countDown", this.onSecond, this.onComplete);
        }

        onDestroy() {
            // 在指定对象上注销一个倒计时的回调管理器
            oops.timer.unRegister(this.timeId);
        }
    }
     */
    unRegister(id: string) {
        if (TimerManager.times[id])
            delete TimerManager.times[id];
    }

    /** 游戏最小化时记录时间数据 */
    save() {
        for (let key in TimerManager.times) {
            TimerManager.times[key].startTime = this.getTime();
        }
    }

    /** 游戏最大化时回复时间数据 */
    load() {
        for (let key in TimerManager.times) {
            let interval = Math.floor((this.getTime() - (TimerManager.times[key].startTime || this.getTime())) / 1000);
            let data = TimerManager.times[key];
            data.object[data.field] = data.object[data.field] - interval;
            if (data.object[data.field] < 0) {
                data.object[data.field] = 0;
                this.onTimerComplete(data);
            }
            TimerManager.times[key].startTime = null;
        }
    }
}

/** 
 * 定时跳动组件 
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
    /** 定时到了回调 */
    callback: Function | null = null;

    private _elapsedTime: number = 0;

    /** 逝去时间 */
    get elapsedTime(): number {
        return this._elapsedTime;
    }

    private _step: number = 0;
    /** 获取触发间隔时间单位秒 */
    get step(): number {
        return this._step;
    }
    /** 设置触发间隔时间单位秒 */
    set step(step: number) {
        this._step = step;                     // 每次修改时间
        this._elapsedTime = 0;                 // 逝去时间
    }

    /** 进度 */
    get progress(): number {
        return this._elapsedTime / this._step;
    }

    /**
     * 构造函数
     * @param step 每跳动一次步长单位位
     */
    constructor(step: number = 0) {
        this.step = step;
    }

    /** 游戏引擎的cc.Component组件的update方法调用 */
    update(dt: number) {
        this._elapsedTime += dt;

        if (this._elapsedTime >= this._step) {
            this._elapsedTime -= this._step;
            this.callback?.call(this);
            return true;
        }
        return false;
    }

    /** 重置 */
    reset() {
        this._elapsedTime = 0;
    }
}