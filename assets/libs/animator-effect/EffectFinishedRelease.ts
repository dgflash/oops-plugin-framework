/*
 * @Author: dgflash
 * @Date: 2022-08-19 15:36:08
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-19 17:55:17
 */

import { Animation, Component, ParticleSystem, _decorator } from 'cc';
import { oops } from '../../core/Oops';
import { EffectEvent } from './EffectEvent';

const { ccclass, property } = _decorator;

/** 动画播放完释放特效 */
@ccclass('EffectFinishedRelease')
export class EffectFinishedRelease extends Component {
    /** 动画最大播放时间 */
    private maxDuration: number = 0;

    protected onEnable() {
        let anims: Animation[] = this.node.getComponentsInChildren(Animation);
        anims.forEach(animator => {
            let aniName = animator.defaultClip.name;
            if (aniName) {
                let aniState = animator.getState(aniName);
                if (aniState) {
                    aniState.speed = 1;
                    let duration = aniState.duration;
                    this.maxDuration = duration > this.maxDuration ? duration : this.maxDuration;
                }
            }
            animator.play();
        });

        let particles: ParticleSystem[] = this.node.getComponentsInChildren(ParticleSystem);
        particles.forEach(particle => {
            particle.simulationSpeed = 1;
            // particle.clear();         // cc3.6 执行报错
            particle.stop();
            particle.play()

            let duration: number = particle.duration;
            this.maxDuration = duration > this.maxDuration ? duration : this.maxDuration;
        });
        this.scheduleOnce(this.onRecovery.bind(this), this.maxDuration);
    }

    private onRecovery() {
        if (this.node.parent) oops.message.dispatchEvent(EffectEvent.Put, this.node);
    }
}
