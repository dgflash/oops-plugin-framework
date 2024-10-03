/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:22:36
 */
import { AudioSource, _decorator } from 'cc';
const { ccclass } = _decorator;

/** 游戏音效 */
@ccclass('AudioEffect')
export class AudioEffect extends AudioSource {
    /** 背景音乐播放完成回调 */
    onComplete: Function | null = null;

    start() {
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    private onAudioEnded() {
        this.onComplete && this.onComplete();
    }
}