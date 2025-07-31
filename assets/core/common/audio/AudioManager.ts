import { AudioClip, Component } from "cc";
import { oops } from "../../Oops";
import { AudioEffectPool } from "./AudioEffectPool";
import { AudioMusic } from "./AudioMusic";
import { IAudioParams } from "./IAudio";

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
    private localData: any = {};

    /**
     * 播放音效
     * @param url        资源地址
     * @param params     音效参数
     */
    playEffect(url: string | AudioClip, params?: IAudioParams): Promise<number> {
        return this.effect.loadAndPlay(url, params);
    }

    /** 回收音效播放器 */
    putEffect(aeid: number, url: string | AudioClip, bundleName?: string) {
        this.effect.put(aeid, url, bundleName);
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
        this.localData.volume_music = this.music.volume;
        this.localData.volume_effect = this.effect.volume;
        this.localData.switch_music = this.music.switch;
        this.localData.switch_effect = this.effect.switch;

        oops.storage.set(LOCAL_STORE_KEY, this.localData);
    }

    /** 本地加载音乐音效的音量、开关配置数据并设置到游戏中 */
    load() {
        this.music = this.getComponent(AudioMusic) || this.addComponent(AudioMusic)!;

        this.localData = oops.storage.getJson(LOCAL_STORE_KEY);
        if (this.localData) {
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
        this.music.volume = this.localData.volume_music;
        this.effect.volume = this.localData.volume_effect;
        this.music.switch = this.localData.switch_music;
        this.effect.switch = this.localData.switch_effect;
    }

    private setStateDefault() {
        this.localData = {};
        this.music.volume = 1;
        this.effect.volume = 1;
        this.music.switch = true;
        this.effect.switch = true;
    }
}