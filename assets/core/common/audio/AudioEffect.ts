/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:22:36
 */
import { AudioClip, AudioSource, _decorator } from 'cc';
import { IAudioParams } from './IAudio';
const { ccclass } = _decorator;

/** 游戏音效 */
@ccclass('AudioEffect')
export class AudioEffect extends AudioSource {
    /** 唯一编号 */
    key: string = null!;
    /** 音效编号 */
    aeid: number = -1;
    /** 音效果资源路径 */
    path: string | AudioClip = null!
    /** 音效参数 */
    params: IAudioParams = null!
    /** 背景音乐播放完成回调 */
    onComplete: Function | null = null;

    start() {
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    private onAudioEnded() {
        this.onComplete && this.onComplete(this);
    }

    reset() {
        this.stop();
        this.clip = null;
        this.path = null!;
        this.params = null!;
    }
}