import { AudioClip, Node, NodePool } from 'cc';
import { oops } from '../../Oops';
import { resLoader } from '../loader/ResLoader';
import { AudioEffect } from './AudioEffect';
import { AudioEffectType } from './AudioEnum';
import type { IAudioData, IAudioParams } from './IAudio';

/** 音乐效缓冲编号最大值 */
const AE_ID_MAX = 30000;

/** 音效池 */
export class AudioEffectPool {
    /** 音效配置数据 */
    private data: { [node: string]: IAudioData } = null!;
    /** 音效播放器节点对象池 */
    private pool: NodePool = new NodePool();
    /** 对象池集合 */
    private effects: Map<string, AudioEffect> = new Map();
    /** 记录项目资源库中使用过的音乐资源 */
    private res_project: Map<string, Set<string>> = new Map();
    /** 外网远程资源记录(地址、音效对象) */
    private res_remote: Map<string, AudioClip> = new Map();
    /** 正在加载的资源Promise缓存，避免重复加载 */
    private loading_cache: Map<string, Promise<AudioClip>> = new Map();

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
        // 合并默认参数（减少对象创建）
        const finalParams: IAudioParams = params ? {
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
        let clip: AudioClip | null = null;
        
        // 通过预制自动加载的音效资源（音效内存跟随预制体的内存一并释放）
        if (path instanceof AudioClip) {
            key = `${finalParams.type}_${path.uuid}`;
            clip = path;
        }
        // 非引擎管理的远程资源加载
        else if (path.indexOf('http') === 0) {
            key = `${finalParams.type}_${path}`;
            clip = this.res_remote.get(path) || null;
            
            if (!clip) {
                // 检查是否正在加载，避免重复请求
                let loadPromise = this.loading_cache.get(path);
                if (!loadPromise) {
                    const extension = path.split('.').pop();
                    loadPromise = resLoader.loadRemote<AudioClip>(path, { ext: `.${extension}` });
                    this.loading_cache.set(path, loadPromise);
                }
                
                clip = await loadPromise;
                this.res_remote.set(path, clip);
                this.loading_cache.delete(path); // 加载完成后清除缓存
            }
        }
        // 资源加载
        else {
            key = `${finalParams.type}_${bundle}_${path}`;
            clip = resLoader.get(path, AudioClip, bundle);

            // 加载音效资源
            if (!clip) {
                const cacheKey = `${bundle}_${path}`;
                let loadPromise = this.loading_cache.get(cacheKey);
                
                if (!loadPromise) {
                    loadPromise = resLoader.load(bundle, path, AudioClip);
                    this.loading_cache.set(cacheKey, loadPromise);
                    
                    // 记录资源路径（使用Set避免重复）
                    let paths = this.res_project.get(bundle);
                    if (!paths) {
                        paths = new Set<string>();
                        this.res_project.set(bundle, paths);
                    }
                    paths.add(path);
                }
                
                clip = await loadPromise;
                this.loading_cache.delete(cacheKey); // 加载完成后清除缓存
            }
        }

        // 资源已被释放或加载失败
        if (!clip || !clip.isValid) {
            console.warn(`音效资源【${key!}】已被释放或加载失败`);
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

        node.parent = oops.audio.node;
        ae.path = path;
        ae.params = finalParams;
        ae.loop = finalParams.loop!;
        ae.volume = finalParams.volume!;
        ae.clip = clip;
        ae.play();

        return ae;
    }

    /** 音效播放完成 */
    private onAudioEffectPlayComplete(ae: AudioEffect) {
        if (ae.params.destroy) {
            if (ae.path instanceof AudioClip) {
                ae.path.decRef();
            }
            else {
                resLoader.release(ae.path, ae.params!.bundle);
            }
        }

        // 循环播放的音效或自动释放音乐资源的音效，自动回收音乐播放器
        if (!ae.params.loop || ae.params.destroy) {
            ae.params && ae.params.onPlayComplete && ae.params.onPlayComplete(ae);
            this.put(ae);
            // console.log(`【音效】回收，池中剩余音效播放器【${this.pool.size()}】`);
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

        // 释放各个资源包中的音效资源
        this.releaseRes();

        // 释放外网远程音效资源
        this.releaseResRemote();
        
        // 清空加载缓存
        this.loading_cache.clear();
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

    /** 释放各个资源包中的音效资源 */
    releaseRes() {
        this.res_project.forEach((paths: Set<string>, bundleName: string) => {
            paths.forEach((path) => resLoader.release(path, bundleName));
            paths.clear(); // 清空Set
        });
        this.res_project.clear();
    }

    /** 释放外网远程音效资源 */
    releaseResRemote() {
        this.res_remote.forEach((clip: AudioClip) => {
            if (clip && clip.isValid) {
                clip.decRef();
            }
        });
        this.res_remote.clear();
    }
}