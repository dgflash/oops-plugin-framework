/*
 * @Author: dgflash
 * @Date: 2022-08-19 15:36:08
 * @LastEditors: dgflash
 * @LastEditTime: 2023-03-01 18:28:55
 */

import { Animation, Component, ParticleSystem, _decorator, sp } from 'cc';
import { EffectEvent } from './EffectEvent';
import { message } from '../../core/common/event/MessageManager';

const { ccclass } = _decorator;

/** 动画播放完释放特效 - Animation、ParticleSystem */
@ccclass('EffectFinishedRelease')
export class EffectFinishedRelease extends Component {
    /** 动画最大播放时间 */
    private maxDuration = 0;

    protected onEnable() {
        // SPINE动画
        const spine = this.getComponent(sp.Skeleton);
        if (spine) {
            // 播放第一个动画
            const json = (spine.skeletonData!.skeletonJson! as any).animations;
            for (const name in json) {
                spine.setCompleteListener(this.onRecovery.bind(this));
                spine.setAnimation(0, name, false);
                break;
            }
        }
        else {
            // COCOS动画
            const anims: Animation[] = this.node.getComponentsInChildren(Animation);
            if (anims.length > 0) {
                anims.forEach((animator) => {
                    const aniName = animator.defaultClip?.name;
                    if (aniName) {
                        const aniState = animator.getState(aniName);
                        if (aniState) {
                            const duration = aniState.duration;
                            this.maxDuration = duration > this.maxDuration ? duration : this.maxDuration;
                        }
                    }
                    animator.play();
                });
                this.scheduleOnce(this.onRecovery.bind(this), this.maxDuration);
            }
            // 粒子动画
            else if (ParticleSystem) {
                const particles: ParticleSystem[] = this.node.getComponentsInChildren(ParticleSystem);
                particles.forEach((particle) => {
                    particle.clear();
                    particle.stop();
                    particle.play();

                    const duration: number = particle.duration;
                    this.maxDuration = duration > this.maxDuration ? duration : this.maxDuration;
                });
                this.scheduleOnce(this.onRecovery.bind(this), this.maxDuration);
            }
        }
    }

    private onRecovery() {
        if (this.node.parent) message.dispatchEvent(EffectEvent.Put, this.node);
    }
}
