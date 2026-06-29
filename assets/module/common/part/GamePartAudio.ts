import { AudioClip } from 'cc';
import type { GameComponent } from '../GameComponent';
import { oops } from '../../../core/Oops';
import type { AudioEffect } from '../../../core/common/audio/AudioEffect';
import type { IAudioParams } from '../../../core/common/audio/IAudio';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { GamePartBase } from '../GamePartBase';

/** 音频播放选项 */
export interface IAudioPlayOptions extends IAudioParams {
    /** 资源包名 */
    bundle?: string;
    /** 是否为远程资源 */
    isRemote?: boolean;
}

/** 音频播放
 * 资源内存由 ResAutoTracker 自动管理，界面销毁时自动释放
 */
export class GamePartAudio extends GamePartBase {
    /** 宿主组件 */
    protected declare comp: GameComponent;

    /** 当前播放的背景音乐资源 */
    private currentMusic: AudioClip | null = null;

    /** 检查音乐功能是否启用 */
    private isMusicEnabled(): boolean {
        return oops.audio?.music?.getSwitch?.() ?? true;
    }

    /** 检查音效功能是否启用 */
    private isEffectEnabled(): boolean {
        return oops.audio?.effect?.getSwitch?.() ?? true;
    }

    /** 播放背景音乐
     * @param url 音频资源路径或URL
     * @param options 音频播放选项
     */
    async playMusic(url: string, options?: IAudioPlayOptions): Promise<void> {
        // 音乐功能被禁用时直接返回
        if (!this.isMusicEnabled()) return;

        const clip = await this.loadAudioClip(url, options);

        if (!clip) {
            console.warn(`背景音乐资源加载失败: ${url}`);
            return;
        }

        // 使用 this.comp.isValid 检查组件是否有效
        if (!this.comp.isValid) {
            // 界面已销毁，不播放
            return;
        }

        // 再次检查音乐功能是否启用（异步加载期间可能被禁用）
        if (!this.isMusicEnabled()) return;

        // 记录当前背景音乐
        this.currentMusic = clip;

        // 使用已加载的 AudioClip 播放
        oops.audio.playMusic(clip, options);
    }

    /** 播放音效
     * @param url 音频资源路径或URL
     * @param options 音频播放选项
     * @returns 音效对象
     */
    async playEffect(url: string, options?: IAudioPlayOptions): Promise<AudioEffect | null> {
        // 音效功能被禁用时直接返回
        if (!this.isEffectEnabled()) return null;

        const clip = await this.loadAudioClip(url, options);

        if (!clip) {
            console.warn(`音效资源加载失败: ${url}`);
            return null;
        }

        // 使用 this.comp.isValid 检查组件是否有效
        if (!this.comp.isValid) {
            // 界面已销毁，不播放
            return null;
        }

        // 再次检查音效功能是否启用（异步加载期间可能被禁用）
        if (!this.isEffectEnabled()) return null;

        // 使用已加载的 AudioClip 播放
        const ae = oops.audio.playEffect(clip, options);
        return ae;
    }

    /**
     * 组件销毁时停止音乐并清理
     * 资源释放由 ResAutoTracker 自动处理
     */
    destroy(): void {
        // 停止当前背景音乐
        if (this.currentMusic) {
            oops.audio.music.stop();
            this.currentMusic = null;
        }
    }

    /**
     * 加载音频资源
     * @param url 资源路径或URL
     * @param options 音频播放选项
     * @returns 音频资源
     */
    private async loadAudioClip(url: string, options?: IAudioPlayOptions): Promise<AudioClip | null> {
        const isRemote = options?.isRemote ?? false;
        const bundle = options?.bundle ?? resLoader.defaultBundleName;

        if (isRemote) {
            // 加载远程资源（ResAutoTracker 自动管理）
            return await this.comp.res.loadRemote<AudioClip>(url);
        }
        else {
            // 加载本地资源（ResAutoTracker 自动管理）
            return await this.comp.res.load(bundle, url, AudioClip);
        }
    }
}
