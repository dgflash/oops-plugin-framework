import type { AudioClip } from 'cc';
import { AudioSource, _decorator } from 'cc';
import type { IAudioParams } from './IAudio';
const { ccclass } = _decorator;

/** 游戏音效播放器 */
@ccclass('AudioEffect')
export class AudioEffect extends AudioSource {
    /** 唯一编号 */
    key: string = null!;
    /** 音效编号 */
    aeid = -1;
    /** 音效果资源路径 */
    path: string | AudioClip = null!;
    /** 音效参数 */
    params: IAudioParams = null!;
    /** 背景音乐播放完成回调 */
    onComplete: Function | null = null;

    start() {
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    private onAudioEnded() {
        this.onComplete && this.onComplete(this);
    }

    /** 重置音效对象，释放所有引用 */
    reset() {
        this.stop();
        this.clip = null;
        this.path = null!;
        this.params = null!;
        this.onComplete = null; // 清理回调引用，防止内存泄漏
    }

    /** 组件销毁时清理资源 */
    onDestroy() {
        if (this.node) this.node.off(AudioSource.EventType.ENDED, this.onAudioEnded, this);
        this.reset();
    }
}