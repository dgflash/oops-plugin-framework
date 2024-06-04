import { AudioClip, Button, EventTouch, _decorator, game } from "cc";
import { oops } from "../../../core/Oops";

const { ccclass, property, menu } = _decorator;

/** 
 * 通用按钮
 * 1、防连点
 * 2、按钮点击触发音效
 */
@ccclass("UIButton")
@menu('ui/button/UIButton')
export default class UIButton extends Button {
    @property({
        tooltip: "每次触发间隔"
    })
    private interval: number = 500;

    @property({
        tooltip: "是否只触发一次"
    })
    private once: boolean = false;

    @property({
        tooltip: "触摸音效",
        type: AudioClip
    })
    private effect: AudioClip = null!;

    /** 触摸次数 */
    private _touchCount = 0;
    /** 触摸结束时间 */
    private _touchEndTime = 0;

    /** 触摸结束 */
    protected _onTouchEnded(event: EventTouch) {
        // 是否只触发一次
        if (this.once) {
            if (this._touchCount > 0) {
                event.propagationStopped = true;
                return;
            }
            this._touchCount++;
        }

        // 防连点500毫秒出发一次事件
        if (this._touchEndTime && game.totalTime - this._touchEndTime < this.interval) {
            event.propagationStopped = true;
        }
        else {
            this._touchEndTime = game.totalTime;
            super._onTouchEnded(event);
        }

        // 短按触摸音效
        if (this.effect) oops.audio.playEffect(this.effect);
    }

    onDestroy() {
        if (this.effect) oops.audio.releaseEffect(this.effect);
    }
}
