import { Label, _decorator } from 'cc';
import { EDITOR } from 'cc/env';
import { oops } from '../../../core/Oops';
import { EventMessage } from '../../../core/common/event/EventMessage';
import { TimeUtil } from '../../../core/utils/TimeUtils';

const { ccclass, property, menu } = _decorator;

/** 倒计时标签 */
@ccclass('LabelTime')
@menu('OopsFramework/Label/LabelTime （倒计时标签）')
export default class LabelTime extends Label {
    @property({
        tooltip: '倒计时总时间（单位秒）',
    })
    countDown = 1000;

    @property({
        tooltip: '天数数据格式化',
    })
    dayFormat = '{0}天{1}小时';

    @property({
        tooltip: '时间格式化',
    })
    timeFormat = '{0}:{1}:{2}';

    @property({
        tooltip: '时间是否有固定两位数字',
    })
    zeroize = true;

    @property({
        tooltip: '游戏进入后台时暂停倒计时',
    })
    paused = false;

    /** 进入后台开始时间 */
    private backStartTime = 0;
    /** 时间能否由天数显示 */
    private dateDisable = false;
    /** 时间结果字符串 */
    private result = '';

    /** 每秒触发事件回调 */
    onSecond: ((node: any) => void) | null = null;
    /** 倒计时完成事件回调 */
    onComplete: ((node: any) => void) | null = null;

    private replace(value: string, ...args: any): string {
        return value.replace(/\{(\d+)\}/g, (m, i) => {
            return args[i];
        });
    }

    /** 格式化字符串 */
    private format() {
        let c: number = this.countDown;
        const date: number = Math.floor(c / 86400);
        c = c - date * 86400;
        let hours: number = Math.floor(c / 3600);
        c = c - hours * 3600;
        const minutes: number = Math.floor(c / 60);
        c = c - minutes * 60;
        const seconds: number = c;

        if (date === 0 && hours === 0 && minutes === 0 && seconds === 0) {
            if (this.zeroize) {
                this.result = this.replace(this.timeFormat, '00', '00', '00');
            }
            else {
                this.result = this.replace(this.timeFormat, '0', '0', '0');
            }
        }
        else if (date > 0 && !this.dateDisable) {
            let dataFormat = this.dayFormat;
            const index = dataFormat.indexOf('{1}');
            if (hours === 0 && index > -1) {
                dataFormat = dataFormat.substring(0, index);
            }
            let df = dataFormat;
            if (date > 1 && dataFormat.indexOf('days') < 0) {
                df = df.replace('day', 'days');
            }
            if (date < 2) {
                df = df.replace('days', 'day');
            }

            if (this.zeroize) {
                this.result = this.replace(df, date, this.coverString(hours));
            }
            else {
                this.result = this.replace(df, date, hours);
            }
        }
        else {
            hours += date * 24;
            if (this.zeroize) {
                this.result = this.replace(this.timeFormat, this.coverString(hours), this.coverString(minutes), this.coverString(seconds));
            }
            else {
                this.result = this.replace(this.timeFormat, hours, minutes, seconds);
            }
        }
        this.string = this.result;
    }

    /** 个位数的时间数据将字符串补位 */
    private coverString(value: number) {
        if (value < 10) return '0' + value;
        return value.toString();
    }

    /** 设置时间能否由天数显示 */
    setDateDisable(flag: boolean) {
        this.dateDisable = flag;
    }

    /**
     * 设置倒计时时间
     * @param second        倒计时时间（单位秒）
     */
    setTime(second: number) {
        this.countDown = second; // 倒计时，初始化显示字符串
        this.timing_end();
        this.timing_start();
        this.format();
    }

    /**
     * 设置结束时间戳倒计时
     * @param timeStamp     时间戳
     */
    setTimeStamp(timeStamp: number) {
        this.countDown = TimeUtil.secsBetween(oops.timer.getServerTime(), timeStamp);
        this.timing_end();
        this.timing_start();
        this.format();
    }

    onLoad() {
        if (!EDITOR) {
            oops.message.on(EventMessage.GAME_SHOW, this.onGameShow, this);
            oops.message.on(EventMessage.GAME_HIDE, this.onGameHide, this);
        }
    }

    start() {
        if (this.countDown <= 0) return;
        this.timing_start();
        this.format();
    }

    onEnable() {
        super.onEnable();
        if (!EDITOR) {
            this.onGameShow();
        }
    }

    onDisable() {
        super.onDisable();
        if (!EDITOR) {
            this.onGameHide();
        }
    }

    onDestroy() {
        if (!EDITOR) {
            oops.message.off(EventMessage.GAME_SHOW, this.onGameShow, this);
            oops.message.off(EventMessage.GAME_HIDE, this.onGameHide, this);
        }

        // 清理回调函数引用，防止内存泄漏
        this.onSecond = null;
        this.onComplete = null;

        // 停止计时
        this.timing_end();
    }

    /** 游戏从后台返回 */
    private onGameShow() {
        // 时间到了
        if (this.countDown <= 0) return;
        // 时间暂停
        if (this.paused) return;

        const interval = Math.floor((oops.timer.getTime() - (this.backStartTime || oops.timer.getTime())) / 1000);
        this.countDown -= interval;
        if (this.countDown < 0) {
            this.countDown = 0;
            this.onScheduleComplete();
        }
    }

    /** 游戏进入后台 */
    private onGameHide() {
        this.backStartTime = oops.timer.getTime();
    }

    /** 每秒回调 */
    private onScheduleSecond() {
        if (this.countDown === 0) {
            this.format();
            this.onScheduleComplete();
            return;
        }

        this.countDown--;
        this.format();
        if (this.onSecond) {
            this.onSecond(this.node);
        }

        if (this.countDown === 0) {
            this.onScheduleComplete();
        }
    }

    /** 倒计时完成 */
    private onScheduleComplete() {
        this.timing_end();
        this.format();
        this.unschedule(this.onScheduleSecond);
        if (this.onComplete) {
            this.onComplete(this.node);
        }
    }

    /** 开始计时 */
    timing_start() {
        this.schedule(this.onScheduleSecond, 1);
    }

    /** 关闭计时 */
    timing_end() {
        this.unscheduleAllCallbacks();
    }
}
