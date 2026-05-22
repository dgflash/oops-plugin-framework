import type { __private, AssetManager } from 'cc';
import { Asset } from 'cc';

/** 资源类型 */
export type AssetType<T = Asset> = __private.__types_globals__Constructor<T> | null;

/** 资源路径（单路径或多路径） */
export type Paths = string | string[];

/** 加载进度回调 */
export type ProgressCallback = ((finished: number, total: number, item: AssetManager.RequestItem) => void) | null;

/** 加载完成回调 */
export type CompleteCallback = any;

/** 远程资源加载选项 */
export type IRemoteOptions = { [k: string]: any; ext?: string; } | null;

/** 资源加载参数接口 */
export interface ILoadResArgs<T extends Asset> {
    /** 资源包名 */
    bundle?: string;
    /** 资源文件夹名 */
    dir?: string;
    /** 资源路径 */
    paths: Paths;
    /** 资源类型 */
    type: AssetType<T>;
    /** 资源加载进度回调 */
    onProgress: ProgressCallback;
    /** 资源加载完成回调 */
    onComplete: CompleteCallback;
    /** 是否为预加载 */
    preload?: boolean;
}