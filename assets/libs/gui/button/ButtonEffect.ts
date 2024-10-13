/*
 * @Author: dgflash
 * @Date: 2023-01-30 14:00:41
 * @LastEditors: dgflash
 * @LastEditTime: 2023-02-09 10:54:28
 */
import { Animation, AnimationClip, EventTouch, Node, Sprite, _decorator } from "cc";
import { oops } from "../../../core/Oops";
import ButtonSimple from "./ButtonSimple";

const { ccclass, property, menu } = _decorator;

/** 有特效按钮 */
@ccclass("ButtonEffect")
@menu('OopsFramework/Button/ButtonEffect （有特效按钮）')
export default class ButtonEffect extends ButtonSimple {
    @property({
        tooltip: "是否开启"
    })
    disabledEffect: boolean = false;

    private anim!: Animation;

    /** 按钮禁用效果 */
    get grayscale(): boolean {
        return this.node.getComponent(Sprite)!.grayscale;
    }
    set grayscale(value: boolean) {
        if (this.node.getComponent(Sprite)) {
            this.node.getComponent(Sprite)!.grayscale = value;
        }
    }

    onLoad() {
        this.anim = this.node.addComponent(Animation);

        var ac_start: AnimationClip = oops.res.get("common/anim/button_scale_start", AnimationClip)!;
        var ac_end: AnimationClip = oops.res.get("common/anim/button_scale_end", AnimationClip)!;
        this.anim.defaultClip = ac_start;
        this.anim.createState(ac_start, ac_start?.name);
        this.anim.createState(ac_end, ac_end?.name);

        this.node.on(Node.EventType.TOUCH_START, this.onTouchtStart, this);

        super.onLoad();
    }

    protected onTouchtStart(event: EventTouch) {
        if (!this.disabledEffect) {
            this.anim.play("button_scale_start");
        }
    }

    protected onTouchEnd(event: EventTouch) {
        if (!this.disabledEffect) {
            this.anim.play("button_scale_end");
        }

        super.onTouchEnd(event);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchtStart, this);
        super.onDestroy();
    }
}