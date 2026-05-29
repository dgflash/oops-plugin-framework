import { Component, ParticleSystem, _decorator } from 'cc';
import { IAutoRelease } from '../GamePartNodePool';

const { ccclass } = _decorator;

/** 粒子动画自动释放组件 */
@ccclass('ParticleEffectAutoRelease')
export class ParticleEffectAutoRelease extends Component implements IAutoRelease {
    private callback: Function | null = null;
    private timerId: number | null = null;

    onPlayComplete(callback: Function): void {
        this.callback = callback;
    }

    play(): void {
        const particle = this.getComponent(ParticleSystem);
        if (particle) {
            particle.clear();
            particle.stop();
            particle.play();

            const duration = particle.duration * 1000;
            this.timerId = setTimeout(() => {
                this.timerId = null;
                this.callback && this.callback();
            }, duration) as unknown as number;
        }
    }

    setSpeed(speed: number): void {
        const particle = this.getComponent(ParticleSystem);
        if (particle) {
            particle.simulationSpeed = speed;
        }
    }

    protected onDisable() {
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.callback = null;
    }
}
