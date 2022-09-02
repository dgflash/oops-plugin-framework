/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:02:22
 */
import { AudioClip, AudioSource, error, _decorator } from 'cc';
import { oops } from '../../Oops';
const { ccclass, menu } = _decorator;

/**
 * 注：用playOneShot播放的音乐效果，在播放期间暂时没办法即时关闭音乐
 */

/** 游戏音效 */
@ccclass('AudioEffect')
export class AudioEffect extends AudioSource {
    private effects: Map<string, AudioClip> = new Map<string, AudioClip>();

    public load(url: string, callback?: Function) {
        oops.res.load(url, AudioClip, (err: Error | null, data: AudioClip) => {
            if (err) {
                error(err);
            }

            this.effects.set(url, data);
            this.playOneShot(data, this.volume);
            callback && callback();
        });
    }

    release() {
        for (let key in this.effects) {
            oops.res.release(key);
        }
        this.effects.clear();
    }
}
