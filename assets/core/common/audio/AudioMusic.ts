/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:13
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-16 09:11:30
 */
import { Node } from 'cc';
import { resLoader } from '../loader/ResLoader';
import { AudioClipLoader } from './AudioClipLoader';
import { AudioEffect } from './AudioEffect';
import { AudioEffectType } from './AudioEnum';
import type { IAudioData, IAudioParams } from './IAudio';

/**
 * 背景音乐
 * 1、播放一个新背景音乐时，先加载音乐资源，然后停止正在播放的背景资源同时释放当前背景音乐资源，最后播放新的背景音乐
 * 2、背景音乐循环播放时，不会触发播放完成事件
 */
export class AudioMusic extends Node {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = null!;

    /** 音频资源加载器（统一管理引用计数与延迟释放） */
    private loader: AudioClipLoader = new AudioClipLoader();
    private _progress = 0;
    private _isLoading = false;
    private _nextPath: string | null = null;
    private _nextParams: IAudioParams | null = null;
    private _ae: AudioEffect = null!;
    /** 当前播放的音乐路径（用于释放引用） */
    private _currentPath: string | null = null;
    /** 当前播放的音乐 bundle（用于释放引用） */
    private _currentBundle: string | null = null;

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
        this._ae.volume = value;
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
        this.name = 'AudioMusic';
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
        if (!this.getSwitch()) return;

        if (this._isLoading) {
            this._nextPath = path;
            this._nextParams = params || null;
            return;
        }

        const finalParams = this.mergeParams(params);
        this._isLoading = true;

        const result = await this.loader.load(path, finalParams.bundle);
        this._isLoading = false;

        if (!result) {
            console.warn(`音乐资源加载失败: ${path}`);
            return;
        }

        if (this._nextPath !== null) {
            const nextPath = this._nextPath;
            const nextParams = this._nextParams;
            this._nextPath = null;
            // 清理回调引用，防止闭包持有外部对象
            this._nextParams = null;

            // 释放刚加载的资源引用（未实际播放）
            this.loader.release(path, finalParams.bundle);

            this.loadAndPlay(nextPath, nextParams || undefined);
        }
        else {
            if (this._ae.playing) this.stop();

            // 释放当前播放的资源引用
            this.release();

            this._ae.params = finalParams;
            this._ae.path = path;
            this._ae.clip = result.clip;
            this._ae.loop = finalParams.loop!;
            this._ae.volume = finalParams.volume!;
            this._ae.currentTime = 0;
            this._ae.play();

            // 记录当前播放的资源路径，用于后续释放
            this._currentPath = path;
            this._currentBundle = finalParams.bundle || null;
        }
    }

    private mergeParams(params?: IAudioParams): IAudioParams {
        return params ? {
            type: params.type ?? AudioEffectType.Music,
            bundle: params.bundle ?? resLoader.defaultBundleName,
            loop: params.loop ?? true,
            volume: params.volume ?? this.getVolume(),
            destroy: params.destroy,
            onPlayComplete: params.onPlayComplete
        } : {
            type: AudioEffectType.Music,
            bundle: resLoader.defaultBundleName,
            loop: true,
            volume: this.getVolume()
        };
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
        if (this._ae.playing) this._ae.stop();
    }

    /** 释放当前背景音乐资源 */
    release() {
        if (this._ae && this._ae.clip) {
            this.stop();
            this._ae.clip = null;
        }

        // 通过 loader 释放资源引用（自动处理延迟释放）
        if (this._currentPath) {
            this.loader.release(this._currentPath, this._currentBundle || undefined);
            this._currentPath = null;
            this._currentBundle = null;
        }
    }

    /** 节点销毁时清理所有引用 */
    onDestroy() {
        this.release();
        this._nextPath = null;
        this._nextParams = null;
        this._ae = null!;
        this.data = null!;
        this.loader.destroy();
    }
}