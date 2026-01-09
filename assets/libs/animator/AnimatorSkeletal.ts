/*
 * @Author: dgflash
 * @Date: 2021-06-30 13:56:26
 * @LastEditors: dgflash
 * @LastEditTime: 2021-11-04 10:46:00
 */

import { AnimationClip, CCFloat, game, SkeletalAnimation, _decorator } from 'cc';
import AnimatorAnimation from './AnimatorAnimation';

const { ccclass, property, requireComponent, disallowMultiple, menu, help } = _decorator;

/** 动画循环播放模式 */
const WRAP_MODE_LOOP = AnimationClip.WrapMode.Loop;
/** 动画单次播放模式 */
const WRAP_MODE_NORMAL = AnimationClip.WrapMode.Normal;

@ccclass
@disallowMultiple
@requireComponent(SkeletalAnimation)
@menu('OopsFramework/Animator/AnimatorSkeletal （骨骼动画状态机）')
@help('https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12036279&doc_id=2873565')
export class AnimatorSkeletal extends AnimatorAnimation {
    @property({
        type: CCFloat,
        tooltip: '动画切换过度时间'
    })
    private duration = 0.3;

    /** 防止切换动画时间少于间隔时间导致动画状态错乱的问题（毫秒） */
    private _crossDurationMs = 0;
    /** 上一次切换状态时间（毫秒） */
    private _lastSwitchTime = 0;

    onLoad() {
        this._crossDurationMs = this.duration * 1000;
    }

    /**
      * 播放动画
      * @override
      * @param animName 动画名
      * @param loop 是否循环播放
      */
    protected playAnimation(animName: string, loop: boolean) {
        if (!animName) {
            return;
        }

        const currentTime = game.totalTime;
        if (currentTime - this._lastSwitchTime > this._crossDurationMs) {
            this._animation.crossFade(animName, this.duration);
        }
        else {
            this._animation.play(animName);
        }
        this._lastSwitchTime = currentTime;

        this._animState = this._animation.getState(animName);
        if (!this._animState) {
            return;
        }
        if (!this._wrapModeMap.has(this._animState)) {
            this._wrapModeMap.set(this._animState, this._animState.wrapMode);
        }
        this._animState.wrapMode = loop ? WRAP_MODE_LOOP : WRAP_MODE_NORMAL;
    }
}
