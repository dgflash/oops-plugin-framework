import { Component, Label, Node, _decorator } from 'cc';
import { EDITOR } from 'cc/env';
import { oops } from '../../../core/Oops';
import { EventMessage } from '../../../core/common/event/EventMessage';
import { TimeUtil } from '../../../core/utils/TimeUtils';

const { ccclass, property, menu, requireComponent } = _decorator;

/** 倒计时标签（组合方式实现，不继承 Label） */
@ccclass('LabelTime')
@requireComponent(Label)
@menu('OopsFramework/Label/LabelTime （倒计时标签）')
export class LabelTime extends Component {
    /** 目标 Label 组件，自动获取当前节点上的 Label */
    private targetLabel: Label | null = null;

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
    onSecond: ((node: Node) => void) | null = null;
    /** 倒计时完成事件回调 */
    onComplete: ((node: Node) => void) | null = null;

    protected onLoad() {
        // 获取 Label 组件（@requireComponent 确保 Label 一定存在）
        this.targetLabel = this.getComponent(Label);

        if (!EDITOR) {
            oops.message.on(EventMessage.GAME_SHOW, this.onGameShow, this);
            oops.message.on(EventMessage.GAME_HIDE, this.onGameHide, this);
        }
    }

    protected start() {
        // 无论 countDown 是多少，都先格式化显示一次
        this.format();

        if (this.countDown > 0) {
            this.timingStart();
        }
    }

    protected onEnable() {
        if (!EDITOR) {
            this.onGameShow();
        }
    }

    protected onDisable() {
        if (!EDITOR) {
            this.onGameHide();
        }
    }

    protected onDestroy() {
        if (!EDITOR) {
            oops.message.off(EventMessage.GAME_SHOW, this.onGameShow, this);
            oops.message.off(EventMessage.GAME_HIDE, this.onGameHide, this);
        }

        // 清理回调函数引用，防止内存泄漏
        this.onSecond = null;
        this.onComplete = null;

        // 停止计时
        this.timingEnd();
    }

    private replace(value: string, ...args: (string | number)[]): string {
        return value.replace(/\{(\d+)\}/g, (m, i) => {
            return String(args[i]);
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
            // 处理 day/days 单复数，使用正则确保替换完整单词
            if (date > 1) {
                df = df.replace(/\bday\b/g, 'days');
            } else {
                df = df.replace(/\bdays\b/g, 'day');
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

        // 更新目标 Label 的文本
        this.updateLabelString(this.result);
    }

    /** 更新 Label 文本 */
    private updateLabelString(str: string) {
        if (this.targetLabel) {
            this.targetLabel.string = str;
            // 强制更新渲染，确保在模拟器和原生平台上能正确显示
            this.targetLabel.updateRenderData(true);
        }
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
        this.countDown = second;
        this.timingEnd();
        this.timingStart();
        this.format();
    }

    /**
     * 设置结束时间戳倒计时
     * @param timeStamp     时间戳
     */
    setTimeStamp(timeStamp: number) {
        const seconds = TimeUtil.secsBetween(oops.timer.getServerTime(), timeStamp);
        this.countDown = Math.max(0, seconds); // 确保不会为负数
        this.timingEnd();
        this.timingStart();
        this.format();
    }

    /** 游戏从后台返回 */
    private onGameShow() {
        // 时间到了
        if (this.countDown <= 0) return;
        // 时间暂停
        if (this.paused) return;
        // 确保 backStartTime 有效
        if (this.backStartTime <= 0) return;

        // 计算间隔时间，但最多只减去当前 countDown（防止长时间后台导致过度减少）
        const rawInterval = Math.floor((oops.timer.getTime() - this.backStartTime) / 1000);
        const interval = Math.min(rawInterval, this.countDown);
        this.countDown -= interval;

        if (this.countDown <= 0) {
            this.countDown = 0;
            this.onScheduleComplete();
        }
        else {
            // 重新格式化显示
            this.format();
        }

        // 重置 backStartTime
        this.backStartTime = 0;
    }

    /** 游戏进入后台 */
    private onGameHide() {
        // 只有在非暂停状态下才记录后台开始时间
        if (!this.paused) {
            this.backStartTime = oops.timer.getTime();
        }
    }

    /** 每秒回调 */
    private onScheduleSecond() {
        if (this.countDown <= 0) {
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
        this.timingEnd();
        this.format();
        if (this.onComplete) {
            this.onComplete(this.node);
        }
    }

    /** 开始计时 */
    private timingStart() {
        // 先取消已有回调，避免重复注册
        this.unschedule(this.onScheduleSecond);
        this.schedule(this.onScheduleSecond, 1);
    }

    /** 关闭计时 */
    private timingEnd() {
        // 只取消特定的回调，避免影响其他组件
        this.unschedule(this.onScheduleSecond);
    }
}