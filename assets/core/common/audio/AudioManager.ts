import { AudioClip, Component } from "cc";
import { oops } from "../../Oops";
import { AudioEffectPool } from "./AudioEffectPool";
import { AudioMusic } from "./AudioMusic";

const LOCAL_STORE_KEY = "game_audio";

/**
 * 音频管理
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037893&doc_id=2873565
 * @example
 // 模块功能通过 oops.audio 调用
 oops.audio.playMusic("audios/nocturne");
 */
export class AudioManager extends Component {
    /** 背景音乐管理对象 */
    music: AudioMusic = null!;
    /** 音效管理对象 */
    effect: AudioEffectPool = new AudioEffectPool();

    /** 音乐管理状态数据 */
    private local_data: any = {};

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
     * @param bundleName 资源包名
     */
    playMusic(url: string, callback?: Function, bundleName?: string) {
        if (this.music.switch) {
            this.music.loop = false;
            this.music.load(url, callback, bundleName).then();
        }
    }

    /** 循环播放背景音乐 */
    playMusicLoop(url: string, bundleName?: string) {
        if (this.music.switch) {
            this.music.loop = true;
            this.music.load(url, null!, bundleName).then();
        }
    }

    /** 停止背景音乐播放 */
    stopMusic() {
        if (this.music.switch && this.music.playing) {
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
        return this.music.volume;
    }

    /**
     * 设置背景音乐音量
     * @param value     音乐音量值
     */
    set volumeMusic(value: number) {
        this.music.volume = value;
        this.save();
    }

    /**
     * 获取背景音乐开关值
     */
    get switchMusic(): boolean {
        return this.music.switch;
    }

    /**
     * 设置背景音乐开关值
     * @param value     开关值
     */
    set switchMusic(value: boolean) {
        this.music.switch = value;
        if (!value) this.music.stop();
        this.save();
    }

    /**
     * 播放音效
     * @param url        资源地址
     * @param callback   加载完成回调
     * @param bundleName 资源包名
     */
    playEffect(url: string | AudioClip, bundleName?: string, onPlayComplete?: Function): Promise<number> {
        return this.effect.load(url, bundleName, onPlayComplete);
    }

    /** 回收音效播放器 */
    putEffect(aeid: number, url: string | AudioClip, bundleName?: string) {
        this.effect.put(aeid, url, bundleName);
    }

    /** 获取音效音量 */
    get volumeEffect(): number {
        return this.effect.volume;
    }

    /**
     * 设置获取音效音量
     * @param value     音效音量值
     */
    set volumeEffect(value: number) {
        this.effect.volume = value;
        this.save();
    }

    /** 获取音效开关值 */
    get switchEffect(): boolean {
        return this.effect.switch;
    }

    /**
     * 设置音效开关值
     * @param value     音效开关值
     */
    set switchEffect(value: boolean) {
        this.effect.switch = value;
        if (!value) this.effect.stop();
        this.save();
    }

    /** 恢复当前暂停的音乐与音效播放 */
    resumeAll() {
        if (!this.music.playing && this.music.progress > 0) this.music.play();
        this.effect.play();
    }

    /** 暂停当前音乐与音效的播放 */
    pauseAll() {
        if (this.music.playing) this.music.pause();
        this.effect.pause();
    }

    /** 停止当前音乐与音效的播放 */
    stopAll() {
        this.music.stop();
        this.effect.stop();
    }

    /** 保存音乐音效的音量、开关配置数据到本地 */
    save() {
        this.local_data.volume_music = this.music.volume;
        this.local_data.volume_effect = this.effect.volume;
        this.local_data.switch_music = this.music.switch;
        this.local_data.switch_effect = this.effect.switch;

        oops.storage.set(LOCAL_STORE_KEY, this.local_data);
    }

    /** 本地加载音乐音效的音量、开关配置数据并设置到游戏中 */
    load() {
        this.music = this.getComponent(AudioMusic) || this.addComponent(AudioMusic)!;

        this.local_data = oops.storage.getJson(LOCAL_STORE_KEY);
        if (this.local_data) {
            try {
                this.setState();
            }
            catch {
                this.setStateDefault();
            }
        }
        else {
            this.setStateDefault();
        }
    }

    private setState() {
        this.music.volume = this.local_data.volume_music;
        this.effect.volume = this.local_data.volume_effect;
        this.music.switch = this.local_data.switch_music;
        this.effect.switch = this.local_data.switch_effect;
    }

    private setStateDefault() {
        this.local_data = {};
        this.music.volume = 1;
        this.effect.volume = 1;
        this.music.switch = true;
        this.effect.switch = true;
    }
}