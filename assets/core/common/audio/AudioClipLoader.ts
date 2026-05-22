import { AudioClip } from 'cc';
import { resLoader } from '../loader/ResLoader';

/** 加载结果 */
export interface ILoadResult {
    /** 加载成功的 AudioClip */
    clip: AudioClip;
    /** 原始路径（URL 或 bundle 内路径） */
    path: string;
    /** 资源包名（远程资源时为 null） */
    bundle: string | null;
    /** 是否为远程资源 */
    isRemote: boolean;
}

/**
 * 音频资源加载器
 * 统一处理三种来源的 AudioClip 获取：
 * 1. 直接传入 AudioClip 实例
 * 2. 远程 URL 加载
 * 3. Bundle 内资源加载
 */
export class AudioClipLoader {
    /** 加载中缓存，避免同一资源重复加载 */
    private loadingCache: Map<string, Promise<AudioClip>> = new Map();
    /** 已加载的 AudioClip 缓存 */
    private clipCache: Map<string, AudioClip> = new Map();

    /**
     * 从三种来源获取 AudioClip
     * @param path - AudioClip 实例、远程 URL、或 bundle 内路径
     * @param bundle - 资源包名（path 为 AudioClip 或 URL 时忽略）
     * @returns 加载结果，失败返回 null
     */
    async load(
        path: string | AudioClip,
        bundle?: string
    ): Promise<ILoadResult | null> {
        if (path instanceof AudioClip) {
            if (!path.isValid) {
                console.warn(`AudioClip 实例已失效`);
                return null;
            }
            // 外部传入的 AudioClip 实例，增加引擎引用计数
            path.addRef();
            return { clip: path, path: path.uuid, bundle: null, isRemote: false };
        }

        const cacheKey = this.getCacheKey(path, bundle);
        const cached = this.clipCache.get(cacheKey);

        if (cached && cached.isValid) {
            // 增加引擎引用计数
            cached.addRef();
            return { clip: cached, path, bundle: bundle || null, isRemote: path.indexOf('http') === 0 };
        }

        if (path.indexOf('http') === 0) {
            return this.loadRemote(path);
        }

        return this.loadBundle(path, bundle || resLoader.defaultBundleName);
    }

    /**
     * 释放指定路径的音频资源引用
     * @param path - 资源路径或 URL
     * @param bundle - 资源包名（远程资源时忽略）
     */
    release(path: string, bundle?: string): void {
        const { key, entry } = this.getCacheEntry(path, bundle);
        if (!entry) return;

        // 减少引擎引用计数
        if (entry.isValid) {
            entry.decRef();
        }
    }

    /**
     * 立即释放指定路径的音频资源（不等待延迟）
     * @param path - 资源路径或 URL
     * @param bundle - 资源包名（远程资源时忽略）
     */
    releaseImmediately(path: string, bundle?: string): void {
        const { key, entry } = this.getCacheEntry(path, bundle);
        if (!entry) return;

        this.doRelease(key, entry);
    }

    /**
     * 执行真正的资源释放
     * @param key - 缓存键值
     * @param entry - 缓存条目
     */
    private doRelease(key: string, entry: AudioClip): void {
        if (entry && entry.isValid) {
            entry.decRef();
        }
        this.clipCache.delete(key);
    }

    /** 清空所有缓存 */
    clearCache(): void {
        this.clipCache.forEach((entry, key) => {
            this.doRelease(key, entry);
        });
        this.clipCache.clear();
        this.loadingCache.clear();
    }

    /** 销毁加载器，释放所有资源 */
    destroy(): void {
        this.clearCache();
    }

    /**
     * 获取缓存统计信息
     * @returns 缓存条目数量
     */
    getStats(): { total: number } {
        return { total: this.clipCache.size };
    }

    /**
     * 获取缓存 key
     * @param path - 资源路径
     * @param bundle - 资源包名
     * @returns 缓存键值
     */
    private getCacheKey(path: string, bundle?: string): string {
        if (path.indexOf('http') === 0) {
            return `remote_${path}`;
        }
        return `bundle_${bundle || resLoader.defaultBundleName}_${path}`;
    }

    /**
     * 获取缓存条目
     * @param path - 资源路径
     * @param bundle - 资源包名
     * @returns 缓存键值和条目
     */
    private getCacheEntry(path: string, bundle?: string): { key: string; entry: AudioClip | undefined } {
        const key = this.getCacheKey(path, bundle);
        const entry = this.clipCache.get(key);
        return { key, entry };
    }

    /**
     * 设置缓存并返回加载结果
     * @param clip - 音频资源
     * @param path - 资源路径
     * @param cacheKey - 缓存键值
     * @param bundle - 资源包名
     * @param isRemote - 是否为远程资源
     * @returns 加载结果
     */
    private setCacheAndReturn(
        clip: AudioClip,
        path: string,
        cacheKey: string,
        bundle: string | null,
        isRemote: boolean
    ): ILoadResult {
        clip.addRef();
        this.clipCache.set(cacheKey, clip);
        return { clip, path, bundle, isRemote };
    }

    /**
     * 加载远程资源
     * @param path - 远程 URL
     * @returns 加载结果
     */
    private async loadRemote(
        path: string
    ): Promise<ILoadResult | null> {
        let loadPromise = this.loadingCache.get(path);
        if (!loadPromise) {
            loadPromise = this.doLoadRemotePromise(path);
            this.loadingCache.set(path, loadPromise);
        }

        try {
            const clip = await loadPromise;
            if (!clip || !clip.isValid) {
                console.warn(`远程音频资源加载失败: ${path}`);
                return null;
            }

            return this.setCacheAndReturn(clip, path, `remote_${path}`, null, true);
        }
        catch (e) {
            console.warn(`远程音频资源加载异常: ${path}`, e);
            return null;
        }
        finally {
            this.loadingCache.delete(path);
        }
    }

    /**
     * 执行远程资源加载
     * @param path - 远程 URL
     * @returns AudioClip 加载 Promise
     */
    private async doLoadRemotePromise(path: string): Promise<AudioClip> {
        const extension = path.split('.').pop();
        return resLoader.loadRemote<AudioClip>(path, { ext: `.${extension}` });
    }

    /**
     * 加载 Bundle 内资源
     * @param path - 资源路径
     * @param bundle - 资源包名
     * @returns 加载结果
     */
    private async loadBundle(
        path: string,
        bundle: string
    ): Promise<ILoadResult | null> {
        const cacheKey = `bundle_${bundle}_${path}`;

        let clip = resLoader.get(path, AudioClip, bundle);
        if (clip) {
            if (!clip.isValid) {
                console.warn(`音频资源已失效: ${bundle}/${path}`);
                return null;
            }

            const entry = this.clipCache.get(cacheKey);
            if (entry) {
                clip.addRef();
                return { clip, path, bundle, isRemote: false };
            }
            return this.setCacheAndReturn(clip, path, cacheKey, bundle, false);
        }

        let loadPromise = this.loadingCache.get(cacheKey);
        if (!loadPromise) {
            loadPromise = resLoader.load(bundle, path, AudioClip);
            this.loadingCache.set(cacheKey, loadPromise);
        }

        try {
            clip = await loadPromise;
            if (!clip || !clip.isValid) {
                console.warn(`音频资源加载失败: ${bundle}/${path}`);
                return null;
            }

            return this.setCacheAndReturn(clip, path, cacheKey, bundle, false);
        }
        catch (e) {
            console.warn(`音频资源加载异常: ${bundle}/${path}`, e);
            return null;
        }
        finally {
            this.loadingCache.delete(cacheKey);
        }
    }
}