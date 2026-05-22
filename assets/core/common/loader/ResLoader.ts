import { Asset, assetManager, resources } from 'cc';
import { AssetType, ILoadResArgs, IRemoteOptions, Paths, ProgressCallback, CompleteCallback } from './ResTypes';
import { ResourceError } from './ResErrors';
import { isValidString, warn, error, createError, releasePrefabDepsRecursively } from './ResUtils';

// 类型导出
export type { AssetType, Paths, ProgressCallback, CompleteCallback, IRemoteOptions, ILoadResArgs } from './ResTypes';

// 错误类导出
export { ResourceError } from './ResErrors';

// 工具方法导出
export { isValidString, warn, error, createError, releasePrefabDepsRecursively } from './ResUtils';

// 调试工具导出
export { ResDebug } from './ResDebug';

/**
 * 资源加载器核心类
 * 负责底层资源加载、释放、缓存管理
 */
export class ResLoader {
    /** 全局默认加载的资源包名 */
    defaultBundleName = 'resources';

    /** 正在加载的 Bundle Promise 缓存，防止并发重复加载 */
    private _loadingBundles: Map<string, Promise<any>> = new Map();

    /** 正在加载的资源 Promise 缓存，防止并发重复加载 */
    private _loadingAssets: Map<string, Promise<any>> = new Map();

    /** 已加载的远程资源缓存，用于统一管理释放 */
    private _remoteAssets: Map<string, Asset> = new Map();

    //#region 下载配置
    /** 获取最大并发下载数 */
    get maxConcurrency(): number {
        return assetManager.downloader.maxConcurrency;
    }

    /** 设置最大并发下载数 */
    set maxConcurrency(value: number) {
        assetManager.downloader.maxConcurrency = value;
    }

    /** 获取每帧最大请求数 */
    get maxRequestsPerFrame(): number {
        return assetManager.downloader.maxRequestsPerFrame;
    }

    /** 设置每帧最大请求数 */
    set maxRequestsPerFrame(value: number) {
        assetManager.downloader.maxRequestsPerFrame = value;
    }

    /** 获取最大重试次数 */
    get maxRetryCount(): number {
        return assetManager.downloader.maxRetryCount;
    }

    /** 设置最大重试次数 */
    set maxRetryCount(value: number) {
        assetManager.downloader.maxRetryCount = value;
    }

    /** 获取重试间隔（毫秒） */
    get retryInterval(): number {
        return assetManager.downloader.retryInterval;
    }

    /** 设置重试间隔（毫秒） */
    set retryInterval(value: number) {
        assetManager.downloader.retryInterval = value;
    }
    //#endregion

    //#region 远程资源加载
    /**
     * 加载远程资源
     * @param url 资源URL
     * @param options 加载选项
     * @returns 资源Promise
     */
    loadRemote<T extends Asset>(url: string, options: IRemoteOptions | null = null): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (!isValidString(url)) {
                reject(createError('loadRemote', 'url 不能为空'));
                return;
            }

            const cachedAsset = this._remoteAssets.get(url);
            if (cachedAsset) {
                resolve(cachedAsset as T);
                return;
            }

            assetManager.loadRemote<T>(url, options, (err, data: T) => {
                if (err) {
                    reject(createError('loadRemote', `加载远程资源失败: ${url}`, err));
                    return;
                }
                this._remoteAssets.set(url, data);
                resolve(data);
            });
        });
    }

    /**
     * 释放指定远程资源
     * @param url 资源URL
     */
    releaseRemote(url: string) {
        if (!isValidString(url)) {
            warn('releaseRemote', 'url 不能为空');
            return;
        }

        const asset = this._remoteAssets.get(url);
        if (!asset) {
            warn('releaseRemote', `远程资源 "${url}" 不存在`);
            return;
        }

        asset.decRef();
        this._remoteAssets.delete(url);
    }

    /** 释放所有远程资源 */
    releaseRemoteAll() {
        this._remoteAssets.forEach((asset) => asset.decRef());
        this._remoteAssets.clear();
    }

    /**
     * 获取远程资源数量
     * @returns 资源数量
     */
    getRemoteAssetCount(): number {
        return this._remoteAssets.size;
    }
    //#endregion

    //#region Bundle 管理
    /**
     * 获取已加载的Bundle
     * @param name Bundle名称
     * @returns Bundle对象或null
     */
    getBundle(name: string) {
        return assetManager.bundles.get(name);
    }

    /**
     * 加载Bundle
     * @param name Bundle名称
     * @param options 加载选项
     * @returns Bundle Promise
     */
    loadBundle(name: string, options: { [k: string]: any; version?: string; } | null = null): Promise<any> {
        if (!isValidString(name)) {
            return Promise.reject(createError('loadBundle', 'name 不能为空'));
        }

        const existingBundle = assetManager.bundles.get(name);
        if (existingBundle) return Promise.resolve(existingBundle);

        const loadingPromise = this._loadingBundles.get(name);
        if (loadingPromise) return loadingPromise;

        const promise = new Promise((resolve, reject) => {
            assetManager.loadBundle(name, options, (err, bundle) => {
                this._loadingBundles.delete(name);
                if (err) {
                    reject(createError('loadBundle', `加载资源包失败: ${name}`, err));
                    return;
                }
                resolve(bundle);
            });
        });

        this._loadingBundles.set(name, promise);
        return promise;
    }

    /**
     * 移除并释放Bundle
     * @param bundleName Bundle名称
     */
    removeBundle(bundleName: string) {
        const bundle = assetManager.bundles.get(bundleName);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
        }
    }
    //#endregion

    //#region 资源加载
    /**
     * 加载资源
     * @param bundleName Bundle名称
     * @param paths 资源路径或类型
     * @param type 资源类型
     * @returns 资源Promise
     */
    load<T extends Asset>(bundleName: string, paths: Paths | AssetType<T>, type?: AssetType<T>): Promise<T> {
        let args: ILoadResArgs<T> | null = null;
        if (typeof paths === 'string' || paths instanceof Array) {
            args = this.parseLoadResArgs(paths, type, null);
            args.bundle = bundleName;
        }
        else {
            args = this.parseLoadResArgs(bundleName, paths, null);
            args.bundle = this.defaultBundleName;
        }

        const pathsKey = Array.isArray(args.paths) ? args.paths.join(',') : args.paths;
        const typeKey = args.type ? (args.type as any).name || 'Asset' : 'Asset';
        const cacheKey = `${args.bundle}:${pathsKey}:${typeKey}`;

        const loadingPromise = this._loadingAssets.get(cacheKey);
        if (loadingPromise) return loadingPromise as Promise<T>;

        const promise = new Promise<T>((resolve, reject) => {
            const onComplete = (err: Error | null, data: T) => {
                this._loadingAssets.delete(cacheKey);
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            };

            args!.onComplete = onComplete;
            this.loadByArgs(args!);
        });

        this._loadingAssets.set(cacheKey, promise);
        return promise;
    }

    /**
     * 加载任意资源（支持多种参数组合）
     * @param bundleName Bundle名称或路径数组
     * @param paths 路径数组或进度回调
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    loadAny<T extends Asset>(bundleName: string | string[], paths: string[] | ProgressCallback, onProgress?: ProgressCallback | CompleteCallback, onComplete?: CompleteCallback): void {
        let args: ILoadResArgs<T> | null = null;
        if (typeof bundleName === 'string' && paths instanceof Array) {
            args = this.parseLoadResArgs(paths, onProgress, onComplete);
            args.bundle = bundleName;
        }
        else {
            args = this.parseLoadResArgs(bundleName, paths, onProgress);
            args.bundle = this.defaultBundleName;
        }
        this.loadByArgs(args);
    }

    /**
     * 加载目录资源
     * @param bundleName Bundle名称
     * @param dir 目录路径或类型或回调
     * @param type 资源类型或回调
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    loadDir<T extends Asset>(bundleName: string, dir?: string | AssetType<T> | ProgressCallback | CompleteCallback, type?: AssetType<T> | ProgressCallback | CompleteCallback, onProgress?: ProgressCallback | CompleteCallback, onComplete?: CompleteCallback): void {
        let args: ILoadResArgs<T> | null = null;
        if (typeof dir === 'string') {
            args = this.parseLoadResArgs(dir, type, onProgress, onComplete);
            args.bundle = bundleName;
        }
        else {
            args = this.parseLoadResArgs(bundleName, dir, type, onProgress);
            args.bundle = this.defaultBundleName;
        }
        args.dir = args.paths as string;
        this.loadByArgs(args);
    }

    /**
     * 预加载资源
     * @param bundleName Bundle名称
     * @param paths 资源路径或类型或回调
     * @param type 资源类型或回调
     * @param onProgress 进度回调
     * @returns Promise
     */
    preload<T extends Asset>(bundleName: string, paths?: Paths | AssetType<T> | ProgressCallback, type?: AssetType<T> | ProgressCallback, onProgress?: ProgressCallback): Promise<any> {
        return new Promise((resolve, reject) => {
            const onComplete = (err: Error | null, data: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            };

            let args: ILoadResArgs<Asset> | null = null;
            if (typeof paths === 'string' || paths instanceof Array) {
                args = this.parseLoadResArgs(paths, type, onProgress, onComplete);
                args.bundle = bundleName;
            }
            else {
                args = this.parseLoadResArgs(bundleName, paths, type, onComplete);
                args.bundle = this.defaultBundleName;
            }
            args.preload = true;
            this.loadByArgs(args);
        });
    }

    /**
     * 预加载目录资源
     * @param bundleName Bundle名称
     * @param dir 目录路径或类型或回调
     * @param type 资源类型或回调
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    preloadDir<T extends Asset>(bundleName: string, dir?: string | AssetType<T> | ProgressCallback | CompleteCallback, type?: AssetType<T> | ProgressCallback | CompleteCallback, onProgress?: ProgressCallback | CompleteCallback, onComplete?: CompleteCallback): void {
        let args: ILoadResArgs<T> | null = null;
        if (typeof dir === 'string') {
            args = this.parseLoadResArgs(dir, type, onProgress, onComplete);
            args.bundle = bundleName;
        }
        else {
            args = this.parseLoadResArgs(bundleName, dir, type, onProgress);
            args.bundle = this.defaultBundleName;
        }
        args.dir = args.paths as string;
        args.preload = true;
        this.loadByArgs(args);
    }
    //#endregion

    //#region 资源释放
    /**
     * 释放指定资源
     * @param path 资源路径
     * @param bundleName Bundle名称
     */
    release(path: string, bundleName?: string) {
        if (!isValidString(path)) {
            warn('release', 'path 不能为空');
            return;
        }

        if (bundleName == undefined) bundleName = this.defaultBundleName;

        const bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            warn('release', `资源包 "${bundleName}" 不存在`);
            return;
        }

        const asset = bundle.get(path);
        if (!asset) {
            warn('release', `资源 "${path}" 在资源包 "${bundleName}" 中不存在`);
            return;
        }

        releasePrefabDepsRecursively(asset);
    }

    /**
     * 释放目录资源
     * @param path 目录路径
     * @param bundleName Bundle名称
     */
    releaseDir(path: string, bundleName?: string) {
        if (bundleName == undefined) bundleName = this.defaultBundleName;

        const bundle = assetManager.getBundle(bundleName);
        if (bundle) {
            const infos = bundle.getDirWithPath(path);
            if (infos) {
                infos.forEach((info: any) => releasePrefabDepsRecursively(info.uuid));
            }

            if (path == '' && bundleName != 'resources') {
                assetManager.removeBundle(bundle);
            }
        }
    }
    //#endregion

    //#region 资源获取
    /**
     * 获取已加载的资源
     * @param path 资源路径
     * @param type 资源类型
     * @param bundleName Bundle名称
     * @returns 资源对象或null
     */
    get<T extends Asset>(path: string, type?: AssetType<T>, bundleName: string = this.defaultBundleName): T | null {
        if (!isValidString(path)) {
            warn('get', 'path 不能为空');
            return null;
        }

        const bundle = assetManager.getBundle(bundleName);
        if (!bundle) {
            warn('get', `资源包 "${bundleName}" 不存在`);
            return null;
        }

        return bundle.get(path, type);
    }

    /**
     * 获取资源路径
     * @param bundleName Bundle名称
     * @param uuid 资源UUID
     * @returns 资源路径
     */
    getAssetPath(bundleName: string, uuid: string): string {
        const b = this.getBundle(bundleName);
        if (!b) return '';
        const info = b.getAssetInfo(uuid);
        if (!info) return '';
        return (info as any).path || '';
    }
    //#endregion

    //#region 私有方法
    /**
     * 解析加载资源参数
     * @param paths 资源路径
     * @param type 资源类型或回调
     * @param onProgress 进度回调或类型
     * @param onComplete 完成回调
     * @returns 解析后的参数对象
     */
    private parseLoadResArgs<T extends Asset>(paths: Paths, type?: AssetType<T> | ProgressCallback | CompleteCallback, onProgress?: AssetType<T> | ProgressCallback | CompleteCallback, onComplete?: ProgressCallback | CompleteCallback): ILoadResArgs<T> {
        const pathsOut: any = paths;
        let typeOut: any = type;
        let onProgressOut: any = onProgress;
        let onCompleteOut: any = onComplete;
        if (onComplete === undefined) {
            const isValidType = (t: any) => t && typeof t === 'function' && t.prototype instanceof Asset;
            if (onProgress) {
                onCompleteOut = onProgress as CompleteCallback;
                if (isValidType(type)) {
                    onProgressOut = null;
                }
            }
            else if (onProgress === undefined && !isValidType(type)) {
                onCompleteOut = type as CompleteCallback;
                onProgressOut = null;
                typeOut = null;
            }
            if (onProgress !== undefined && !isValidType(type)) {
                onProgressOut = type as ProgressCallback;
                typeOut = null;
            }
        }
        return { paths: pathsOut, type: typeOut, onProgress: onProgressOut, onComplete: onCompleteOut };
    }

    /**
     * 根据Bundle和参数加载资源
     * @param Bundle Bundle对象
     * @param args 加载参数
     */
    private loadByBundleAndArgs<T extends Asset>(bundle: any, args: ILoadResArgs<T>): void {
        if (args.dir) {
            if (args.preload) {
                bundle.preloadDir(args.paths as string, args.type, args.onProgress, args.onComplete);
            }
            else {
                bundle.loadDir(args.paths as string, args.type, args.onProgress, args.onComplete);
            }
        }
        else {
            if (args.preload) {
                bundle.preload(args.paths as any, args.type, args.onProgress, args.onComplete);
            }
            else {
                bundle.load(args.paths as any, args.type, args.onProgress, args.onComplete);
            }
        }
    }

    /**
     * 根据参数加载资源
     * @param args 加载参数
     */
    private async loadByArgs<T extends Asset>(args: ILoadResArgs<T>) {
        try {
            if (args.bundle) {
                let bundle = assetManager.bundles.get(args.bundle);

                if (bundle == null) {
                    bundle = await this.loadBundle(args.bundle);
                    if (!bundle) {
                        const resError = new ResourceError(`加载资源包失败`, { bundle: args.bundle });
                        error('loadByArgs', `加载资源包失败: ${args.bundle}`);
                        if (args.onComplete) args.onComplete(resError, null);
                        return;
                    }
                }

                this.loadByBundleAndArgs(bundle, args);
            }
            else {
                this.loadByBundleAndArgs(resources, args);
            }
        }
        catch (err) {
            const pathsStr = Array.isArray(args.paths) ? args.paths.join(',') : args.paths;
            const resError = err instanceof ResourceError
                ? err
                : new ResourceError(`资源加载失败`, {
                    path: pathsStr,
                    bundle: args.bundle,
                    cause: err instanceof Error ? err : String(err)
                });
            error('loadByArgs', `资源加载失败: ${pathsStr}`, resError);
            if (args.onComplete) args.onComplete(resError, null);
        }
    }
    //#endregion
}

/** 资源加载器单例实例 */
export const resLoader = new ResLoader();