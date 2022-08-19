/*
 * @Author: dgflash
 * @Date: 2022-08-19 15:36:08
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-19 16:38:15
 */

import { Animation, Component, ParticleSystem, _decorator } from 'cc';
import { EffectSingleCase } from './EffectSingleCase';
const { ccclass, property } = _decorator;

/** 动画播放完释放特效 */
@ccclass('EffectFinishedRelease')
export class EffectFinishedRelease extends Component {
    private maxDuration: number = 0;

    onLoad() {
        let arrAni: Animation[] = this.node.getComponentsInChildren(Animation);

        arrAni.forEach((element: Animation, idx: number) => {
            element.play();

            let aniName = element?.defaultClip?.name;
            if (aniName) {
                let aniState = element.getState(aniName);
                if (aniState) {
                    let duration = aniState.duration;
                    this.maxDuration = duration > this.maxDuration ? duration : this.maxDuration;
                    aniState.speed = 1;
                }
            }
        });

        let arrParticle: ParticleSystem[] = this.node.getComponentsInChildren(ParticleSystem);
        arrParticle.forEach((element: ParticleSystem) => {
            element.simulationSpeed = 1;
            // element.clear();         // cc3.6 执行报错
            element.stop();
            element.play()

            let duration: number = element.duration;
            this.maxDuration = duration > this.maxDuration ? duration : this.maxDuration;
        });
    }

    protected onEnable() {
        this.scheduleOnce(this.onRecovery.bind(this), this.maxDuration);
    }

    private onRecovery() {
        if (this.node.parent) EffectSingleCase.instance.put(this.node);
    }
}
