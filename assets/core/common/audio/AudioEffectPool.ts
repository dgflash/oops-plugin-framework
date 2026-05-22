import { AudioClip, Node, NodePool } from 'cc';
import { oops } from '../../Oops';
import { AudioClipLoader } from './AudioClipLoader';
import { AudioEffect } from './AudioEffect';
import { AudioEffectType } from './AudioEnum';
import type { IAudioData, IAudioParams } from './IAudio';
import { resLoader } from '../loader/ResLoader';

/** 音乐效缓冲编号最大值 */
const AE_ID_MAX = 30000;

/**
 * 音效池
 *
 * 内存管理思路：
 * 1. 引用计数机制：每个 AudioClip 通过 addRef/decRef 管理生命周期
 * 2. 自动释放：界面关闭时调用 releaseResByPath 减少引用计数
 * 3. 永久缓存：通过预加载时额外增加一次引用，使资源不会被界面释放清理
 * 4. 缓存复用：引用计数 > 0 的资源保留在 clipCache 中供后续界面复用
 */
export class AudioEffectPool {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = null!;
    /** 音频资源加载器 */
    private loader: AudioClipLoader = new AudioClipLoader();
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
     * 加载与播放音效
     * @param path               音效资源地址与音效资源
     * @param params             音效附加参数
     * @returns
     */
    async loadAndPlay(path: string | AudioClip, params?: IAudioParams): Promise<AudioEffect> {
        const finalParams = this.mergeParams(params);

        const iad = this.data[finalParams.type!];
        if (!iad) {
            console.error(`类型为【${finalParams.type!}】的音效配置不存在`);
            return null!;
        }

        if (!iad.switch) {
            return null!;
        }

        if (finalParams.volume == null) finalParams.volume = iad.volume;

        const bundle = finalParams.bundle!;
        let key: string;

        if (path instanceof AudioClip) {
            key = `${finalParams.type}_${path.uuid}`;
        }
        else {
            key = `${finalParams.type}_${bundle}_${path}`;
        }

        // 通过 loader 加载/获取资源（自动处理缓存和引用计数）
        const result = await this.loader.load(path, bundle);
        if (!result) {
            console.warn(`音效资源加载失败: ${key}`);
            return null!;
        }

        const clip = result.clip;
        if (!clip.isValid) {
            console.warn(`音效资源【${key}】已失效`);
            return null!;
        }

        // 获取音效播放器播放音乐
        let ae: AudioEffect;
        let node: Node;

        if (this.pool.size() === 0) {
            const aeid = this.getAeId();
            key = `${key}_${aeid}`;

            node = new Node('AudioEffect');
            ae = node.addComponent(AudioEffect)!;
            ae.key = key;
            ae.aeid = aeid;
            ae.onComplete = this.onAudioEffectPlayComplete.bind(this);
        }
        else {
            node = this.pool.get()!;
            ae = node.getComponent(AudioEffect)!;
        }

        // 记录正在播放的音效播放器
        this.effects.set(ae.key, ae);

        try {
            node.parent = oops.audio.node;
            ae.path = path;
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
            return null!;
        }
    }

    /** 音效播放完成 */
    private onAudioEffectPlayComplete(ae: AudioEffect) {
        // 通过 loader 释放资源引用（自动处理延迟释放）
        if (ae.path instanceof AudioClip) {
            this.loader.release(ae.path.uuid);
        }
        else {
            this.loader.release(ae.path as string, ae.params?.bundle);
        }

        // 循环播放的音效或自动释放音乐资源的音效，自动回收音乐播放器
        if (!ae.params.loop || ae.params.destroy) {
            ae.params && ae.params.onPlayComplete && ae.params.onPlayComplete(ae);
            this.put(ae);
        }
    }

    /**
     * 回收音效播放器
     * @param ae      loadAndPlay 方法返回的音效播放器对象
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

    /** 恢复所有音效 */
    play() {
        this.effects.forEach((ae) => ae.play());
    }

    /** 暂停所有音效 */
    pause() {
        // 使用数组缓存，避免在遍历时修改Map
        const effectsArray = Array.from(this.effects.values());
        for (let i = 0; i < effectsArray.length; i++) {
            const ae = effectsArray[i];
            ae.pause();
            this.onAudioEffectPlayComplete(ae);
        }
        this.effects.clear();
    }

    /** 释放所有音效资源与对象池中播放器 */
    release() {
        // 释放池中音乐播放器
        this.releasePool();

        // 清空 loader 缓存（强制释放所有音频资源）
        this.loader.clearCache();
    }

    /** 释放池中音乐播放器 */
    releasePool() {
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

    /**
     * 释放指定远程音效资源（立即释放，不等待延迟）
     * @param path      远程资源 URL
     * @returns         是否成功释放
     */
    releaseResRemoteByPath(path: string): boolean {
        this.loader.releaseImmediately(path);
        return true;
    }

    /**
     * 释放指定路径的音效资源引用
     * @param path      资源路径
     * @param bundle    资源包名（可选）
     */
    releaseResByPath(path: string, bundle?: string): void {
        this.loader.release(path, bundle);
    }

    private mergeParams(params?: IAudioParams): IAudioParams {
        return params ? {
            type: params.type ?? AudioEffectType.Effect,
            bundle: params.bundle ?? resLoader.defaultBundleName,
            loop: params.loop ?? false,
            destroy: params.destroy ?? false,
            volume: params.volume,
            onPlayComplete: params.onPlayComplete
        } : {
            type: AudioEffectType.Effect,
            bundle: resLoader.defaultBundleName,
            loop: false,
            destroy: false
        };
    }
}