import { AudioClip, Node, NodePool } from "cc";
import { oops } from "../../Oops";
import { resLoader } from "../loader/ResLoader";
import { AudioEffect } from "./AudioEffect";
import { AudioEffectType } from "./AudioEnum";
import { IAudioData, IAudioParams } from "./IAudio";

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
    private res_project: Map<string, string[]> = new Map();
    /** 外网远程资源记录(地址、音效对象) */
    private res_remote: Map<string, AudioClip> = new Map();

    private _aeId: number = 0;
    /** 获取请求唯一编号 */
    private getAeId() {
        if (this._aeId == AE_ID_MAX) this._aeId = 1;
        this._aeId++;
        return this._aeId;
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
        let iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        return iad.switch;
    }
    /**
     * 音效音量设置
     * @param type      音效类型
     * @param value     音效开关
     */
    setSwitch(value: boolean, type: string = AudioEffectType.Effect) {
        let iad = this.data[type];
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
        let iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        return iad.volume;
    }

    /**
     * 音效音量设置
     * @param value     音效音量
     * @param type      音效类型
     */
    setVolume(value: number, type: string = AudioEffectType.Effect) {
        let iad = this.data[type];
        if (iad == null) console.error(`类型为【${type}】的音效配置不存在`);
        iad.volume = value;

        this.effects.forEach(ac => ac.volume = value);
    }

    /**
     * 加载与播放音效
     * @param path               音效资源地址与音效资源
     * @param params             音效附加参数
     * @returns 
     */
    async loadAndPlay(path: string | AudioClip, params?: IAudioParams): Promise<AudioEffect> {
        return new Promise(async (resolve, reject) => {
            if (params == null) {
                params = {
                    type: AudioEffectType.Effect,
                    bundle: resLoader.defaultBundleName,
                    loop: false,
                    destroy: false
                }
            }
            else {
                if (params.type == null) params.type = AudioEffectType.Effect;
                if (params.bundle == null) params.bundle = resLoader.defaultBundleName;
                if (params.loop == null) params.loop = false;
                if (params.type == null) params.destroy = false;
            }

            let iad = this.data[params.type!];
            if (iad == null) console.error(`类型为【${params.type!}】的音效配置不存在`);

            if (!iad.switch) {
                resolve(null!);
                return;
            }

            if (params.volume == null) params.volume = iad.volume;

            let bundle = params.bundle!;
            let key: string = null!;
            let clip: AudioClip | undefined;
            // 通过预制自动加载的音效资源（音效内存跟随预制体的内存一并释放）
            if (path instanceof AudioClip) {
                key = `${params.type}_${path.uuid}`;
                clip = path;
            }
            // 非引擎管理的远程资源加载
            else if (path.indexOf("http") == 0) {
                key = `${params.type}_${path}`;
                clip = this.res_remote.get(path);
                if (clip == null) {
                    const extension = path.split('.').pop();
                    clip = await resLoader.loadRemote<AudioClip>(path, { ext: `.${extension}` });
                    this.res_remote.set(path, clip);
                }
            }
            // 资源加载
            else {
                key = `${params.type}_${bundle}_${path}`;
                clip = resLoader.get(path, AudioClip, bundle)!;

                // 加载音效资源 - 如果一个预制上加载了了音乐同一个音乐资源，此处不会记录音乐资源路径数据，资源内存由预制释放时一起释放
                if (clip == null) {
                    let paths = this.res_project.get(bundle);
                    if (paths == null) {
                        paths = [];
                        this.res_project.set(bundle, paths);
                    }
                    if (paths.indexOf(path) == -1) paths.push(path);
                    clip = await resLoader.loadAsync(bundle, path, AudioClip);
                }
            }

            // 资源已被释放
            if (!clip.isValid) {
                console.warn(`音效资源【${key}】已被释放`);
                resolve(null!);
                return;
            }

            // 获取音效果播放器播放音乐
            let aeid: number = -1;
            let ae: AudioEffect;
            let node: Node = null!;
            if (this.pool.size() == 0) {
                aeid = this.getAeId();
                key += "_" + aeid;

                node = new Node("AudioEffect");
                ae = node.addComponent(AudioEffect);
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
            ae.params = params;
            ae.loop = params.loop!;
            ae.volume = params.volume!;
            ae.clip = clip;
            ae.play();

            resolve(ae);
        });
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
        ae.params && ae.params.onPlayComplete && ae.params.onPlayComplete(ae);
        this.put(ae);
        // console.log(`【音效】回收，池中剩余音效播放器【${this.pool.size()}】`);
    }

    /**
     * 回收音效播放器
     * @param ae      loadAndPlay 方法返回的音效播放器对象
     */
    put(ae: AudioEffect) {
        let effect = this.effects.get(ae.key);
        if (effect && effect.clip) {
            effect.reset();

            this.effects.delete(ae.key);
            this.pool.put(effect.node);
        }
    }

    /** 停止播放所有音效 */
    stop() {
        this.effects.forEach(ae => {
            ae.stop();
            this.onAudioEffectPlayComplete(ae);
        });
        this.effects.clear();
    }

    /** 恢复所有音效 */
    play() {
        this.effects.forEach(ae => ae.play());
    }

    /** 暂停所有音效 */
    pause() {
        this.effects.forEach(ae => {
            ae.pause();
            this.onAudioEffectPlayComplete(ae);
        });
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
    }

    /** 释放池中音乐播放器 */
    releasePool() {
        this.pool.clear();

        // 释放正在播放的音效对象
        this.effects.forEach(ae => ae.node.destroy());
        this.effects.clear();
    }

    /** 释放各个资源包中的音效资源 */
    releaseRes() {
        this.res_project.forEach((paths: string[], bundleName: string) => {
            paths.forEach(path => resLoader.release(path, bundleName));
        });
    }

    /** 释放外网远程音效资源 */
    releaseResRemote() {
        this.res_remote.forEach((clip: AudioClip, path: string) => {
            clip.decRef();
        });
        this.res_remote.clear();
    }
}