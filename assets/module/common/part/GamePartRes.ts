import type { Asset, Sprite, __private } from 'cc';
import { SpriteFrame, isValid } from 'cc';
import type { GameComponent } from '../GameComponent';
import type { AssetType, CompleteCallback, IRemoteOptions, Paths, ProgressCallback } from '../../../core/common/loader/ResLoader';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { resAutoTracker } from '../../../core/common/loader/ResAutoTracker';
import { GamePartBase } from '../GamePartBase';
import { DEBUG } from 'cc/env';

/** 资源加载与引用计数管理 */
export class GamePartRes extends GamePartBase {
    /** 宿主组件 */
    protected declare comp: GameComponent;

    /** 获取资源
     * @param path 资源路径
     * @param type 资源类型
     * @param bundleName 资源包名称
     * @returns 资源对象
     */
    get<T extends Asset>(path: string, type?: __private.__types_globals__Constructor<T> | null, bundleName?: string): T | null {
        return resLoader.get(path, type, bundleName);
    }

    /** 加载资源
     * @param bundleName 资源包名称
     * @param paths 资源路径
     * @param type 资源类型
     * @returns 资源对象
     */
    async load<T extends Asset>(bundleName: string, paths: Paths | AssetType<T>, type?: AssetType<T>): Promise<T> {
        const result = await resLoader.load(bundleName, paths, type);
        if (result) {
            resAutoTracker.acquire(this.comp, result);
        }
        return result;
    }

    /** 加载任意资源
     * @param bundleName 资源包名称
     * @param paths 资源路径数组
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    loadAny(
        bundleName: string | string[],
        paths: string[] | ProgressCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ): void {
        const originalComplete = onComplete as ((err: Error | null, data: Asset[]) => void) | undefined;

        const wrappedComplete = (err: Error | null, data: Asset[]) => {
            if (!err && data?.length) {
                resAutoTracker.acquireMany(this.comp, data);
            }
            originalComplete?.(err, data);
        };

        resLoader.loadAny(bundleName, paths, onProgress, wrappedComplete);
    }

    /** 加载目录资源
     * @param bundleName 资源包名称
     * @param dir 目录路径
     * @param type 资源类型
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    loadDir<T extends Asset>(
        bundleName: string,
        dir?: string | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ): void {
        const originalComplete = onComplete as ((err: Error | null, data: T[]) => void) | undefined;
        const wrappedComplete = (err: Error | null, data: T[]) => {
            if (!err && data?.length) {
                resAutoTracker.acquireMany(this.comp, data);
            }
            originalComplete?.(err, data);
        };

        resLoader.loadDir(bundleName, dir, type, onProgress, wrappedComplete);
    }

    /** 释放资源
     * @param path 资源路径
     * @param bundleName 资源包名称
     */
    releaseRes(path: string, bundleName: string = resLoader.defaultBundleName): void {
        resAutoTracker.releaseByPath(this.comp, path, bundleName);
    }

    /** 销毁资源模块 */
    override destroy(): void {
        const released = resAutoTracker.releaseAll(this.comp);
        if (DEBUG && released > 0) {
            console.log(`[GameComponent] ${this.comp.node?.name} 释放 ${released} 条资源登记`);
        }
    }

    /** 加载远程资源
     * @param url 资源URL
     * @param options 加载选项
     * @returns 资源对象
     */
    async loadRemote<T extends Asset>(url: string, options?: IRemoteOptions): Promise<T> {
        const result = await resLoader.loadRemote<T>(url, options);
        if (result) {
            resAutoTracker.acquire(this.comp, result);
        }
        return result;
    }

    /** 释放远程资源
     * @param url 资源URL
     */
    releaseRemote(url: string): void {
        resLoader.releaseRemote(url);
    }

    /** 设置精灵图片
     * @param target 精灵组件
     * @param path 图片路径
     * @param bundle 资源包名称
     * @returns 是否设置成功
     */
    async setSprite(target: Sprite, path: string, bundle: string = resLoader.defaultBundleName): Promise<boolean> {
        const spriteFrame = await this.load(bundle, path, SpriteFrame);
        if (!spriteFrame) {
            return false;
        }
        if (!isValid(target)) {
            this.releaseRes(path, bundle);
            return false;
        }
        target.spriteFrame = spriteFrame;
        return true;
    }
}
