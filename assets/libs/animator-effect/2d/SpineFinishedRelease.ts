/*
 * @Author: dgflash
 * @Date: 2021-10-12 14:11:04
 * @LastEditors: dgflash
 * @LastEditTime: 2022-04-08 15:42:16
 */

import { _decorator, Component, sp } from 'cc';
import { oops } from '../../../core/Oops';
const { ccclass, property } = _decorator;

/** 动画播放完隐藏特效 */
@ccclass('SpineFinishedRelease')
export class SpineFinishedRelease extends Component {
    @property
    isDestroy: boolean = true;

    private spine!: sp.Skeleton;
    private resPath: string = null!;

    /** 设置路径 */
    setResPath(path: string) {
        this.resPath = path;
    }

    onLoad() {
        this.spine = this.getComponent(sp.Skeleton)!;
        this.spine.setCompleteListener(this.onSpineComplete.bind(this));

        if (this.resPath) {
            this.loadSkeletonData();
        }
        else {
            this.spine.setAnimation(0, "animation", false);
        }
    }

    private async loadSkeletonData() {
        let sd = await oops.res.load(this.resPath, sp.SkeletonData);
        if (sd) {
            this.spine.skeletonData = sd;
            this.spine.setAnimation(0, "animation", false);
        }
    }

    private onSpineComplete() {
        if (this.isDestroy) {
            this.node.destroy();
        }
        else {
            this.node.removeFromParent();
        }
    }
}
