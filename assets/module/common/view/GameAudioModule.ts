/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 */
import { oops } from '../../../core/Oops';
import type { AudioEffect } from '../../../core/common/audio/AudioEffect';
import type { IAudioParams } from '../../../core/common/audio/IAudio';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { GameViewModule } from './GameViewModuleBase';

/** 音频资源使用记录 */
interface IAudioUsage {
    /** 资源路径 */
    path: string;
    /** 资源包名 */
    bundle: string | null;
}

/** 音频播放 */
export class GameAudioModule extends GameViewModule {
    /** 当前界面使用的音效资源记录 */
    private usedAudios: IAudioUsage[] = [];
    /** 是否已销毁 */
    private isDestroyed = false;

    /** 播放背景音乐（全局唯一，不由界面管理生命周期）
     * @param url 音频资源路径
     * @param params 音频参数
     */
    playMusic(url: string, params?: IAudioParams): void {
        oops.audio.music.loadAndPlay(url, params);
    }

    /** 播放音效
     * @param url 音频资源路径
     * @param params 音频参数
     * @returns 音效对象
     */
    playEffect(url: string, params?: IAudioParams): Promise<AudioEffect | null> {
        return new Promise((resolve) => {
            if (params == null) {
                params = { bundle: resLoader.defaultBundleName };
            }
            else if (params.bundle == null) {
                params.bundle = resLoader.defaultBundleName;
            }

            oops.audio.playEffect(url, params).then((ae) => {
                // 资源加载成功且界面未销毁时才记录
                if (ae && !this.isDestroyed) {
                    this.recordAudioUsage(url, params!.bundle);
                }
                resolve(ae ?? null);
            });
        });
    }

    /**
     * 记录音频资源使用
     * @param path 资源路径
     * @param bundle 资源包名
     */
    private recordAudioUsage(path: string, bundle?: string): void {
        const usage: IAudioUsage = {
            path,
            bundle: bundle || null
        };
        this.usedAudios.push(usage);
    }

    /**
     * 组件销毁时释放所有使用的音效资源
     */
    destroy(): void {
        this.isDestroyed = true;

        // 释放音效资源
        for (const usage of this.usedAudios) {
            oops.audio.effect.releaseResByPath(usage.path, usage.bundle || undefined);
        }
        this.usedAudios = [];
    }
}