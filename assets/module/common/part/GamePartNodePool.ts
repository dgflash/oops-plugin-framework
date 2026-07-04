import type { Node, Vec3 } from 'cc';
import { Animation, ParticleSystem, Prefab, sp } from 'cc';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { gameNodePool } from '../../../core/common/pool/GameNodePool';
import type { GameComponent } from '../GameComponent';
import { GamePartBase } from '../GamePartBase';
import { AnimationEffectAutoRelease } from './animator-effect/AnimationEffectAutoRelease';
import { ParticleEffectAutoRelease } from './animator-effect/ParticleEffectAutoRelease';
import { SpineEffectAutoRelease } from './animator-effect/SpineEffectAutoRelease';

/**
 * 自动释放接口
 * 实现此接口的组件可以自动播放并在播放完成后自动回收到对象池
 */
export interface IAutoRelease {
    /** 设置自动释放回调 */
    onPlayComplete(callback: () => void): void;
    /** 播放动画 */
    play(): void;
    /** 设置动画播放速度 */
    setSpeed(speed: number): void;
}

/** 特效参数 */
export interface IEffectParams {
    /** 初始空间坐标 */
    pos?: Vec3,
    /** 初始世界坐标 */
    worldPos?: Vec3,
    /** 是否播放完成后删除 */
    isPlayFinishedRelease?: boolean,
    /** 资源包名 */
    bundle?: string,
}

/**
 * 游戏节点池模块
 * 基于 GameNodePool 统一管理对象池，本模块负责资源加载与自动释放
 * 1、支持Spine动画
 * 2、支持Cocos Animation动画
 * 3、支持Cocos ParticleSystem粒子动画
 * 4、资源由 GameResModule 管理，自动释放
 */
export class GamePartNodePool extends GamePartBase {
    /** 宿主组件 */
    protected declare comp: GameComponent;

    /** 本模块加载的 Prefab 资源记录，用于自动释放 */
    private _loadedPrefabs: Set<Prefab> = new Set();
    /** 全局动画播放速度 */
    private _speed = 1;

    /** 获取全局动画播放速度 */
    get speed(): number {
        return this._speed;
    }
    /** 设置全局动画播放速度 */
    set speed(value: number) {
        this._speed = value;
    }

    /**
     * 获取指定资源池中对象数量
     * @param path 预制体资源路径
     * @param bundle 资源包名，默认为 resources
     */
    getCount(path: string, bundle?: string): number {
        const bundleName = bundle ?? resLoader.defaultBundleName;
        const prefab = this.comp.res.get(path, Prefab, bundleName);
        return prefab ? gameNodePool.getCount(prefab) : 0;
    }

    /**
     * 池中预加载显示对象
     * @param count 预加载数量
     * @param path 预制资源路径
     * @param params 特效参数（包含 bundleName 等）
     */
    async preload(count: number, path: string, params?: IEffectParams): Promise<void> {
        const bundleName = params?.bundle ?? resLoader.defaultBundleName;
        const prefab = await this.comp.res.load(bundleName, path, Prefab);
        this._loadedPrefabs.add(prefab);
        gameNodePool.preload(count, prefab);
    }

    /**
     * 显示预制对象（需确保资源已加载）
     * @param path 预制体资源路径
     * @param parent 父节点
     * @param params 特效参数（包含 pos、worldPos、isPlayFinishedRelease、bundle 等）
     */
    show(path: string, parent?: Node, params?: IEffectParams): Node {
        const bundleName = params?.bundle ?? resLoader.defaultBundleName;
        const prefab = this.comp.res.get(path, Prefab, bundleName);
        if (!prefab) {
            console.warn(`[GamePartNodePool] 预制资源未加载: ${bundleName}/${path}`);
            return null!;
        }
        const node = gameNodePool.get(prefab, parent);
        this._applyEffectParams(node, params);
        return node;
    }

    /** 回收对象 */
    put(node: Node) {
        gameNodePool.put(node);
    }

    /**
     * 清除对象池数据（只清除本模块管理的）
     * @param path 预制体资源路径，为空时清除本模块管理的所有对象池数据
     * @param bundle 资源包名，默认为 resources
     */
    clear(path?: string, bundle?: string) {
        if (path) {
            const bundleName = bundle ?? resLoader.defaultBundleName;
            const prefab = this.comp.res.get(path, Prefab, bundleName);
            if (prefab && this._loadedPrefabs.has(prefab)) {
                gameNodePool.clear(prefab);
            }
        }
        else {
            this._loadedPrefabs.forEach((p) => gameNodePool.clear(p));
        }
    }

    /**
     * 释放对象池中显示对象的资源内存（只释放本模块管理的）
     * @param path 预制体资源路径，为空时释放所有本模块管理的资源
     * @param bundle 资源包名，默认为 resources
     */
    release(path?: string, bundle?: string) {
        if (path) {
            const bundleName = bundle ?? resLoader.defaultBundleName;
            const prefab = this.comp.res.get(path, Prefab, bundleName);
            if (prefab && this._loadedPrefabs.has(prefab)) {
                gameNodePool.clear(prefab);
                this.comp.res.releaseRes(prefab.uuid);
                this._loadedPrefabs.delete(prefab);
            }
        }
        else {
            this._loadedPrefabs.forEach((p) => {
                gameNodePool.clear(p);
                this.comp.res.releaseRes(p.uuid);
            });
            this._loadedPrefabs.clear();
        }
    }

    /**
     * 应用特效参数
     * @param node 节点
     * @param params 特效参数
     */
    private _applyEffectParams(node: Node, params?: IEffectParams) {
        if (!params) return;
        if (params.pos) node.position = params.pos;
        if (params.worldPos) node.worldPosition = params.worldPos;

        const comp = this._getAutoRelease(node);
        if (comp) {
            // 设置自动回收
            if (params.isPlayFinishedRelease) {
                comp.onPlayComplete(() => this.put(node));
            }
            comp.setSpeed(this._speed);
            comp.play();
        }
    }

    /** 获取 IAutoRelease 组件（查找或自动添加） */
    private _getAutoRelease(node: Node): IAutoRelease | null {
        const spine = sp && node.getComponent(sp.Skeleton);
        if (spine) return node.addComponent(SpineEffectAutoRelease);
        const anim = node.getComponent(Animation);
        if (anim) return node.addComponent(AnimationEffectAutoRelease);
        const particle = node.getComponent(ParticleSystem);
        if (particle) return node.addComponent(ParticleEffectAutoRelease);
        return null;
    }

    /** 销毁特效模块 */
    override destroy(): void {
        this.release();
    }
}
