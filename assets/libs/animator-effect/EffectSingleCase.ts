/*
 * @Author: dgflash
 * @Date: 2021-10-12 14:00:43
 * @LastEditors: dgflash
 * @LastEditTime: 2023-03-06 14:40:34
 */
import { Animation, Component, Node, NodePool, ParticleSystem, Prefab, Vec3, sp } from 'cc';
import { oops } from '../../core/Oops';
import { ViewUtil } from '../../core/utils/ViewUtil';
import { EffectEvent } from './EffectEvent';
import { EffectFinishedRelease } from './EffectFinishedRelease';

/** 效果数据 */
class EffectData extends Component {
    /** 资源路径 */
    path: string = null!;
}

/** 特效参数 */
interface IEffectParams {
    /** 初始位置 */
    pos?: Vec3,
    /** 是否播放完成后删除 */
    isPlayFinishedRelease?: boolean
}

/** 
 * 动画特效对象池管理器，加载动画后自动播放，播放完后自动回收到池中
 * 1、支持Spine动画
 * 2、支持Cocos Animation动画
 * 3、支持Cocos ParticleSystem粒子动画
 */
export class EffectSingleCase {
    private static _instance: EffectSingleCase;
    static get instance(): EffectSingleCase {
        if (this._instance == null) {
            this._instance = new EffectSingleCase();
        }
        return this._instance;
    }

    private _speed: number = 1;
    /** 全局动画播放速度 */
    get speed(): number {
        return this._speed;
    }
    set speed(value: number) {
        this._speed = value;
        this.effects_use.forEach((value: Boolean, key: Node) => {
            this.setSpeed(key);
        });
    }

    /** 对象池集合 */
    private effects: Map<string, NodePool> = new Map();
    /** 正在使用中的显示对象集合 */
    private effects_use: Map<Node, boolean> = new Map();
    /** 对象池中用到的资源 - 这里只管理本对象加载的资源，预加载资源由其它对象自己施放 */
    private res: Map<string, boolean> = new Map();

    constructor() {
        oops.message.on(EffectEvent.Put, this.onHandler, this);
    }

    private onHandler(event: string, args: any) {
        if (event == EffectEvent.Put) {
            this.put(args as Node);
        }
    }

    /** 
     * 加载资源并现实特效 
     * @param path    预制资源路径
     * @param parent  父节点
     * @param pos     位置
     */
    loadAndShow(path: string, parent?: Node, params?: IEffectParams): Promise<Node> {
        return new Promise(async (resolve, reject) => {
            var np = this.effects.get(path);
            if (np == undefined) {
                // 记录显示对象资源
                this.res.set(path, true);

                oops.res.load(path, Prefab, (err: Error | null, prefab: Prefab) => {
                    if (err) {
                        console.error(`名为【${path}】的特效资源加载失败`);
                        return;
                    }

                    var node = this.show(path, parent, params);
                    resolve(node);
                });
            }
            else {
                var node = this.show(path, parent, params);
                resolve(node);
            }
        });
    }

    /** 
     * 显示预制对象
     * @param path    预制资源路径
     * @param parent  父节点
     * @param pos     位置
     */
    show(path: string, parent?: Node, params?: IEffectParams): Node {
        var np = this.effects.get(path);
        if (np == null) {
            np = new NodePool();
            this.effects.set(path, np);
        }

        var node: Node;
        // 创建池中新显示对象
        if (np.size() == 0) {
            node = ViewUtil.createPrefabNode(path);
            node.addComponent(EffectData).path = path;
            if (params && params.isPlayFinishedRelease) {
                node.addComponent(EffectFinishedRelease);
            }
        }
        // 池中获取没使用的显示对象
        else {
            node = np.get()!;
            node.getComponent(EffectFinishedRelease);
        }

        // 设置动画播放速度
        this.setSpeed(node);

        // 设置显示对象位置
        if (params && params.pos) node.position = params.pos;

        // 显示到屏幕上
        if (parent) node.parent = parent;

        // 记录缓冲池中放出的节点
        this.effects_use.set(node, true);

        return node;
    }

    /**
     * 回收对象
     * @param name  预制对象名称
     * @param node  节点
     */
    put(node: Node) {
        var name = node.getComponent(EffectData)!.path;
        var np = this.effects.get(name);
        if (np) {
            // 回收使用的节点
            this.effects_use.delete(node);

            // 回到到池中
            np.put(node);
        }
    }

    /**
     * 清除对象池数据
     * @param path  参数为空时，清除所有对象池数据;指定名时，清楚指定数据
     */
    clear(path?: string) {
        if (path) {
            var np = this.effects.get(path)!;
            np.clear();
        }
        else {
            this.effects.forEach(np => {
                np.clear();
            });
            this.effects.clear();
        }
    }

    /**
     * 施放对象池中显示对象的资源内存
     * @param path 资源路径 
     */
    release(path?: string) {
        if (path) {
            this.clear(path);
            oops.res.release(path);
        }
        else {
            this.clear();
            this.res.forEach((value: boolean, path: string) => {
                oops.res.release(path);
            });
        }
    }

    /** 设置动画速度 */
    private setSpeed(node: Node) {
        // SPINE动画
        let spine = node.getComponent(sp.Skeleton);
        if (spine) {
            spine.timeScale = this.speed;
        }
        else {
            // COCOS动画
            let anims: Animation[] = node.getComponentsInChildren(Animation);
            if (anims.length > 0) {
                anims.forEach(animator => {
                    let aniName = animator.defaultClip?.name;
                    if (aniName) {
                        let aniState = animator.getState(aniName);
                        if (aniState) {
                            aniState.speed = this.speed;
                        }
                    }
                });
            }
            // 粒子动画
            else if (ParticleSystem) {
                let particles: ParticleSystem[] = node.getComponentsInChildren(ParticleSystem);
                particles.forEach(particle => {
                    particle.simulationSpeed = this.speed;
                });
            }
        }
    }
}