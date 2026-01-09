import { _decorator, sp } from 'cc';
import type AnimatorSpineSecondary from './AnimatorSpineSecondary';
import type { AnimationPlayer } from './core/AnimatorBase';
import AnimatorBase from './core/AnimatorBase';
import type { AnimatorStateLogic } from './core/AnimatorStateLogic';

const { ccclass, property, requireComponent, disallowMultiple, menu, help } = _decorator;

/**
 * Spine状态机组件（主状态机），trackIndex为0
 */
@ccclass
@disallowMultiple
@requireComponent(sp.Skeleton)
@menu('OopsFramework/Animator/AnimatorSpine（Spine 状态机）')
@help('https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12036279&doc_id=2873565')
export default class AnimatorSpine extends AnimatorBase {
    /** spine组件 */
    protected _spine: sp.Skeleton = null!;
    /** 动画完成的回调 */
    protected _completeListenerMap: Map<(entry?: any) => void, any> = new Map();
    /** 次状态机注册的回调 - 按trackIndex分组存储，优化性能 */
    protected _secondaryListenerMap: Map<number, Array<{ cb: (entry?: any) => void, target: AnimatorSpineSecondary }>> = new Map();
    /** 保存绑定的事件回调，用于清理 */
    private _boundEventCallback: ((trackEntry: any, event: any) => void) | null = null;
    private _boundCompleteCallback: ((entry: any) => void) | null = null;

    protected start() {
        if (!this.PlayOnStart || this._hasInit) {
            return;
        }
        this._hasInit = true;

        this._spine = this.getComponent(sp.Skeleton)!;
        this._boundEventCallback = this.onSpineEvent.bind(this);
        this._boundCompleteCallback = this.onSpineComplete.bind(this);
        this._spine.setEventListener(this._boundEventCallback);
        this._spine.setCompleteListener(this._boundCompleteCallback);

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
        if (this.PlayOnStart || this._hasInit) {
            return;
        }
        this._hasInit = true;

        this.initArgs(...args);

        this._spine = this.getComponent(sp.Skeleton)!;
        this._boundEventCallback = this.onSpineEvent.bind(this);
        this._boundCompleteCallback = this.onSpineComplete.bind(this);
        this._spine.setEventListener(this._boundEventCallback);
        this._spine.setCompleteListener(this._boundCompleteCallback);

        if (this.AssetRawUrl !== null) {
            this.initJson(this.AssetRawUrl.json);
        }
    }

    /** ---------- 后续扩展代码 开始 ---------- */

    getBone(name: string): any {
        const bone = this._spine.findBone(name);
        return bone;
    }

    private onSpineEvent(trackEntry: any, event: any) {
        const animationName = trackEntry.animation ? event.data.name : '';
        this._animationPlayer?.onFrameEventCallback(animationName, this);
    }

    /** ---------- 后续扩展代码 结束 ---------- */

    private onSpineComplete(entry: any) {
        const trackIndex = entry.trackIndex;

        if (trackIndex === 0) {
            this.onAnimFinished();
        }

        this._completeListenerMap.forEach((target, cb) => {
            if (target) {
                cb.call(target, entry);
            }
            else {
                cb(entry);
            }
        });

        // 使用按trackIndex分组的监听器，避免遍历所有监听器
        const listeners = this._secondaryListenerMap.get(trackIndex);
        if (listeners) {
            for (let i = 0; i < listeners.length; i++) {
                const listener = listeners[i];
                listener.cb.call(listener.target, entry);
            }
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
            this._spine.setAnimation(0, animName, loop);
        }
        else {
            this._spine.clearTrack(0);
        }
    }

    /**
     * 缩放动画播放速率
     * @override
     * @param scale 缩放倍率
     */
    protected scaleTime(scale: number) {
        if (scale > 0)
            this._spine.timeScale = scale;
    }

    /**
     * 注册次状态机动画结束的回调（状态机内部方法，不能由外部直接调用）
     */
    addSecondaryListener(cb: (entry?: any) => void, target: AnimatorSpineSecondary) {
        const trackIndex = target.TrackIndex;
        if (!this._secondaryListenerMap.has(trackIndex)) {
            this._secondaryListenerMap.set(trackIndex, []);
        }
        const listeners = this._secondaryListenerMap.get(trackIndex)!;
        listeners.push({ cb, target });
    }

    /**
     * 注销次状态机的监听
     * @param cb 回调
     */
    removeSecondaryListener(cb: (entry?: any) => void) {
        // 遍历所有trackIndex的监听器数组
        this._secondaryListenerMap.forEach((listeners, trackIndex) => {
            const index = listeners.findIndex(listener => listener.cb === cb);
            if (index !== -1) {
                listeners.splice(index, 1);
                // 如果该trackIndex的监听器数组为空，删除该key
                if (listeners.length === 0) {
                    this._secondaryListenerMap.delete(trackIndex);
                }
            }
        });
    }

    /**
     * 注册动画完成时的监听
     * @param cb 回调
     * @param target 调用回调的this对象
     */
    addCompleteListener(cb: (entry?: any) => void, target: any = null) {
        if (this._completeListenerMap.has(cb)) {
            return;
        }
        this._completeListenerMap.set(cb, target);
    }

    /**
     * 注销动画完成的监听
     * @param cb 回调
     */
    removeCompleteListener(cb: (entry?: any) => void) {
        this._completeListenerMap.delete(cb);
    }

    /**
     * 清空动画完成的监听
     */
    clearCompleteListener() {
        this._completeListenerMap.clear();
    }

    /**
     * 组件销毁时清理资源
     */
    protected onDestroy() {
        // 清理spine事件监听器（需要检查spine和其内部状态是否有效）
        if (this._spine && this._spine.isValid) {
            // 只有在spine内部状态正常时才清理监听器
            // 组件销毁时spine可能已经部分清理，直接设置null可能出错
            this._spine.setEventListener(null!);
            this._spine.setCompleteListener(null!);
        }

        // 清理回调引用
        this._boundEventCallback = null;
        this._boundCompleteCallback = null;

        // 清空所有监听器
        this._completeListenerMap.clear();
        this._secondaryListenerMap.clear();
    }
}
