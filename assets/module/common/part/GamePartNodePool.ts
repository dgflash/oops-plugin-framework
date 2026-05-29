import type { Node, Vec3 } from 'cc';
import { Animation, ParticleSystem, Prefab, sp } from 'cc';
import type { GameComponent } from '../GameComponent';
import { GameNodePool } from '../../../core/common/pool/GameNodePool';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { GamePartBase } from '../GamePartBase';

/**
 * 自动释放接口
 * 实现此接口的组件可以自动播放并在播放完成后自动回收到对象池
 *
 * 使用场景：
 * 1、Spine 动画组件
 * 2、Cocos Animation 动画组件
 * 3、ParticleSystem 粒子组件
 * 4、自定义动画组件
 *
 * 实现示例：
 * ```typescript
 * class MyAnimation extends Component implements IAutoRelease {
 *     onAutoRelease(callback: () => void): void {
 *         // 监听动画完成事件
 *         this.animation.once(Animation.EventType.FINISHED, callback);
 *     }
 *
 *     play(): void {
 *         // 开始播放动画
 *         this.animation.play();
 *     }
 * }
 * ```
 */
export interface IAutoRelease {
    /**
     * 设置自动释放回调
     * 当动画播放完成时调用 callback，对象池会自动回收节点
     * @param callback 释放回调函数
     */
    onAutoRelease(callback: () => void): void;

    /**
     * 播放动画
     * 对象池获取节点后自动调用此方法播放动画
     */
    play(): void;
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

    /**
     * 获取全局动画播放速度
     */
    get speed(): number {
        return this._speed;
    }

    /**
     * 设置全局动画播放速度
     */
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
        if (!prefab) {
            return 0;
        }
        return GameNodePool.instance.getCount(prefab);
    }

    /**
     * 池中预加载显示对象
     * @param count 预加载数量
     * @param path 预制资源路径
     * @param params 特效参数（包含 bundleName 等）
     */
    async preload(count: number, path: string, params?: IEffectParams): Promise<void> {
        const bundleName = params?.bundle ?? resLoader.defaultBundleName;

        // 使用 GameResModule 加载资源，自动管理引用计数
        const prefab = await this.comp.res.load(bundleName, path, Prefab);

        // 记录已加载的资源
        this._loadedPrefabs.add(prefab);

        // 使用 GameNodePool 预加载到对象池
        GameNodePool.instance.preload(count, prefab);
    }

    /**
     * 显示预制对象（需确保资源已加载）
     * @param path 预制体资源路径
     * @param parent 父节点
     * @param params 特效参数（包含 pos、worldPos、isPlayFinishedRelease、bundle 等）
     */
    show(path: string, parent?: Node, params?: IEffectParams): Node {
        const bundleName = params?.bundle ?? resLoader.defaultBundleName;

        // 获取已加载的预制资源
        const prefab = this.comp.res.get(path, Prefab, bundleName);
        if (!prefab) {
            console.warn(`[GamePartNodePool] 预制资源未加载: ${bundleName}/${path}`);
            return null!;
        }

        // 记录已加载的资源
        this._loadedPrefabs.add(prefab);

        // 使用 GameNodePool 获取节点
        const node = GameNodePool.instance.get(prefab, parent);

        // 应用特效参数
        this._applyEffectParams(node, params);

        return node;
    }

    /**
     * 回收对象
     * @param node 节点
     */
    put(node: Node) {
        GameNodePool.instance.put(node);
    }

    /**
     * 清除对象池数据（只清除本模块管理的）
     * @param path 预制体资源路径，为空时清除本模块管理的所有对象池数据
     * @param bundle 资源包名，默认为 resources
     */
    clear(path?: string, bundle?: string) {
        if (path) {
            // 只清除本模块管理的指定对象池
            const bundleName = bundle ?? resLoader.defaultBundleName;
            const prefab = this.comp.res.get(path, Prefab, bundleName);
            if (prefab && this._loadedPrefabs.has(prefab)) {
                GameNodePool.instance.clear(prefab);
            }
        }
        else {
            // 只清除本模块管理的所有对象池
            this._loadedPrefabs.forEach((p) => {
                GameNodePool.instance.clear(p);
            });
        }
    }

    /** 
     * 释放对象池中显示对象的资源内存（只释放本模块管理的）
     * @param path 预制体资源路径，为空时释放所有本模块管理的资源
     * @param bundle 资源包名，默认为 resources
     */
    release(path?: string, bundle?: string) {
        if (path) {
            // 只释放本模块管理的指定资源
            const bundleName = bundle ?? resLoader.defaultBundleName;
            const prefab = this.comp.res.get(path, Prefab, bundleName);
            if (prefab && this._loadedPrefabs.has(prefab)) {
                // 清除对象池
                GameNodePool.instance.clear(prefab);
                // 释放资源
                this.comp.res.releaseRes(prefab.uuid);
                this._loadedPrefabs.delete(prefab);
            }
        }
        else {
            // 释放本模块加载的所有资源
            this._loadedPrefabs.forEach((p) => {
                GameNodePool.instance.clear(p);
                this.comp.res.releaseRes(p.uuid);
            });
            this._loadedPrefabs.clear();
        }
    }

    /** 销毁特效模块 */
    override destroy(): void {
        // 释放本模块管理的所有资源
        this.release();
    }

    /**
     * 应用特效参数
     * @param node 节点
     * @param params 特效参数
     */
    private _applyEffectParams(node: Node, params?: IEffectParams) {
        if (!params) return;

        // 设置位置
        if (params.pos) node.position = params.pos;
        if (params.worldPos) node.worldPosition = params.worldPos;

        // 播放完成后自动回收
        if (params.isPlayFinishedRelease) {
            // 监听动画完成事件，自动回收
            this.setupAutoRelease(node);
        }

        // 设置动画速度并播放
        this._setSpeed(node);
        this._playAnimation(node);
    }

    /**
     * 设置动画速度
     * @param node 节点
     */
    private _setSpeed(node: Node) {
        // Spine动画
        const spine = node.getComponent(sp.Skeleton);
        if (spine) {
            spine.timeScale = this._speed;
            return;
        }

        // Cocos动画
        const anims = node.getComponentsInChildren(Animation);
        if (anims.length > 0) {
            anims.forEach((animator) => {
                const aniName = animator.defaultClip?.name;
                if (aniName) {
                    const aniState = animator.getState(aniName);
                    if (aniState) {
                        aniState.speed = this._speed;
                    }
                }
            });
            return;
        }

        // 粒子动画
        const particles = node.getComponentsInChildren(ParticleSystem);
        particles.forEach((particle) => {
            particle.simulationSpeed = this._speed;
        });
    }

    /**
     * 播放动画
     * @param node 节点
     */
    private _playAnimation(node: Node) {
        // Spine动画
        const spine = node.getComponent(sp.Skeleton);
        if (spine) {
            // @ts-ignore
            const animationName = spine.defaultAnimation ?? spine.animation;
            if (animationName) {
                spine.setAnimation(0, animationName, false);
            }
            return;
        }

        // Cocos Animation动画
        const anim = node.getComponent(Animation);
        if (anim && anim.defaultClip) {
            anim.play();
            return;
        }

        // 粒子动画
        const particles = node.getComponentsInChildren(ParticleSystem);
        if (particles.length > 0) {
            particles.forEach((particle) => {
                particle.play();
            });
        }
    }

    /**
     * 设置自动回收
     * 优先使用 IAutoRelease 接口，其次使用内置动画检测
     * 每个节点只设置一次事件监听，避免重复设置
     * @param node 节点
     */
    private setupAutoRelease(node: Node) {
        // 检查是否已经设置过自动回收
        // @ts-ignore
        if (node._autoRelease) return;
        // @ts-ignore
        node._autoRelease = true;

        // 优先检查是否实现了 IAutoRelease 接口
        const components = node.components;
        for (const comp of components) {
            if (this.isAutoRelease(comp)) {
                comp.onAutoRelease(() => this.put(node));
                comp.play();
                return;
            }
        }

        // 内置动画类型检测
        this.setupBuiltinAutoRelease(node);
    }

    /**
     * 判断组件是否实现 IAutoRelease 接口
     * @param component 组件
     * @returns 是否实现接口
     */
    private isAutoRelease(component: any): component is IAutoRelease {
        return component && typeof component.onAutoRelease === 'function';
    }

    /**
     * 设置内置动画类型的自动回收
     * 每个节点只调用一次，通过 _autoRelease 标记控制
     * @param node 节点
     */
    private setupBuiltinAutoRelease(node: Node) {
        // Spine动画
        const spine = node.getComponent(sp.Skeleton);
        if (spine) {
            spine.setCompleteListener(() => {
                this.put(node);
            });
            return;
        }

        // Cocos Animation动画
        const anim = node.getComponent(Animation);
        if (anim) {
            anim.once(Animation.EventType.FINISHED, () => {
                this.put(node);
            });
            return;
        }

        // 粒子动画
        const particle = node.getComponent(ParticleSystem);
        if (particle) {
            // 粒子没有完成事件，使用持续时间估算
            const duration = particle.duration;
            setTimeout(() => {
                this.put(node);
            }, duration * 1000);
        }
    }
}
