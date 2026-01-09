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
    private spineComponent: sp.Skeleton | null = null;

    protected onEnable() {
        // 重置动画时长
        this.maxDuration = 0;
        
        // SPINE动画
        this.spineComponent = this.getComponent(sp.Skeleton);
        if (this.spineComponent) {
            // 播放第一个动画
            const json = (this.spineComponent.skeletonData!.skeletonJson! as any).animations;
            for (const name in json) {
                this.spineComponent.setCompleteListener(this.onRecovery.bind(this));
                this.spineComponent.setAnimation(0, name, false);
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
                // 只有当有有效动画时才设置定时器
                if (this.maxDuration > 0) {
                    this.scheduleOnce(this.onRecovery.bind(this), this.maxDuration);
                }
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
                // 只有当有有效粒子时才设置定时器
                if (this.maxDuration > 0) {
                    this.scheduleOnce(this.onRecovery.bind(this), this.maxDuration);
                }
            }
        }
    }

    protected onDisable() {
        // 清理定时器
        this.unschedule(this.onRecovery);
        
        // 清理 Spine 监听器，防止内存泄漏
        if (this.spineComponent) {
            this.spineComponent.setCompleteListener(null!);
            this.spineComponent = null;
        }
    }

    private onRecovery() {
        if (this.node.parent) message.dispatchEvent(EffectEvent.Put, this.node);
    }
}
