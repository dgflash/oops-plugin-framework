/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 * @LastEditTime: 2022-04-14 18:15:42
 */
import type { EventTouch } from 'cc';
import { EventHandler, _decorator } from 'cc';
import ButtonEffect from './ButtonEffect';

const { ccclass, property, menu } = _decorator;

/** 长按按钮 */
@ccclass('ButtonTouchLong')
@menu('OopsFramework/Button/ButtonTouchLong （长按按钮）')
export class ButtonTouchLong extends ButtonEffect {
    @property({
        tooltip: '长按时间（秒）'
    })
    time = 1;

    @property({
        type: [EventHandler],
        tooltip: '长按事件回调'
    })
    longPressEvents: EventHandler[] = [];

    /** 已经过的时间 */
    protected _passTime = 0;
    /** 是否已触发长按 */
    protected _isTouchLong = false;
    /** 触摸事件引用 */
    protected _event: EventTouch | null = null;

    onLoad() {
        this._isTouchLong = false;
        super.onLoad();
    }

    /** 触摸开始 */
    protected onTouchStart(event: EventTouch) {
        this._event = event;
        this._passTime = 0;
        this._isTouchLong = false;
        super.onTouchStart(event);
    }

    /** 触摸结束 */
    protected onTouchEnd(event: EventTouch) {
        if (this._passTime >= this.time) {
            event.propagationStopped = true;
        }
        this.removeTouchLong();

        super.onTouchEnd(event);
    }

    /** 移除长按状态 */
    protected removeTouchLong() {
        this._event = null;
        this._passTime = 0;
        this._isTouchLong = false;
    }

    /** 引擎更新事件 */
    protected update(dt: number) {
        // 仅在有触摸事件且未触发长按时才计算
        if (this._event && !this._isTouchLong) {
            this._passTime += dt;

            if (this._passTime >= this.time) {
                this._isTouchLong = true;

                // 触发长按事件
                this.longPressEvents.forEach((event) => {
                    event.emit([event.customEventData]);
                });

                // 长按触摸音效（只播放一次）
                this.playEffect();

                this.removeTouchLong();
            }
        }
    }

    /** 组件销毁时的清理工作 */
    onDestroy() {
        // 清理事件引用
        this._event = null;
        this.longPressEvents = [];
        
        super.onDestroy();
    }
}
