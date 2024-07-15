/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:13
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-16 09:11:30
 */
import { AudioClip, AudioSource, _decorator, error } from 'cc';
import { oops } from '../../Oops';

const { ccclass, menu } = _decorator;

/** 
 * 背景音乐 
 * 1、播放一个新背景音乐时，先加载音乐资源，然后停止正在播放的背景资源同时施放当前背景音乐资源，最后播放新的背景音乐
 */
@ccclass('AudioMusic')
export class AudioMusic extends AudioSource {
    /** 背景音乐播放完成回调 */
    onComplete: Function | null = null;

    private _progress: number = 0;
    private _isLoading: boolean = false;
    private _bundleName: string = null!;        // 当前音乐资源包
    private _bundleName_next: string = null!;   // 下一个音乐资源包
    private _url: string = null!;               // 当前播放音乐
    private _url_next: string = null!;          // 下一个播放音乐

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
    load(url: string, callback?: Function, bundleName?: string) {
        if (bundleName == null) bundleName = oops.res.defaultBundleName;

        // 同一个音乐不重复播放
        if (this._url == url && this._bundleName == bundleName) return;

        // 下一个加载的背景音乐资源
        if (this._isLoading) {
            this._bundleName_next = bundleName;
            this._url_next = url;
            return;
        }

        this._isLoading = true;
        oops.res.load(bundleName, url, AudioClip, (err: Error | null, data: AudioClip) => {
            if (err) {
                error(err);
                return;
            }
            this._isLoading = false;

            // 处理等待加载的背景音乐
            if (this._url_next != null) {
                // 删除之前加载的音乐资源
                this.release();

                // 加载等待播放的背景音乐
                this.load(this._url_next, callback, this._bundleName_next);
                this._bundleName_next = this._url_next = null!;
            }
            else {
                callback && callback();
                this.playPrepare(bundleName, url, data);
            }
        });
    }

    private playPrepare(bundleName: string, url: string, data: AudioClip) {
        // 正在播放的时候先关闭
        if (this.playing) {
            this.stop();
        }

        // 删除当前正在播放的音乐
        this.release();

        // 播放背景音乐
        this.enabled = true;
        this.clip = data;
        this.play();

        // 记录新的资源包与资源名数据
        this._bundleName = bundleName;
        this._url = url;
    }

    /** cc.Component 生命周期方法，验证背景音乐播放完成逻辑，建议不要主动调用 */
    update(dt: number) {
        // 背景资源播放完成事件
        if (this.playing == false && this.progress == 0) {
            this.enabled = false;
            this.clip = null;
            this._bundleName = this._url = null!;
            this.onComplete && this.onComplete();
        }
    }

    /** 释放当前背景音乐资源 */
    release() {
        if (this._url) {
            this.clip = null;
            oops.res.release(this._url, this._bundleName);
        }

        this._bundleName = this._url = null!;
    }
}