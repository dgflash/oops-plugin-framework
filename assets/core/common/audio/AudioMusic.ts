/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:13
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-16 09:11:30
 */
import { AudioClip, Node } from 'cc';
import { resLoader } from '../loader/ResLoader';
import { AudioEffect } from './AudioEffect';
import { AudioEffectType } from './AudioEnum';
import { IAudioData, IAudioParams } from './IAudio';

/** 
 * 背景音乐 
 * 1、播放一个新背景音乐时，先加载音乐资源，然后停止正在播放的背景资源同时释放当前背景音乐资源，最后播放新的背景音乐
 * 2、背景音乐循环播放时，不会触发播放完成事件
 */
export class AudioMusic extends Node {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = null!;

    private _progress: number = 0;
    private _isLoading: boolean = false;
    private _nextPath: string = null!;
    private _nextParams: IAudioParams = null!;
    private _ae: AudioEffect = null!;

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
    }

    /** 获取音乐播放进度 */
    get progress(): number {
        if (this._ae.duration > 0) this._progress = this._ae.currentTime / this._ae.duration;
        return this._progress;
    }
    /**
     * 设置音乐当前播放进度
     * @param value     进度百分比0到1之间
     */
    set progress(value: number) {
        this._progress = value;
        this._ae.currentTime = value * this._ae.duration;
    }

    constructor() {
        super();
        this.name = "AudioMusic";
        this._ae = this.addComponent(AudioEffect);
        this._ae.onComplete = this.onAudioEffectPlayComplete.bind(this);
    }

    /** 音效播放完成 */
    private onAudioEffectPlayComplete(ae: AudioEffect) {
        ae.params && ae.params.onPlayComplete && ae.params.onPlayComplete(ae);
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
            this._nextPath = path;
            this._nextParams = params!;
            return;
        }

        if (params == null) {
            params = {
                type: AudioEffectType.Music,
                bundle: resLoader.defaultBundleName,
                loop: true,
                volume: this.getVolume()
            }
        }
        else {
            if (params.type == null) params.type = AudioEffectType.Music;
            if (params.bundle == null) params.bundle = resLoader.defaultBundleName;
            if (params.loop == null) params.loop = true;
            if (params.volume == null) params.volume = this.getVolume()
        }

        this._isLoading = true;

        let clip: AudioClip = null!;
        if (path.indexOf("http") == 0) {
            const extension = path.split('.').pop();
            clip = await resLoader.loadRemote<AudioClip>(path, { ext: `.${extension}` });
        }
        else {
            clip = await resLoader.loadAsync(params.bundle!, path, AudioClip);
        }

        this._isLoading = false;

        // 处理等待加载的背景音乐
        if (this._nextPath != null) {
            // 加载等待播放的背景音乐
            this.loadAndPlay(this._nextPath, this._nextParams);
            this._nextPath = null!;
            this._nextParams = null!;
        }
        else {
            // 正在播放的时候先关闭
            if (this._ae.playing) this.stop();

            // 删除当前正在播放的音乐
            this.release();

            // 播放背景音乐
            this._ae.params = params;
            this._ae.path = path;
            this._ae.clip = clip;
            this._ae.loop = params.loop!;
            this._ae.volume = params.volume!;
            this._ae.currentTime = 0;
            this._ae.play();
        }
    }

    /** 恢复当前暂停的音乐与音效播放 */
    resume() {
        if (!this._ae.playing && this.progress > 0) this._ae.play();
    }

    /** 暂停当前音乐与音效的播放 */
    pause() {
        if (this._ae.playing) this._ae.pause();
    }

    /** 停止当前音乐与音效的播放 */
    stop(): void {
        if (this.getSwitch() && this._ae.playing) {
            this._ae.stop();
        }
    }

    /** 释放当前背景音乐资源 */
    release() {
        if (this._ae.clip) {
            this.stop();
            this._ae.clip.decRef();
            this._ae.clip = null;
        }
    }
}