/*
 * @Author: dgflash
 * @Date: 2023-01-30 14:00:41
 * @LastEditors: dgflash
 * @LastEditTime: 2023-02-09 10:54:28
 */
import type { EventTouch } from 'cc';
import { Animation, AnimationClip, Node, Sprite, _decorator } from 'cc';
import { oops } from '../../../core/Oops';
import ButtonSimple from './ButtonSimple';

const { ccclass, property, menu } = _decorator;

/** 有特效按钮 */
@ccclass('ButtonEffect')
@menu('OopsFramework/Button/ButtonEffect （有特效按钮）')
export default class ButtonEffect extends ButtonSimple {
    @property({
        tooltip: '是否开启'
    })
    disabledEffect = false;

    private anim: Animation | null = null;

    /** 按钮禁用效果 */
    get grayscale(): boolean {
        const sprite = this.node.getComponent(Sprite);
        return sprite ? sprite.grayscale : false;
    }
    set grayscale(value: boolean) {
        const sprite = this.node.getComponent(Sprite);
        if (sprite) {
            sprite.grayscale = value;
        }
    }

    onLoad() {
        this.anim = this.node.addComponent(Animation);

        const ac_start = oops.res.get('common/anim/button_scale_start', AnimationClip);
        const ac_end = oops.res.get('common/anim/button_scale_end', AnimationClip);

        if (ac_start && ac_end && this.anim) {
            this.anim.defaultClip = ac_start;
            this.anim.createState(ac_start, ac_start.name);
            this.anim.createState(ac_end, ac_end.name);
        } else {
            console.warn('[ButtonEffect] 动画资源加载失败或Animation组件创建失败');
        }

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);

        super.onLoad();
    }

    protected onTouchStart(event: EventTouch) {
        if (!this.disabledEffect && this.anim) {
            this.anim.play('button_scale_start');
        }
    }

    protected onTouchEnd(event: EventTouch) {
        if (!this.disabledEffect && this.anim) {
            this.anim.play('button_scale_end');
        }

        super.onTouchEnd(event);
    }

    /** 组件销毁时的清理工作 */
    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);

        // 清理动画组件引用
        if (this.anim) {
            this.anim.destroy();
            this.anim = null;
        }

        super.onDestroy();
    }
}
