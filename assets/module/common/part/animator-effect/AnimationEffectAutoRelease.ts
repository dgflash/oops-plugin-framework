import { Animation, Component, _decorator } from 'cc';
import { IAutoRelease } from '../GamePartNodePool';

const { ccclass } = _decorator;

/** Cocos Animation动画自动释放组件 */
@ccclass('AnimationEffectAutoRelease')
export class AnimationEffectAutoRelease extends Component implements IAutoRelease {
    private callback: (() => void) | null = null;

    onPlayComplete(callback: () => void): void {
        this.callback = callback;
    }

    play(): void {
        const anim = this.getComponent(Animation);
        if (anim) {
            anim.once(Animation.EventType.FINISHED, () => {
                if (this.callback) {
                    this.callback();
                    this.callback = null;
                }
            });
            anim.play();
        }
    }

    setSpeed(speed: number): void {
        const anim = this.getComponent(Animation);
        if (anim) {
            const aniName = anim.defaultClip?.name;
            if (aniName) {
                const aniState = anim.getState(aniName);
                if (aniState) {
                    aniState.speed = speed;
                }
            }
        }
    }

    protected onDisable() {
        this.callback = null;
    }
}
