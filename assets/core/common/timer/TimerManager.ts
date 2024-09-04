/*
 * @Author: dgflash
 * @Date: 2023-01-19 10:33:49
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-19 14:37:19
 */
import { Component, game } from "cc";
import { StringUtil } from "../../utils/StringUtil";
import { Timer } from "./Timer";

/** 时间管理 */
export class TimerManager extends Component {
    /** 倒计时数据 */
    private times: any = {};
    /** 服务器时间 */
    private date_s: Date = new Date();
    /** 服务器初始时间 */
    private date_s_start: Date = new Date();
    /** 服务器时间后修正时间 */
    private polymeric_s: number = 0;
    /** 客户端时间 */
    private date_c: Date = new Date();

    /** 后台管理倒计时完成事件 */
    protected update(dt: number) {
        for (let key in this.times) {
            let data = this.times[key];
            let timer = data.timer as Timer;
            if (timer.update(dt)) {
                if (data.object[data.field] > 0) {
                    data.object[data.field]--;

                    // 倒计时结束触发
                    if (data.object[data.field] == 0) {
                        this.onTimerComplete(data);
                    }
                    // 触发每秒回调事件  
                    else if (data.onSecond) {
                        data.onSecond.call(data.object);
                    }
                }
            }
        }
    }

    /** 触发倒计时完成事件 */
    private onTimerComplete(data: any) {
        if (data.onComplete) data.onComplete.call(data.object);
        if (data.event) this.node.dispatchEvent(data.event);

        delete this.times[data.id];
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
    register(object: any, field: string, onSecond: Function, onComplete: Function): string {
        const timer = new Timer();
        timer.step = 1;

        let data: any = {};
        data.id = StringUtil.guid();
        data.timer = timer;
        data.object = object;                                   // 管理对象
        data.field = field;                                     // 时间字段
        data.onSecond = onSecond;                               // 每秒事件
        data.onComplete = onComplete;                           // 倒计时完成事件
        this.times[data.id] = data;
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
        if (this.times[id]) delete this.times[id];
    }

    /**
     * 服务器时间与本地时间同步
     * @param value   服务器时间刻度
     */
    setServerTime(value: number): void {
        this.polymeric_s = this.getTime();
        this.date_s_start.setTime(value);
    }

    /** 获取写服务器同步的时间刻度 */
    getServerTime(): number {
        return this.date_s_start.getTime() + this.getTime() - this.polymeric_s;
    }

    /** 获取服务器时间对象 */
    getServerDate(): Date {
        this.date_s.setTime(this.getServerTime());
        return this.date_s;
    }

    /** 获取本地时间刻度 */
    getClientTime(): number {
        return Date.now();
    }

    /** 获取本地时间对象 */
    getClientDate(): Date {
        this.date_c.setTime(this.getClientTime());
        return this.date_c;
    }

    /** 获取游戏开始到现在逝去的时间 */
    getTime(): number {
        return game.totalTime;
    }

    /** 游戏最小化时记录时间数据 */
    save(): void {
        for (let key in this.times) {
            this.times[key].startTime = this.getTime();
        }
    }

    /** 游戏最大化时回复时间数据 */
    load(): void {
        for (let key in this.times) {
            let interval = Math.floor((this.getTime() - (this.times[key].startTime || this.getTime())) / 1000);
            let data = this.times[key];
            data.object[data.field] = data.object[data.field] - interval;
            if (data.object[data.field] <= 0) {
                data.object[data.field] = 0;
                this.onTimerComplete(data);
            }
            else {
                this.times[key].startTime = null;
            }
        }
    }
} 