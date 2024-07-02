/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:22:36
 */
import { AudioClip, AudioSource, _decorator, error } from 'cc';
import { oops } from '../../Oops';
const { ccclass } = _decorator;

/**
 * 注：用playOneShot播放的音乐效果，在播放期间暂时没办法即时关闭音乐
 */

/** 资源加载记录 */
interface ResRecord {
    source: boolean;
    ac: AudioClip,
    bundle?: string,
    path?: string
}


/** 游戏音效 */
@ccclass('AudioEffect')
export class AudioEffect extends AudioSource {
    private effects: Map<string, ResRecord> = new Map<string, ResRecord>();

    private _progress: number = 0;
    /** 获取音乐播放进度 */
    get progress(): number {
        if (this.duration > 0)
            this._progress = this.currentTime / this.duration;
        return this._progress;
    }
    /**
     * 设置音乐当前播放进度
     * @param value     进度百分比0到1之间
     */
    set progress(value: number) {
        this._progress = value;
        this.currentTime = value * this.duration;
    }

    /**
     * 加载音效并播放
     * @param url           音效资源地址
     * @param callback      资源加载完成并开始播放回调
     */
    load(url: string | AudioClip, callback?: Function, bundleName?: string) {
        if (bundleName == null) bundleName = oops.res.defaultBundleName;

        // 资源播放音乐对象
        if (url instanceof AudioClip) {
            this.effects.set(url.uuid, { source: true, ac: url });
            this.playOneShot(url, this.volume);
            callback && callback();
        }
        else {
            // 地址加载音乐资源后播放
            if (this.effects.has(url) == false) {
                oops.res.load(bundleName, url, AudioClip, (err: Error | null, data: AudioClip) => {
                    if (err) {
                        error(err);
                        return;
                    }

                    let key = `${bundleName}:${url}`;
                    this.effects.set(key, { source: false, bundle: bundleName, path: url, ac: data });
                    this.playOneShot(data, this.volume);
                    callback && callback();
                });
            }
            // 播放缓存中音效
            else {
                const rr = this.effects.get(url)!;
                this.playOneShot(rr.ac, this.volume);
                callback && callback();
            }
        }
    }

    /** 释放所有已使用过的音效资源 */
    releaseAll() {
        for (let key in this.effects) {
            const rr = this.effects.get(key)!;
            if (rr.source) {
                this.release(rr.ac);
            }
            else {
                this.release(rr.path!, rr.bundle!);
            }
        }
        this.effects.clear();
    }

    /**
     * 释放指定地址音效资源
     * @param url           音效资源地址
     * @param bundleName    资源所在包名
     */
    release(url: string | AudioClip, bundleName?: string) {
        if (bundleName == null) bundleName = oops.res.defaultBundleName;

        var ac: AudioClip | undefined = undefined;
        if (url instanceof AudioClip) {
            ac = url;
            if (this.effects.has(ac.uuid)) {
                this.effects.delete(ac.uuid);
                ac.decRef();
            }
        }
        else {
            const key = `${bundleName}:${url}`;
            const rr = this.effects.get(key);
            if (rr) {
                this.effects.delete(key);
                oops.res.release(rr.path!, rr.bundle!);
            }
        }
    }
}