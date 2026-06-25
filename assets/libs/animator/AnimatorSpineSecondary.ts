import { _decorator, sp } from 'cc';
import AnimatorSpine from './AnimatorSpine';
import type { AnimationPlayer } from './core/AnimatorBase';
import AnimatorBase from './core/AnimatorBase';
import type { AnimatorStateLogic } from './core/AnimatorStateLogic';

const { ccclass, property, menu, help } = _decorator;

/**
 * Spine状态机组件（次状态机），同一节点可添加多个，用于在不同track中播放动画，trackIndex必须大于0
 */
@ccclass
@menu('OopsFramework/Animator/AnimatorSpine （Spine 次状态机）')
@help('https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12036279&doc_id=2873565')
export default class AnimatorSpineSecondary extends AnimatorBase {
    @property({ tooltip: '动画播放的trackIndex，必须大于0' }) TrackIndex = 1;

    /** 主状态机 */
    private _main: AnimatorSpine = null!;
    /** spine组件 */
    private _spine: sp.Skeleton = null!;

    protected start() {
        // 检查 Spine 模块是否可用
        if (typeof sp === 'undefined' || !sp.Skeleton) {
            console.error('[AnimatorSpineSecondary] Spine module not enabled!');
            return;
        }

        if (!this.PlayOnStart || this._hasInit) {
            return;
        }
        this._hasInit = true;

        // 获取或自动添加 Spine 组件
        this._spine = this.getComponent(sp.Skeleton)!;
        if (!this._spine) {
            this._spine = this.addComponent(sp.Skeleton)!;
        }
        this._main = this.getComponent(AnimatorSpine)!;
        if (!this._main) {
            console.error('[AnimatorSpineSecondary] AnimatorSpine component not found!');
            return;
        }
        this._main.addSecondaryListener(this.onAnimFinished, this);

        if (this.AssetRawUrl !== null) {
            this.initJson(this.AssetRawUrl.json);
        }
    }

    /**
     * 手动初始化状态机，可传入0-3个参数，类型如下
     * - onStateChangeCall 状态切换时的回调
     * - stateLogicMap 各个状态逻辑控制
     * - animationPlayer 自定义动画控制
     * @override
     */
    onInit(...args: Array<Map<string, AnimatorStateLogic> | ((fromState: string, toState: string) => void) | AnimationPlayer>) {
        // 检查 Spine 模块是否可用
        if (typeof sp === 'undefined' || !sp.Skeleton) {
            console.error('[AnimatorSpineSecondary] Spine module not enabled!');
            return;
        }

        if (this.PlayOnStart || this._hasInit) {
            return;
        }
        this._hasInit = true;

        this.initArgs(...args);

        // 获取或自动添加 Spine 组件
        this._spine = this.getComponent(sp.Skeleton)!;
        if (!this._spine) {
            this._spine = this.addComponent(sp.Skeleton)!;
        }
        this._main = this.getComponent(AnimatorSpine)!;
        if (!this._main) {
            console.error('[AnimatorSpineSecondary] AnimatorSpine component not found!');
            return;
        }
        this._main.addSecondaryListener(this.onAnimFinished, this);

        if (this.AssetRawUrl !== null) {
            this.initJson(this.AssetRawUrl.json);
        }
    }

    /**
     * 播放动画
     * @override
     * @param animName 动画名
     * @param loop 是否循环播放
     */
    protected playAnimation(animName: string, loop: boolean) {
        if (animName) {
            this._spine.setAnimation(this.TrackIndex, animName, loop);
        }
        else {
            this._spine.clearTrack(this.TrackIndex);
        }
    }

    /**
     * 组件销毁时清理资源
     */
    protected onDestroy() {
        // 从主状态机移除次状态机监听器
        if (this._main) {
            this._main.removeSecondaryListener(this.onAnimFinished);
        }
    }
}
