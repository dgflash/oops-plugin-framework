/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-11 10:00:51
 */
import { _decorator } from 'cc';
import LabelNumber from './LabelNumber';

const { ccclass, property, menu } = _decorator;

/** 数值变化动画标签组件 */
@ccclass('LabelChange')
@menu('OopsFramework/Label/LabelChange （数值变化动画标签）')
export class LabelChange extends LabelNumber {
    @property({
        tooltip: '是否为整数'
    })
    isInteger = false;

    /** 持续时间 */
    private duration = 0;
    /** 完成回调 */
    private callback: (() => void) | null = null;
    /** 是否开始动画 */
    private isBegin = false;
    /** 变化速度 */
    private speed = 0;
    /** 最终值 */
    private end = 0;
    /** 当前数据（用于插值计算） */
    private _data = 0;

    /**
     * 变化到某个目标值
     * @param duration 持续时间（秒）
     * @param end 目标值
     * @param callback 完成回调
     */
    changeTo(duration: number, end: number, callback?: () => void) {
        if (duration === 0) {
            this.num = end;
            if (callback) callback();
            return;
        }
        this.playAnim(duration, this.num, end, callback);
    }

    /**
     * 在当前值基础上变化
     * @param duration 持续时间（秒）
     * @param value 变化量（可正可负）
     * @param callback 完成回调
     */
    changeBy(duration: number, value: number, callback?: () => void) {
        if (duration === 0) {
            this.num += value;
            if (callback) callback();
            return;
        }
        this.playAnim(duration, this.num, this.num + value, callback);
    }

    /** 
     * 立刻停止动画
     * @param excCallback 是否执行回调函数
     */
    stop(excCallback = true) {
        this.num = this.end;
        this.isBegin = false;
        if (excCallback && this.callback) {
            this.callback();
        }
        this.callback = null;
    }

    /** 
     * 播放数值变化动画
     * @param duration 持续时间（秒）
     * @param begin 起始值
     * @param end 结束值
     * @param callback 完成回调
     */
    private playAnim(duration: number, begin: number, end: number, callback?: () => void) {
        // 清理之前的回调，防止内存泄漏
        if (this.callback) {
            this.callback = null;
        }

        this.duration = duration;
        this.end = end;
        this.callback = callback || null;
        this.speed = (end - begin) / duration;

        this._data = begin;
        this.num = begin;
        this.isBegin = true;
    }

    /** 
     * 判断是否已经结束
     * @param num 当前数值
     */
    private isEnd(num: number): boolean {
        if (this.speed > 0) {
            return num >= this.end;
        }
        else {
            return num <= this.end;
        }
    }

    /** 引擎更新事件 */
    update(dt: number) {
        // 仅在动画播放时才执行
        if (!this.isBegin) {
            return;
        }

        // 如果已经到达目标值，结束动画
        if (this.num === this.end) {
            this.isBegin = false;
            if (this.callback) {
                const cb = this.callback;
                this.callback = null;
                cb();
            }
            return;
        }

        // 计算新的数值
        this._data += dt * this.speed;

        // 根据是否为整数进行不同处理
        if (this.isInteger) {
            if (this.speed > 0) {
                this.num = Math.floor(this._data);
            }
            else {
                this.num = Math.ceil(this._data);
            }
        }
        else {
            this.num = this._data;
        }

        // 检查是否完成
        if (this.isEnd(this._data)) {
            this.num = this.end;
            this.isBegin = false;
            if (this.callback) {
                const cb = this.callback;
                this.callback = null;
                cb();
            }
        }
    }

    /** 组件销毁时的清理工作 */
    onDestroy() {
        // 清理回调函数引用，防止内存泄漏
        this.callback = null;
        this.isBegin = false;
    }
}
