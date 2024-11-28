import { AudioClip, Node, NodePool } from "cc";
import { oops } from "../../Oops";
import { resLoader } from "../loader/ResLoader";
import { AudioEffect } from "./AudioEffect";

const AE_ID_MAX = 30000;

/** 音效池 */
export class AudioEffectPool {
    private _switch: boolean = true;
    /** 音效开关 */
    public get switch(): boolean {
        return this._switch;
    }
    public set switch(value: boolean) {
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
    private res: Map<string, string> = new Map();

    private _aeId: number = 0;
    /** 获取请求唯一编号 */
    private getAeId() {
        if (this._aeId == AE_ID_MAX) this._aeId = 1;
        this._aeId++;
        return this._aeId;
    }

    /**
     * 加载与播放音效
     * @param url                  音效资源地址与音效资源
     * @param bundleName           资源包名
     * @param onPlayComplete       播放完成回调
     * @returns 
     */
    async load(url: string | AudioClip, bundleName: string = resLoader.defaultBundleName, onPlayComplete?: Function): Promise<number> {
        return new Promise(async (resolve, reject) => {
            if (!this.switch) return resolve(-1);

            // 创建音效资源
            let clip: AudioClip;
            if (url instanceof AudioClip) {
                clip = url;
            }
            else {
                clip = resLoader.get(url, AudioClip, bundleName)!;
                if (!clip) {
                    this.res.set(bundleName, url);
                    clip = await resLoader.loadAsync(bundleName, url, AudioClip);
                }
            }

            // 资源已被释放
            if (!clip.isValid) {
                resolve(-1);
                return;
            }

            let aeid = this.getAeId();
            let key: string;
            if (url instanceof AudioClip) {
                key = url.uuid;
            }
            else {
                key = `${bundleName}_${url}`;
            }
            key += "_" + aeid;

            // 获取音效果播放器播放音乐
            let ae: AudioEffect;
            let node: Node = null!;
            if (this.pool.size() == 0) {
                node = new Node();
                node.name = "AudioEffect";
                node.parent = oops.audio.node;
                ae = node.addComponent(AudioEffect)!;
            }
            else {
                node = this.pool.get()!;
                ae = node.getComponent(AudioEffect)!;
            }
            ae.onComplete = () => {
                this.put(aeid, url, bundleName);       // 播放完回收对象
                onPlayComplete && onPlayComplete();
                // console.log(`【音效】回收，池中剩余音效播放器【${this.pool.size()}】`);
            };

            // 记录正在播放的音效播放器
            this.effects.set(key, ae);

            ae.volume = this.volume;
            ae.clip = clip;
            ae.play();

            resolve(aeid);
        });
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

    /** 释放所有音效资源与对象池中播放器 */
    release() {
        // 释放正在播放的音效
        this.effects.forEach(ae => {
            ae.node.destroy();
        });
        this.effects.clear();

        // 释放音效资源
        this.res.forEach((url: string, bundleName: string) => {
            resLoader.release(bundleName, url);
        });

        // 释放池中播放器
        this.pool.clear();
    }

    /** 停止播放所有音效 */
    stop() {
        this.effects.forEach(ae => {
            ae.stop();
        });
    }

    /** 恢复所有音效 */
    play() {
        if (!this.switch) return;

        this.effects.forEach(ae => {
            ae.play();
        });
    }

    /** 暂停所有音效 */
    pause() {
        if (!this.switch) return;

        this.effects.forEach(ae => {
            ae.pause();
        });
    }
}