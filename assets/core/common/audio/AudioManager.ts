import { AudioClip, Component } from "cc";
import { oops } from "../../Oops";
import { AudioEffect } from "./AudioEffect";
import { AudioEffectPool } from "./AudioEffectPool";
import { AudioEffectType } from "./AudioEnum";
import { AudioMusic } from "./AudioMusic";
import { IAudioData, IAudioParams } from "./IAudio";

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
    private data: { [node: string]: IAudioData } = {};

    /**
     * 播放背景音乐
     * @param path      资源路径
     * @param params    音效参数
     */
    playMusic(path: string, params?: IAudioParams) {
        this.music.loadAndPlay(path, params);
    }

    /**
     * 播放音效
     * @param path      资源路径
     * @param params    音效参数
     */
    playEffect(path: string | AudioClip, params?: IAudioParams): Promise<AudioEffect> {
        return this.effect.loadAndPlay(path, params);
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
        this.music = new AudioMusic();
        this.music.parent = this.node;

        this.data = oops.storage.getJson(LOCAL_STORE_KEY);
        if (this.data) {
            this.setState();
        }
        else {
            this.setStateDefault();
        }
    }

    private setState() {
        //@ts-ignore
        this.music.data = this.data;
        //@ts-ignore
        this.effect.data = this.data;
    }

    /** 默认音乐配置数据 */
    private setStateDefault() {
        this.data = {};
        for (const key in AudioEffectType) {
            //@ts-ignore
            const value = AudioEffectType[key];
            if (typeof value === 'string') {
                this.data[value] = { switch: true, volume: 1 };
                switch (value) {
                    case AudioEffectType.Music:
                        //@ts-ignore
                        this.music.data = this.data;
                        this.music.setSwitch(true);
                        this.music.setVolume(1);
                        break;
                    default:
                        //@ts-ignore
                        this.effect.data = this.data;
                        this.effect.setSwitch(true, value);
                        this.effect.setVolume(1, value);
                        break;
                }
            }
        }
        this.save();
    }
}