/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 */
import type { Asset, Sprite, __private } from 'cc';
import { SpriteFrame, assetManager, isValid } from 'cc';
import { oops } from '../../../core/Oops';
import type { AssetType, CompleteCallback, Paths, ProgressCallback } from '../../../core/common/loader/ResLoader';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { resAutoTracker } from '../../../core/common/loader/ResAutoTracker';
import { GameViewModule } from './GameViewModuleBase';

/** 资源加载与引用计数管理 */
export class GameResModule extends GameViewModule {

    /** 获取资源
     * @param path 资源路径
     * @param type 资源类型
     * @param bundleName 资源包名称
     * @returns 资源对象
     */
    getRes<T extends Asset>(path: string, type?: __private.__types_globals__Constructor<T> | null, bundleName?: string): T | null {
        return oops.res.get(path, type, bundleName);
    }

    /** 加载资源
     * @param bundleName 资源包名称
     * @param paths 资源路径
     * @param type 资源类型
     * @returns 资源对象
     */
    async load<T extends Asset>(bundleName: string, paths: Paths | AssetType<T>, type?: AssetType<T>): Promise<T> {
        const result = await oops.res.load(bundleName, paths, type);
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

        oops.res.loadAny(bundleName, paths, onProgress, wrappedComplete);
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

        oops.res.loadDir(bundleName, dir, type, onProgress, wrappedComplete);
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
        if (released > 0) {
            console.log(`[GameComponent] ${this.comp.node?.name} 释放 ${released} 条资源登记`);
        }
    }

    /** 获取资源引用计数
     * @param path 资源路径
     * @param bundleName 资源包名称
     * @returns 引用计数
     */
    getResRefCount(path: string, bundleName: string = resLoader.defaultBundleName): number {
        const bundle = assetManager.getBundle(bundleName);
        const a = bundle?.get(path) as Asset | null;
        return a ? a.refCount : 0;
    }

    /** 获取追踪的资源根节点数量
     * @returns 资源根节点数量
     */
    getTrackedResRootCount(): number {
        return resAutoTracker.getOwnerEntryCount(this.comp);
    }

    /** 打印资源使用情况 */
    printResUsage(): void {
        resAutoTracker.printOwnerStatus(this.comp);
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