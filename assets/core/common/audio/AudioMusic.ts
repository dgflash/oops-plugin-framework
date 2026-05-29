import type { AudioClip } from 'cc';
import { Node } from 'cc';
import type { IAudioData, IAudioParams } from './IAudio';
import { AudioEffect } from './AudioEffect';
import { AudioEffectType } from './AudioEnum';

/**
 * 背景音乐
 * 1、播放一个新背景音乐时，先停止正在播放的背景资源，最后播放新的背景音乐
 * 2、背景音乐循环播放时，不会触发播放完成事件
 * 3、不负责加载资源，也不负责释放资源，资源加载与引用计数完全由外部（GameResModule + ResAutoTracker）管理
 */
export class AudioMusic extends Node {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = null!;

    private _progress = 0;
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
     * 播放音乐
     * @param clip          AudioClip 实例
     * @param params        背景音乐资源播放参数
     */
    play(clip: AudioClip, params?: IAudioParams) {
        if (!this.getSwitch()) return;

        if (this._ae.playing) this.stop();

        this._ae.params = params!;
        this._ae.clip = clip;
        this._ae.loop = params?.loop ?? true;
        this._ae.volume = params?.volume ?? this.getVolume();
        this._ae.currentTime = 0;
        this._ae.play();
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

    /** 节点销毁时清理 */
    onDestroy() {
        this.stop();
        this._ae = null!;
        this.data = null!;
    }
}
