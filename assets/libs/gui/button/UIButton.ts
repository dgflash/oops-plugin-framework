import { AudioClip, Button, EventTouch, _decorator, game } from "cc";
import { oops } from "../../../core/Oops";
import { resLoader } from "../../../core/common/loader/ResLoader";

const { ccclass, property, menu } = _decorator;

/** 
 * 通用按钮
 * 1、防连点
 * 2、按钮点击触发音效
 */
@ccclass("UIButton")
@menu('OopsFramework/Button/UIButton （通用按钮）')
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
    // private effectIds: number[] = [];

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

            // 短按触摸音效
            this.playEffect();
        }
    }

    /** 短按触摸音效 */
    protected async playEffect() {
        if (this.effect) {
            oops.audio.playEffect(this.effect);
            // const effectId = await oops.audio.playEffect(this.effect, resLoader.defaultBundleName, () => {
            //     this.effectIds.remove(effectId);
            // });
            // if (effectId > 0) this.effectIds.push(effectId);
        }
    }

    // onDestroy() {
    //     if (this.effect) {
    //         this.effectIds.forEach(effectId => {
    //             console.log(effectId);
    //             oops.audio.putEffect(effectId, this.effect);
    //         });
    //     }
    // }
}
