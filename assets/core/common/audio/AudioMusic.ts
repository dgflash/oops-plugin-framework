/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:13
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-16 09:11:30
 */
import { AudioClip, AudioSource, _decorator, error } from 'cc';
import { oops } from '../../Oops';
const { ccclass, menu } = _decorator;

/** 背景音乐 */
@ccclass('AudioMusic')
export class AudioMusic extends AudioSource {
    /** 背景音乐播放完成回调 */
    onComplete: Function | null = null;

    private _progress: number = 0;
    private _url: string = null!;
    private _isPlay: boolean = false;

    /** 获取音乐播放进度 */
    get progress(): number {
        if (this.duration > 0)
            this._progress = this.currentTime / this.duration;
        return this._progress;
    }
    /**
     * 设置音乐当前播放进度
     * @param value     进度百分比0到1之间
     */
    set progress(value: number) {
        this._progress = value;
        this.currentTime = value * this.duration;
    }

    /**
     * 加载音乐并播放
     * @param url          音乐资源地址
     * @param callback     加载完成回调
     */
    public load(url: string, callback?: Function) {
        oops.res.load(url, AudioClip, (err: Error | null, data: AudioClip) => {
            if (err) {
                error(err);
            }

            if (this.playing) {
                this._isPlay = false;
                this.stop();
            }

            if (this._url) {
                oops.res.release(this._url);
            }

            this.enabled = true;
            this.clip = data;

            // 注：事件定义在这里，是为了在播放前设置初始播放位置数据
            callback && callback();

            this.play();

            this._url = url;
        });
    }

    /** cc.Component 生命周期方法，验证背景音乐播放完成逻辑，建议不要主动调用 */
    update(dt: number) {
        if (this.currentTime > 0) {
            this._isPlay = true;
        }

        if (this._isPlay && this.playing == false && this.progress == 0) {
            this._isPlay = false;
            this.enabled = false
            this.onComplete && this.onComplete();
        }
    }

    /** 释放当前背景音乐资源 */
    release() {
        if (this._url) {
            oops.res.release(this._url);
            this._url = null!;
        }
    }
}
