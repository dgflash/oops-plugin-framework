import { AudioClip, Node, NodePool } from "cc";
import { oops } from "../../Oops";
import { resLoader } from "../loader/ResLoader";
import { AudioEffect } from "./AudioEffect";
import { IAudioParams } from "./IAudio";

const AE_ID_MAX = 30000;

/** 音效池 */
export class AudioEffectPool {
    private _switch: boolean = true;
    /** 音效开关 */
    get switch(): boolean {
        return this._switch;
    }
    set switch(value: boolean) {
        this._switch = value;
        if (value) this.stop();
    }

    private _volume: number = 1;
    /** 所有音效音量 */
    get volume(): number {
        return this._volume;
    }
    set volume(value: number) {
        this._volume = value;

        this.effects.forEach(ae => {
            ae.volume = value;
        });
    }

    /** 音效播放器对象池 */
    private pool: NodePool = new NodePool();
    /** 对象池集合 */
    private effects: Map<string, AudioEffect> = new Map();
    /** 用过的音效资源记录 */
    private res: Map<string, string[]> = new Map();

    private _aeId: number = 0;
    /** 获取请求唯一编号 */
    private getAeId() {
        if (this._aeId == AE_ID_MAX) this._aeId = 1;
        this._aeId++;
        return this._aeId;
    }

    /**
     * 加载与播放音效
     * @param path               音效资源地址与音效资源
     * @param params            音效附加参数
     * @returns 
     */
    async loadAndPlay(path: string | AudioClip, params?: IAudioParams): Promise<number> {
        return new Promise(async (resolve, reject) => {
            if (!this.switch) return resolve(-1);

            if (params == null) {
                params = {
                    bundle: resLoader.defaultBundleName,
                    volume: this.volume,
                    loop: false,
                }
            }
            else {
                if (params.bundle == null) params.bundle = resLoader.defaultBundleName;
                if (params.volume == null) params.volume = this.volume;
                if (params.loop == null) params.loop = false;
            }

            let bundle = params.bundle!;
            let volume = params.volume!;
            let loop = params.loop!;

            // 创建音效资源
            let clip: AudioClip;
            if (path instanceof AudioClip) {
                clip = path;
            }
            else {
                clip = resLoader.get(path, AudioClip, bundle)!;

                // 加载音效资源
                if (clip == null) {
                    let urls = this.res.get(bundle);
                    if (urls == null) {
                        urls = [];
                        this.res.set(bundle, urls);
                        urls.push(path);
                    }
                    else if (urls.indexOf(path) == -1) {
                        urls.push(path);
                    }
                    clip = await resLoader.loadAsync(bundle, path, AudioClip);
                }
            }

            // 资源已被释放
            if (!clip.isValid) {
                resolve(-1);
                return;
            }

            // 获取音效果播放器播放音乐
            let aeid: number = -1;
            let key: string = null!;
            let ae: AudioEffect;
            let node: Node = null!;
            if (this.pool.size() == 0) {
                aeid = this.getAeId();
                if (path instanceof AudioClip) {
                    key = path.uuid;
                }
                else {
                    key = `${bundle}_${path}`;
                }
                key += "_" + aeid;

                node = new Node("AudioEffect");
                node.parent = oops.audio.node;

                ae = node.addComponent(AudioEffect);
                ae.key = key;
                ae.aeid = aeid;
                ae.path = path;
                ae.params = params;
                ae.clip = clip;
                ae.onComplete = this.onAudioEffectPlayComplete.bind(this);
            }
            else {
                node = this.pool.get()!;
                node.parent = oops.audio.node;
                ae = node.getComponent(AudioEffect)!;
                aeid = ae.aeid;
                key = ae.key;
            }
            // 记录正在播放的音效播放器
            this.effects.set(key, ae);

            ae.loop = loop;
            ae.volume = volume;
            ae.play();
            resolve(aeid);
        });
    }

    private onAudioEffectPlayComplete(ae: AudioEffect) {
        const bundle = ae.params!.bundle!;
        this.put(ae.aeid, ae.path, bundle);       // 播放完回收对象
        ae.params && ae.params.onPlayComplete && ae.params.onPlayComplete(ae.aeid, ae.path, bundle);
        console.log(`【音效】回收，池中剩余音效播放器【${this.pool.size()}】`);
    }

    /**
     * 回收音效播放器
     * @param aeid          播放器编号
     * @param url           音效路径
     * @param bundleName    资源包名
     */
    put(aeid: number, url: string | AudioClip, bundleName: string = resLoader.defaultBundleName) {
        let key: string;
        if (url instanceof AudioClip) {
            key = url.uuid;
        }
        else {
            key = `${bundleName}_${url}`;
        }
        key += "_" + aeid;

        let ae = this.effects.get(key);
        if (ae && ae.clip) {
            this.effects.delete(key);
            ae.stop();
            this.pool.put(ae.node);
        }
    }

    /** 停止播放所有音效 */
    stop() {
        this.effects.forEach(ae => ae.stop());
    }

    /** 恢复所有音效 */
    play() {
        if (!this.switch) return;
        this.effects.forEach(ae => ae.play());
    }

    /** 暂停所有音效 */
    pause() {
        if (!this.switch) return;

        this.effects.forEach(ae => ae.pause());
    }

    /** 释放所有音效资源与对象池中播放器 */
    release() {
        // 释放正在播放的音效
        this.effects.forEach(ae => ae.node.destroy());
        this.effects.clear();

        // 释放音效资源
        this.res.forEach((urls: string[], bundleName: string) => {
            urls.forEach(url => resLoader.release(url, bundleName));
        });

        // 释放池中播放器
        this.pool.clear();
    }
}