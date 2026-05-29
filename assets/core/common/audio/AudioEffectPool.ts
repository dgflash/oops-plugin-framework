import { AudioClip, AudioSource, Node, NodePool } from 'cc';
import { oops } from '../../Oops';
import { AudioEffect } from './AudioEffect';
import { AudioEffectType } from './AudioEnum';
import type { IAudioData, IAudioParams } from './IAudio';

/** 音乐效缓冲编号最大值 */
const AE_ID_MAX = 30000;

/**
 * 音效池
 *
 * 职责：
 * 1. 不负责资源加载，只接收 AudioClip 实例进行播放
 * 2. 管理音效播放器对象池
 * 3. 资源加载与释放由外部（GameResModule + ResAutoTracker）管理
 */
export class AudioEffectPool {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = {};
    /** 音效播放器节点对象池 */
    private pool: NodePool = new NodePool();
    /** 正在播放的音效播放器集合 */
    private effects: Map<string, AudioEffect> = new Map();

    private _aeId = 0;
    /** 获取请求唯一编号 */
    private getAeId() {
        if (this._aeId >= AE_ID_MAX) this._aeId = 0;
        return ++this._aeId;
    }

    /**
     * 注册音效类型
     * @param type
     */
    register(type: string) {
        this.data[type] = { switch: true, volume: 1 };
    }

    /**
     * 音效开关
     * @param type      音效类型
     * @returns         音效开关
     */
    getSwitch(type: string = AudioEffectType.Effect) {
        const iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        return iad.switch;
    }
    /**
     * 音效音量设置
     * @param type      音效类型
     * @param value     音效开关
     */
    setSwitch(value: boolean, type: string = AudioEffectType.Effect) {
        const iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        iad.switch = value;

        if (!value) this.stop();
    }

    /**
     * 音效音量获取
     * @param type      音效类型
     * @returns         音效音量
     */
    getVolume(type: string = AudioEffectType.Effect) {
        const iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        return iad.volume;
    }
    /**
     * 音效音量设置
     * @param value     音效音量
     * @param type      音效类型
     */
    setVolume(value: number, type: string = AudioEffectType.Effect) {
        const iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        iad.volume = value;

        this.effects.forEach((ac) => ac.volume = value);
    }

    /**
     * 播放音效
     * @param clip               AudioClip 实例
     * @param params             音效附加参数
     * @returns
     */
    play(clip: AudioClip, params?: IAudioParams): AudioEffect | null {
        const finalParams = this.mergeParams(params);

        const iad = this.data[finalParams.type!];
        if (!iad) {
            console.error(`类型为【${finalParams.type!}】的音效配置不存在`);
            return null;
        }

        if (!iad.switch) {
            return null;
        }

        if (finalParams.volume == null) finalParams.volume = iad.volume;

        const key = `${finalParams.type}_${clip.uuid}_${this.getAeId()}`;

        if (!clip.isValid) {
            console.warn(`音效资源【${key}】已失效`);
            return null;
        }

        // 获取音效播放器播放音乐
        let ae: AudioEffect;
        let node: Node;

        if (this.pool.size() === 0) {
            node = new Node('AudioEffect');
            ae = node.addComponent(AudioEffect)!;
            ae.onComplete = this.onAudioEffectPlayComplete.bind(this);
        }
        else {
            node = this.pool.get()!;
            ae = node.getComponent(AudioEffect)!;
        }

        ae.key = key;
        ae.aeid = this._aeId;

        // 记录正在播放的音效播放器
        this.effects.set(ae.key, ae);

        try {
            node.parent = oops.audio.node;
            ae.path = clip;
            ae.params = finalParams;
            ae.loop = finalParams.loop!;
            ae.volume = finalParams.volume!;
            ae.clip = clip;
            ae.play();

            return ae;
        }
        catch (e) {
            // 播放异常时清理 effects 条目，防止残留
            this.effects.delete(ae.key);
            this.put(ae);
            console.warn(`音效播放异常，已回收: ${key}`, e);
            return null;
        }
    }

    /** 音效播放完成 */
    private onAudioEffectPlayComplete(ae: AudioEffect) {
        // 非循环播放的音效，自动回收播放器
        if (!ae.params.loop) {
            ae.params && ae.params.onPlayComplete && ae.params.onPlayComplete(ae);
            this.put(ae);
        }
    }

    /**
     * 回收音效播放器
     * @param ae      play 方法返回的音效播放器对象
     */
    put(ae: AudioEffect) {
        const effect = this.effects.get(ae.key);
        if (effect && effect.clip) {
            effect.reset();

            this.effects.delete(ae.key);
            this.pool.put(effect.node);
        }
    }

    /** 停止播放所有音效 */
    stop() {
        // 使用数组缓存，避免在遍历时修改Map
        const effectsArray = Array.from(this.effects.values());
        for (let i = 0; i < effectsArray.length; i++) {
            const ae = effectsArray[i];
            ae.stop();
            this.onAudioEffectPlayComplete(ae);
        }
        this.effects.clear();
    }

    /** 恢复或播放所有音效 */
    resume() {
        this.effects.forEach((ae) => {
            // 如果是暂停状态则恢复，如果是停止状态则播放
            if (ae.state === AudioSource.AudioState.PAUSED) {
                ae.play();
            }
            else if (ae.state === AudioSource.AudioState.INIT || ae.state === AudioSource.AudioState.STOPPED) {
                ae.play();
            }
        });
    }

    /** 暂停所有音效 */
    pause() {
        // 使用数组缓存，避免在遍历时修改Map
        const effectsArray = Array.from(this.effects.values());
        for (let i = 0; i < effectsArray.length; i++) {
            const ae = effectsArray[i];
            ae.pause();
            // 暂停时不回收音效播放器，只是暂停播放
        }
    }

    /** 释放所有音效播放器 */
    release() {
        this.pool.clear();

        // 释放正在播放的音效对象
        const effectsArray = Array.from(this.effects.values());
        for (let i = 0; i < effectsArray.length; i++) {
            effectsArray[i].node.destroy();
        }
        this.effects.clear();
    }

    /**
     * 按容量释放对象池中的空闲节点
     * @param maxSize   保留的最大空闲节点数，超出部分销毁
     * @returns         实际销毁的节点数
     */
    releasePoolBySize(maxSize: number): number {
        let destroyed = 0;
        while (this.pool.size() > maxSize) {
            const node = this.pool.get();
            if (node) {
                node.destroy();
                destroyed++;
            }
            else {
                break;
            }
        }
        return destroyed;
    }

    private mergeParams(params?: IAudioParams): IAudioParams {
        return params ? {
            type: params.type ?? AudioEffectType.Effect,
            loop: params.loop ?? false,
            volume: params.volume,
            onPlayComplete: params.onPlayComplete
        } : {
            type: AudioEffectType.Effect,
            loop: false
        };
    }
}
