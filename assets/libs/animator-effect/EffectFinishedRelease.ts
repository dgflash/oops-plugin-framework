/*
 * @Author: dgflash
 * @Date: 2021-12-30 19:16:47
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-05 09:39:33
 */

import { Animation, Component, _decorator } from 'cc';
import { EffectSingleCase } from './EffectSingleCase';
const { ccclass, property } = _decorator;

@ccclass('EffectFinishedRelease')
/** 动画播放完释放特效 */
export class EffectFinishedRelease extends Component {
    @property({ type: Animation, tooltip: '资源对象池类型名' })
    anim: Animation = null!;

    onLoad() {
        this.anim.on(Animation.EventType.FINISHED, this.onFinished, this);
        this.anim.on(Animation.EventType.LASTFRAME, this.onFinished, this);
    }

    protected onEnable() {
        this.anim.play();
    }

    private onFinished() {
        EffectSingleCase.instance.put(this.node);
    }
}
