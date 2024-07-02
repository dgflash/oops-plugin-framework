import { AudioClip, Component } from "cc";
import { oops } from "../../Oops";
import { AudioEffect } from "./AudioEffect";
import { AudioMusic } from "./AudioMusic";

const LOCAL_STORE_KEY = "game_audio";

/** 
 * 音频管理
 * @example 
// 模块功能通过 oops.audio 调用
oops.audio.playMusic("audios/nocturne");
 */
export class AudioManager extends Component {
    /** 背景音乐管理对象 */
    music: AudioMusic = null!;
    /** 音效管理对象 */
    effect: AudioEffect = null!;

    /** 音乐管理状态数据 */
    private local_data: any = {};
    /** 背景音乐音量值 */
    private _volume_music: number = 1;
    /** 音效音量值 */
    private _volume_effect: number = 1;
    /** 背景音乐播放开关 */
    private _switch_music: boolean = true;
    /** 音效果播放开关 */
    private _switch_effect: boolean = true;

    /**
     * 设置背景音乐播放完成回调
     * @param callback 背景音乐播放完成回调
     */
    setMusicComplete(callback: Function | null = null) {
        this.music.onComplete = callback;
    }

    /**
     * 播放背景音乐
     * @param url        资源地址
     * @param callback   音乐播放完成事件
     */
    playMusic(url: string, callback?: Function, bundleName?: string) {
        if (this._switch_music && !this.music.playing) {
            this.music.loop = false;
            this.music.load(url, callback, bundleName);
        }
    }

    /** 循环播放背景音乐 */
    playMusicLoop(url: string, bundleName?: string) {
        if (this._switch_music && !this.music.playing) {
            this.music.loop = true;
            this.music.load(url, null!, bundleName);
        }
    }

    /** 停止背景音乐播放 */
    stopMusic() {
        if (this._switch_music && this.music.playing) {
            this.music.stop();
        }
    }

    /**
     * 获取背景音乐播放进度
     */
    get progressMusic(): number {
        return this.music.progress;
    }
    /**
     * 设置背景乐播放进度
     * @param value     播放进度值
     */
    set progressMusic(value: number) {
        this.music.progress = value;
    }

    /**
     * 获取背景音乐音量
     */
    get volumeMusic(): number {
        return this._volume_music;
    }
    /** 
     * 设置背景音乐音量
     * @param value     音乐音量值
     */
    set volumeMusic(value: number) {
        this._volume_music = value;
        this.music.volume = value;
    }

    /** 
     * 获取背景音乐开关值 
     */
    get switchMusic(): boolean {
        return this._switch_music;
    }
    /** 
     * 设置背景音乐开关值
     * @param value     开关值
     */
    set switchMusic(value: boolean) {
        this._switch_music = value;

        if (value == false)
            this.music.stop();
    }

    /**
     * 播放音效
     * @param url        资源地址
     */
    playEffect(url: string | AudioClip, callback?: Function, bundleName?: string) {
        if (this._switch_effect) {
            this.effect.load(url, callback, bundleName);
        }
    }

    /** 释放音效资源 */
    releaseEffect(url: string | AudioClip, bundleName?: string) {
        this.effect.release(url, bundleName);
    }

    /** 
     * 获取音效音量 
     */
    get volumeEffect(): number {
        return this._volume_effect;
    }
    /**
     * 设置获取音效音量
     * @param value     音效音量值
     */
    set volumeEffect(value: number) {
        this._volume_effect = value;
        this.effect.volume = value;
    }

    /** 
     * 获取音效开关值 
     */
    get switchEffect(): boolean {
        return this._switch_effect;
    }
    /**
     * 设置音效开关值
     * @param value     音效开关值
     */
    set switchEffect(value: boolean) {
        this._switch_effect = value;
        if (value == false) this.effect.stop();
    }

    /** 恢复当前暂停的音乐与音效播放 */
    resumeAll() {
        if (this.music) {
            if (!this.music.playing && this.music.progress > 0) this.music.play();
            if (!this.effect.playing && this.effect.progress > 0) this.effect.play();
        }
    }

    /** 暂停当前音乐与音效的播放 */
    pauseAll() {
        if (this.music) {
            if (this.music.playing) this.music.pause();
            if (this.effect.playing) this.effect.pause();
        }
    }

    /** 停止当前音乐与音效的播放 */
    stopAll() {
        if (this.music) {
            this.music.stop();
            this.effect.stop();
        }
    }

    /** 保存音乐音效的音量、开关配置数据到本地 */
    save() {
        this.local_data.volume_music = this._volume_music;
        this.local_data.volume_effect = this._volume_effect;
        this.local_data.switch_music = this._switch_music;
        this.local_data.switch_effect = this._switch_effect;

        oops.storage.set(LOCAL_STORE_KEY, this.local_data);
    }


    /** 本地加载音乐音效的音量、开关配置数据并设置到游戏中 */
    load() {
        this.music = this.getComponent(AudioMusic) || this.addComponent(AudioMusic)!;
        this.effect = this.getComponent(AudioEffect) || this.addComponent(AudioEffect)!;

        this.local_data = oops.storage.getJson(LOCAL_STORE_KEY);
        if (this.local_data) {
            try {
                this.setState();
            }
            catch (e) {
                this.setStateDefault();
            }
        }
        else {
            this.setStateDefault();
        }

        if (this.music) this.music.volume = this._volume_music;
        if (this.effect) this.effect.volume = this._volume_effect;
    }

    private setState() {
        this._volume_music = this.local_data.volume_music;
        this._volume_effect = this.local_data.volume_effect;
        this._switch_music = this.local_data.switch_music;
        this._switch_effect = this.local_data.switch_effect;
    }

    private setStateDefault() {
        this.local_data = {};
        this._volume_music = 1;
        this._volume_effect = 1;
        this._switch_music = true;
        this._switch_effect = true;
    }
}