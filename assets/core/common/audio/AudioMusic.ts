/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:13
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-16 09:11:30
 */
import { AudioClip, AudioSource, _decorator } from 'cc';
import { resLoader } from '../loader/ResLoader';

const { ccclass, menu } = _decorator;

/** 
 * 背景音乐 
 * 1、播放一个新背景音乐时，先加载音乐资源，然后停止正在播放的背景资源同时施放当前背景音乐资源，最后播放新的背景音乐
 */
@ccclass('AudioMusic')
export class AudioMusic extends AudioSource {
    /** 背景音乐开关 */
    switch: boolean = true;
    /** 背景音乐播放完成回调 */
    onComplete: Function | null = null;

    private _progress: number = 0;
    private _isLoading: boolean = false;
    private _nextBundleName: string = null!;   // 下一个音乐资源包
    private _nextUrl: string = null!;          // 下一个播放音乐

    start() {
        // this.node.on(AudioSource.EventType.STARTED, this.onAudioStarted, this);
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    // private onAudioStarted() { }

    private onAudioEnded() {
        this.onComplete && this.onComplete();
    }

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
     * @param bundleName   资源包名
     */
    async load(url: string, callback?: Function, bundleName: string = resLoader.defaultBundleName) {
        // 下一个加载的背景音乐资源
        if (this._isLoading) {
            this._nextBundleName = bundleName;
            this._nextUrl = url;
            return;
        }

        this._isLoading = true;
        var data: AudioClip = await resLoader.loadAsync(bundleName, url, AudioClip);
        if (data) {
            this._isLoading = false;

            // 处理等待加载的背景音乐
            if (this._nextUrl != null) {
                // 加载等待播放的背景音乐
                this.load(this._nextUrl, callback, this._nextBundleName);
                this._nextBundleName = this._nextUrl = null!;
            }
            else {
                callback && callback();

                // 正在播放的时候先关闭
                if (this.playing) {
                    this.stop();
                }

                // 删除当前正在播放的音乐
                this.release();

                // 播放背景音乐
                this.clip = data;
                this.play();
            }
        }
    }

    /** 释放当前背景音乐资源 */
    release() {
        if (this.clip) {
            this.stop();
            this.clip.decRef();
            this.clip = null;
        }
    }
}