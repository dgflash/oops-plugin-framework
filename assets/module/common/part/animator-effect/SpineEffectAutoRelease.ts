import { Component, _decorator, sp } from 'cc';
import { IAutoRelease } from '../GamePartNodePool';

const { ccclass } = _decorator;

/** Spine动画自动释放组件 */
@ccclass('SpineEffectAutoRelease')
export class SpineEffectAutoRelease extends Component implements IAutoRelease {
    private callback: (() => void) | null = null;
    private spine: sp.Skeleton | null = null;

    onPlayComplete(callback: () => void): void {
        this.callback = callback;
    }

    play(): void {
        this.spine = this.getComponent(sp.Skeleton);
        if (this.spine) {
            this.spine.setCompleteListener(() => {
                this.spine!.setCompleteListener(null!);
                if (this.callback) {
                    this.callback();
                    this.callback = null;
                }
            });

            const json = (this.spine.skeletonData!.skeletonJson! as any).animations;
            for (const name in json) {
                this.spine.setAnimation(0, name, false);
                break;
            }
        }
    }

    setSpeed(speed: number): void {
        if (this.spine) {
            this.spine.timeScale = speed;
        }
    }

    protected onDisable() {
        if (this.spine) {
            this.spine.setCompleteListener(null!);
            this.spine = null;
        }
        this.callback = null;
    }
}
