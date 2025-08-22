import { __private, AnimationClip, Asset, AssetManager, assetManager, AudioClip, Font, ImageAsset, js, JsonAsset, Material, Mesh, Prefab, resources, sp, SpriteFrame, Texture2D, warn } from "cc";

export type AssetType<T = Asset> = __private.__types_globals__Constructor<T> | null;
export type Paths = string | string[];
export type ProgressCallback = ((finished: number, total: number, item: AssetManager.RequestItem) => void) | null;
export type CompleteCallback = any;
export type IRemoteOptions = { [k: string]: any; ext?: string; } | null;

interface ILoadResArgs<T extends Asset> {
    /** 资源包名 */
    bundle?: string;
    /** 资源文件夹名 */
    dir?: string;
    /** 资源路径 */
    paths: Paths;
    /** 资源类型 */
    type: AssetType<T>;
    /** 资源加载进度 */
    onProgress: ProgressCallback;
    /** 资源加载完成 */
    onComplete: CompleteCallback;
    /** 是否为预加载 */
    preload?: boolean;
}

/** 
 * 游戏资源管理
 * 1、加载默认resources文件夹中资源
 * 2、加载默认bundle远程资源
 * 3、主动传递bundle名时，优先加载传递bundle名资源包中的资源
 * 
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037901&doc_id=2873565
 */
export class ResLoader {
    //#region 资源配置数据
    /** 全局默认加载的资源包名 */
    defaultBundleName: string = "resources";

    /** 下载时的最大并发数 - 项目设置 -> 项目数据 -> 资源下载并发数，设置默认值；初始值为15 */
    get maxConcurrency() {
        return assetManager.downloader.maxConcurrency;
    }
    set maxConcurrency(value) {
        assetManager.downloader.maxConcurrency = value;
    }

    /** 下载时每帧可以启动的最大请求数 - 默认值为15 */
    get maxRequestsPerFrame() {
        return assetManager.downloader.maxRequestsPerFrame;
    }
    set maxRequestsPerFrame(value) {
        assetManager.downloader.maxRequestsPerFrame = value;
    }

    /** 失败重试次数 - 默认值为0 */
    get maxRetryCount() {
        return assetManager.downloader.maxRetryCount;
    }
    set maxRetryCount(value) {
        assetManager.downloader.maxRetryCount = value;
    }

    /** 重试的间隔时间，单位为毫秒 - 默认值为2000毫秒 */
    get retryInterval() {
        return assetManager.downloader.retryInterval;
    }
    set retryInterval(value) {
        assetManager.downloader.retryInterval = value;
    }

    //#region 加载远程资源
    /**
     * 加载远程资源
     * @param url           资源地址
     * @param options       资源参数，例：{ ext: ".png" }
     * @example
        var opt: IRemoteOptions = { ext: ".png" };
        var data = await oops.res.loadRemote<ImageAsset>(this.url, opt);
        const texture = new Texture2D();
        texture.image = data;

        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;

        var sprite = this.sprite.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
     */
    loadRemote<T extends Asset>(url: string, options: IRemoteOptions | null = null): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            assetManager.loadRemote<T>(url, options, (err, data: T) => {
                if (err) {
                    reject(null);
                    return;
                }
                resolve(data);
            });
        });
    }
    //#endregion

    //#region 资源包管理

    /**
     * 获取资源包
     * @param name 资源包名
     */
    getBundle(name: string) {
        return assetManager.bundles.get(name);
    }

    /**
     * 加载资源包
     * @param name       资源地址
     * @param options    资源参数，例：{ version: "74fbe" }
     * @example
        await oops.res.loadBundle(name, options);
     */
    loadBundle(name: string, options: { [k: string]: any; version?: string; } | null = null): Promise<AssetManager.Bundle> {
        return new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(name, options, (err, bundle: AssetManager.Bundle) => {
                if (err) {
                    resolve(null!);
                    return;
                }
                resolve(bundle);
            });
        });
    }

    /**
     * 释放资源包与包中所有资源
     * @param bundleName 资源地址
     */
    removeBundle(bundleName: string) {
        let bundle = assetManager.bundles.get(bundleName);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
        }
    }
    //#endregion

    //#region 预加载资源
    /**
     * 加载一个资源
     * @param bundleName    远程包名
     * @param paths         资源路径
     * @param type          资源类型
     * @param onProgress    加载进度回调
     * @param onComplete    加载完成回调
     */
    preload<T extends Asset>(bundleName: string, paths: Paths, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preload<T extends Asset>(bundleName: string, paths: Paths, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preload<T extends Asset>(bundleName: string, paths: Paths, onComplete?: CompleteCallback): void;
    preload<T extends Asset>(bundleName: string, paths: Paths, type: AssetType<T>, onComplete?: CompleteCallback): void;
    preload<T extends Asset>(paths: Paths, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preload<T extends Asset>(paths: Paths, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preload<T extends Asset>(paths: Paths, onComplete?: CompleteCallback): void;
    preload<T extends Asset>(paths: Paths, type: AssetType<T>, onComplete?: CompleteCallback): void;
    preload<T extends Asset>(
        bundleName: string,
        paths?: Paths | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ) {
        let args: ILoadResArgs<Asset> | null = null;
        if (typeof paths === "string" || paths instanceof Array) {
            args = this.parseLoadResArgs(paths, type, onProgress, onComplete);
            args.bundle = bundleName;
        }
        else {
            args = this.parseLoadResArgs(bundleName, paths, type, onProgress);
            args.bundle = this.defaultBundleName;
        }
        args.preload = true;
        this.loadByArgs(args);
    }

    /**
     * 异步加载一个资源
     * @param bundleName    远程包名
     * @param paths         资源路径
     * @param type          资源类型
     */
    preloadAsync<T extends Asset>(bundleName: string, paths: Paths, type: AssetType<T>): Promise<AssetManager.RequestItem>;
    preloadAsync<T extends Asset>(bundleName: string, paths: Paths): Promise<AssetManager.RequestItem>;
    preloadAsync<T extends Asset>(paths: Paths, type: AssetType<T>): Promise<AssetManager.RequestItem>;
    preloadAsync<T extends Asset>(paths: Paths): Promise<AssetManager.RequestItem>;
    preloadAsync<T extends Asset>(bundleName: string,
        paths?: Paths | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback): Promise<AssetManager.RequestItem> {
        return new Promise((resolve, reject) => {
            this.preload(bundleName, paths, type, (err: Error | null, data: AssetManager.RequestItem) => {
                if (err) {
                    warn(err.message);
                }
                resolve(data);
            });
        });
    }

    /**
     * 预加载文件夹中的资源
     * @param bundleName    远程包名
     * @param dir           文件夹名
     * @param type          资源类型
     * @param onProgress    加载进度回调
     * @param onComplete    加载完成回调
     */
    preloadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preloadDir<T extends Asset>(bundleName: string, dir: string, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preloadDir<T extends Asset>(bundleName: string, dir: string, onComplete?: CompleteCallback): void;
    preloadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T>, onComplete?: CompleteCallback): void;
    preloadDir<T extends Asset>(dir: string, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preloadDir<T extends Asset>(dir: string, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    preloadDir<T extends Asset>(dir: string, onComplete?: CompleteCallback): void;
    preloadDir<T extends Asset>(dir: string, type: AssetType<T>, onComplete?: CompleteCallback): void;
    preloadDir<T extends Asset>(
        bundleName: string,
        dir?: string | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ) {
        let args: ILoadResArgs<T> | null = null;
        if (typeof dir === "string") {
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

    //#region 资源加载、获取、释放
    /**
     * 加载一个资源
     * @param bundleName    远程包名
     * @param paths         资源路径
     * @param type          资源类型
     * @param onProgress    加载进度回调
     * @param onComplete    加载完成回调
     * @example
oops.res.load("spine_path", sp.SkeletonData, (err: Error | null, sd: sp.SkeletonData) => {

});
     */
    load<T extends Asset>(bundleName: string, paths: Paths, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    load<T extends Asset>(bundleName: string, paths: Paths, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    load<T extends Asset>(bundleName: string, paths: Paths, onComplete?: CompleteCallback): void;
    load<T extends Asset>(bundleName: string, paths: Paths, type: AssetType<T>, onComplete?: CompleteCallback): void;
    load<T extends Asset>(paths: Paths, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    load<T extends Asset>(paths: Paths, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    load<T extends Asset>(paths: Paths, onComplete?: CompleteCallback): void;
    load<T extends Asset>(paths: Paths, type: AssetType<T>, onComplete?: CompleteCallback): void;
    load<T extends Asset>(
        bundleName: string,
        paths?: Paths | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ) {
        let args: ILoadResArgs<T> | null = null;
        if (typeof paths === "string" || paths instanceof Array) {
            args = this.parseLoadResArgs(paths, type, onProgress, onComplete);
            args.bundle = bundleName;
        }
        else {
            args = this.parseLoadResArgs(bundleName, paths, type, onProgress);
            args.bundle = this.defaultBundleName;
        }
        this.loadByArgs(args);
    }

    /**
     * 异步加载一个资源
     * @param bundleName    远程包名
     * @param paths         资源路径
     * @param type          资源类型
     */
    loadAsync<T extends Asset>(bundleName: string, paths: Paths, type: AssetType<T>): Promise<T>;
    loadAsync<T extends Asset>(bundleName: string, paths: Paths): Promise<T>;
    loadAsync<T extends Asset>(paths: Paths, type: AssetType<T>): Promise<T>;
    loadAsync<T extends Asset>(paths: Paths): Promise<T>;
    loadAsync<T extends Asset>(bundleName: string,
        paths?: Paths | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback): Promise<T> {
        return new Promise((resolve, reject) => {
            this.load(bundleName, paths, type, (err: Error | null, asset: T) => {
                if (err) {
                    warn(err.message);
                }
                resolve(asset);
            });
        });
    }

    /**
     * 加载文件夹中的资源
     * @param bundleName    远程包名
     * @param dir           文件夹名
     * @param type          资源类型
     * @param onProgress    加载进度回调
     * @param onComplete    加载完成回调
     * @example
// 加载进度事件
var onProgressCallback = (finished: number, total: number, item: any) => {
    console.log("资源加载进度", finished, total);
}

// 加载完成事件
var onCompleteCallback = () => {
    console.log("资源加载完成");
}
oops.res.loadDir("game", onProgressCallback, onCompleteCallback);
     */
    loadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(bundleName: string, dir: string, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(bundleName: string, dir: string, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T>, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, type: AssetType<T>, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(
        bundleName: string,
        dir?: string | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ) {
        let args: ILoadResArgs<T> | null = null;
        if (typeof dir === "string") {
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
     * 通过资源相对路径释放资源
     * @param path          资源路径
     * @param bundleName    远程资源包名
     */
    release(path: string, bundleName?: string) {
        if (bundleName == undefined) bundleName = this.defaultBundleName;

        const bundle = assetManager.getBundle(bundleName);
        if (bundle) {
            const asset = bundle.get(path);
            if (asset) {
                this.releasePrefabtDepsRecursively(bundleName, asset);
            }
        }
    }

    /**
     * 通过相对文件夹路径删除所有文件夹中资源
     * @param path          资源文件夹路径
     * @param bundleName    远程资源包名
     */
    releaseDir(path: string, bundleName: string = this.defaultBundleName) {
        const bundle: AssetManager.Bundle | null = assetManager.getBundle(bundleName);
        if (bundle) {
            var infos = bundle.getDirWithPath(path);
            if (infos) {
                infos.map((info) => {
                    this.releasePrefabtDepsRecursively(bundleName, info.uuid);
                });
            }

            if (path == "" && bundleName != "resources") {
                assetManager.removeBundle(bundle);
            }
        }
    }

    /**
     * 获取资源路径
     * @param bundleName 资源包名
     * @param uuid       资源唯一编号
     * @returns 
     */
    getAssetPath(bundleName: string, uuid: string): string {
        let b = this.getBundle(bundleName)!;
        let info = b.getAssetInfo(uuid)!;
        //@ts-ignore
        return info.path;
    }

    /** 释放预制依赖资源 */
    private releasePrefabtDepsRecursively(bundleName: string, uuid: string | Asset) {
        if (uuid instanceof Asset) {
            uuid.decRef();
            // assetManager.releaseAsset(uuid);
            // this.debugLogReleasedAsset(bundleName, uuid);
        }
        else {
            const asset = assetManager.assets.get(uuid);
            if (asset) {
                asset.decRef();
                // assetManager.releaseAsset(asset);
                // this.debugLogReleasedAsset(bundleName, asset);
            }
        }
    }

    private debugLogReleasedAsset(bundleName: string, asset: Asset) {
        if (asset.refCount == 0) {
            let path = this.getAssetPath(bundleName, asset.uuid);
            let content: string = "";
            if (asset instanceof JsonAsset) {
                content = "【释放资源】Json【路径】" + path;
            }
            else if (asset instanceof Prefab) {
                content = "【释放资源】Prefab【路径】" + path;
            }
            else if (asset instanceof SpriteFrame) {
                content = "【释放资源】SpriteFrame【路径】" + path;
            }
            else if (asset instanceof Texture2D) {
                content = "【释放资源】Texture2D【路径】" + path;
            }
            else if (asset instanceof ImageAsset) {
                content = "【释放资源】ImageAsset【路径】" + path;
            }
            else if (asset instanceof AudioClip) {
                content = "【释放资源】AudioClip【路径】" + path;
            }
            else if (asset instanceof AnimationClip) {
                content = "【释放资源】AnimationClip【路径】" + path;
            }
            else if (asset instanceof Font) {
                content = "【释放资源】Font【路径】" + path;
            }
            else if (asset instanceof Material) {
                content = "【释放资源】Material【路径】" + path;
            }
            else if (asset instanceof Mesh) {
                content = "【释放资源】Mesh【路径】" + path;
            }
            else if (asset instanceof sp.SkeletonData) {
                content = "【释放资源】Spine【路径】" + path;
            }
            else {
                content = "【释放资源】未知【路径】" + path;
            }
            console.log(content);
        }
    }

    /**
     * 获取资源
     * @param path          资源路径
     * @param type          资源类型
     * @param bundleName    远程资源包名
     */
    get<T extends Asset>(path: string, type?: AssetType<T>, bundleName: string = this.defaultBundleName): T | null {
        var bundle: AssetManager.Bundle = assetManager.getBundle(bundleName)!;
        return bundle.get(path, type);
    }
    //#endregion

    private parseLoadResArgs<T extends Asset>(
        paths: Paths,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: AssetType<T> | ProgressCallback | CompleteCallback,
        onComplete?: ProgressCallback | CompleteCallback
    ) {
        let pathsOut: any = paths;
        let typeOut: any = type;
        let onProgressOut: any = onProgress;
        let onCompleteOut: any = onComplete;
        if (onComplete === undefined) {
            const isValidType = js.isChildClassOf(type as AssetType, Asset);
            if (onProgress) {
                onCompleteOut = onProgress as CompleteCallback;
                if (isValidType) {
                    onProgressOut = null;
                }
            }
            else if (onProgress === undefined && !isValidType) {
                onCompleteOut = type as CompleteCallback;
                onProgressOut = null;
                typeOut = null;
            }
            if (onProgress !== undefined && !isValidType) {
                onProgressOut = type as ProgressCallback;
                typeOut = null;
            }
        }
        return { paths: pathsOut, type: typeOut, onProgress: onProgressOut, onComplete: onCompleteOut };
    }

    private loadByBundleAndArgs<T extends Asset>(bundle: AssetManager.Bundle, args: ILoadResArgs<T>): void {
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

    private async loadByArgs<T extends Asset>(args: ILoadResArgs<T>) {
        if (args.bundle) {
            let bundle = assetManager.bundles.get(args.bundle);
            // 获取缓存中的资源包
            if (bundle) {
                this.loadByBundleAndArgs(bundle, args);
            }
            // 自动加载资源包
            else {
                bundle = await this.loadBundle(args.bundle);
                if (bundle) this.loadByBundleAndArgs(bundle, args);
            }
        }
        // 默认资源包
        else {
            this.loadByBundleAndArgs(resources, args);
        }
    }

    /** 打印缓存中所有资源信息 */
    dump() {
        assetManager.assets.forEach((value: Asset, key: string) => {
            console.log(`引用数量:${value.refCount}`, assetManager.assets.get(key));
        })
        console.log(`当前资源总数:${assetManager.assets.count}`);
    }
}

export const resLoader = new ResLoader();