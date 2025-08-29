/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:13
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-16 09:11:30
 */
import { AudioClip, AudioSource, _decorator } from 'cc';
import { resLoader } from '../loader/ResLoader';
import { AudioEffectType } from './AudioManager';
import { IAudioData, IAudioParams } from './IAudio';

const { ccclass } = _decorator;

/** 
 * 背景音乐 
 * 1、播放一个新背景音乐时，先加载音乐资源，然后停止正在播放的背景资源同时施放当前背景音乐资源，最后播放新的背景音乐
 */
@ccclass('AudioMusic')
export class AudioMusic extends AudioSource {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = null!;

    private _progress: number = 0;
    private _isLoading: boolean = false;
    private _nextUrl: string = null!;
    private _nextParams: IAudioParams = null!;
    private _params: IAudioParams = null!;

    /**
     * 音效开关
     * @param type      音效类型
     * @returns         音效开关
     */
    getSwitch() {
        return this.data[AudioEffectType.Music].switch;
    }
    /**
     * 音效音量设置
     * @param type      音效类型
     * @param value     音效开关
     */
    setSwitch(value: boolean) {
        this.data[AudioEffectType.Music].switch = value;
        if (!value) this.stop();
    }

    /**
     * 音效音量获取
     * @param type      音效类型
     * @returns         音效音量
     */
    getVolume(): number {
        return this.data[AudioEffectType.Music].volume;
    }
    /**
     * 音效音量设置
     * @param value     音效音量
     */
    setVolume(value: number) {
        this.data[AudioEffectType.Music].volume = value;
        this.volume = value;
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

    start() {
        // this.node.on(AudioSource.EventType.STARTED, this.onAudioStarted, this);
        this.node.on(AudioSource.EventType.ENDED, this.onAudioEnded, this);
    }

    // private onAudioStarted() { }

    private onAudioEnded() {
        if (this._params && this._params.onPlayComplete) {
            this._params.onPlayComplete();
        }
    }

    /**
     * 加载音乐并播放
     * @param path          音乐资源地址
     * @param params        背景音乐资源播放参数
     */
    async loadAndPlay(path: string, params?: IAudioParams) {
        if (!this.getSwitch()) return;           // 禁止播放音乐

        // 下一个加载的背景音乐资源
        if (this._isLoading) {
            this._nextUrl = path;
            this._nextParams = params!;
            return;
        }

        let bundleName = resLoader.defaultBundleName;
        let loop = true;
        let volume = this.volume;
        if (params) {
            this._params = params!
            if (params.bundle != null) bundleName = params.bundle;
            if (params.loop != null) loop = params.loop;
            if (params.volume != null) volume = params.volume;
        };

        this._isLoading = true;

        let clip: AudioClip = null!;
        if (path.indexOf("http") == 0) {
            const extension = path.split('.').pop();
            clip = await resLoader.loadRemote<AudioClip>(path, { ext: `.${extension}` });
        }
        else {
            clip = await resLoader.loadAsync(bundleName, path, AudioClip);
        }

        this._isLoading = false;

        // 处理等待加载的背景音乐
        if (this._nextUrl != null) {
            // 加载等待播放的背景音乐
            this.loadAndPlay(this._nextUrl, this._nextParams);
            this._nextUrl = null!;
            this._nextParams = null!;
        }
        else {
            // 正在播放的时候先关闭
            if (this.playing) {
                this.stop();
            }

            // 删除当前正在播放的音乐
            this.release();

            // 播放背景音乐
            this.clip = clip;
            this.loop = loop;
            this.volume = volume;
            this.currentTime = 0;
            this.play();
        }
    }

    /** 恢复当前暂停的音乐与音效播放 */
    resume() {
        if (!this.playing && this.progress > 0) super.play();
    }

    /** 暂停当前音乐与音效的播放 */
    pause() {
        if (this.playing) super.pause();
    }

    /** 停止当前音乐与音效的播放 */
    stop(): void {
        if (this.getSwitch() && this.playing) {
            super.stop();
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