import { AudioClip, Component } from "cc";
import { oops } from "../../Oops";
import { AudioEffect } from "./AudioEffect";
import { AudioEffectPool } from "./AudioEffectPool";
import { AudioMusic } from "./AudioMusic";
import { IAudioData, IAudioParams } from "./IAudio";

const LOCAL_STORE_KEY = "game_audio";

/** 音乐音效默认类型 */
export enum AudioEffectType {
    /** 背景音乐 */
    Music = "music",
    /** 音乐音效 */
    Effect = "effect",
}

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
    private data: { [node: string]: IAudioData } = {};

    /**
     * 播放音效
     * @param url        资源地址
     * @param params     音效参数
     */
    playEffect(url: string | AudioClip, params?: IAudioParams): Promise<AudioEffect> {
        return this.effect.loadAndPlay(url, params);
    }

    /** 回收音效播放器 */
    putEffect(ae: AudioEffect) {
        this.effect.put(ae);
    }

    /** 恢复当前暂停的音乐与音效播放 */
    resumeAll() {
        this.music.resume();
    }

    /** 暂停当前音乐与音效的播放 */
    pauseAll() {
        this.music.pause();
        this.effect.pause();
    }

    /** 停止当前音乐与音效的播放 */
    stopAll() {
        this.music.stop();
        this.effect.stop();
    }

    /** 保存音乐音效的音量、开关配置数据到本地 */
    save() {
        oops.storage.set(LOCAL_STORE_KEY, this.data);
    }

    /** 本地加载音乐音效的音量、开关配置数据并设置到游戏中 */
    load() {
        this.music = this.getComponent(AudioMusic) || this.addComponent(AudioMusic)!;

        this.data = oops.storage.getJson(LOCAL_STORE_KEY);
        if (this.data) {
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
        for (let type in this.data) {
            let iad = this.data[type];
            switch (type) {
                case "music":
                    this.music.switch = this.data.music.switch;
                    this.music.volume = this.data.music.volume;
                    break;
                default:
                    this.effect.setSwitch(type, iad.switch);
                    this.effect.setVolume(type, iad.volume);
                    break;
            }
        }
    }

    private setStateDefault() {
        this.data = {
            music: { switch: true, volume: 1 },
            effect: { switch: true, volume: 1 },
        };

        //@ts-ignore
        this.music.data = this.data;
        this.music.switch = true
        this.music.volume = 1;

        //@ts-ignore
        this.effect.data = this.data;
        this.effect.setSwitch(AudioEffectType.Effect, true);
        this.effect.setVolume(AudioEffectType.Effect, 1);

        this.save();
    }
}