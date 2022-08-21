/*
 * @Author: dgflash
 * @Date: 2021-10-12 14:00:43
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-20 14:57:42
 */

import { Component, Node, NodePool, Prefab, Vec3 } from 'cc';
import { resLoader } from '../../core/common/loader/ResLoader';
import { ViewUtil } from '../../core/utils/ViewUtil';
import { EffectFinishedRelease } from './EffectFinishedRelease';

/** 效果数据 */
class EffectData extends Component {
    type: string = null!;
}

/** 特效参数 */
interface IEffectParams {
    /** 初始位置 */
    pos?: Vec3,
    /** 是否播放完成后删除 */
    isPlayFinishedRelease?: boolean
}

/** 全局单例特效 */
export class EffectSingleCase {
    private static _instance: EffectSingleCase;
    public static get instance(): EffectSingleCase {
        if (this._instance == null) {
            this._instance = new EffectSingleCase();
        }
        return this._instance;
    }

    private effects: Map<string, NodePool> = new Map();

    /** 加载资源并现实特效 */
    loadAndShow(name: string, parent?: Node, params?: IEffectParams): Promise<Node> {
        return new Promise((resolve, reject) => {
            var np = this.effects.get(name);
            if (np == undefined) {
                resLoader.load(name, Prefab, (err: Error | null, prefab: Prefab) => {
                    if (err) {
                        console.error(`名为【${name}】的特效资源加载失败`);
                        return;
                    }

                    var node = this.show(name, parent, params);
                    resolve(node);
                });
            }
            else {
                var node = this.show(name, parent, params);
                resolve(node);
            }
        });
    }

    /** 
     * 显示预制对象 
     * @param name    预制对象名称
     * @param parent  父节点
     * @param pos     位置
     */
    show(name: string, parent?: Node, params?: IEffectParams): Node {
        var np = this.effects.get(name);
        if (np == null) {
            np = new NodePool();
            this.effects.set(name, np);
        }

        var node: Node;
        if (np.size() == 0) {
            node = ViewUtil.createPrefabNode(name);
            node.addComponent(EffectData).type = name;
            if (params && params.isPlayFinishedRelease) {
                node.addComponent(EffectFinishedRelease);
            }
        }
        else {
            node = np.get()!;
        }

        if (params && params.pos) node.position = params.pos;

        if (parent) node.parent = parent;

        return node;
    }

    /**
     * 回收对象
     * @param name  预制对象名称
     * @param node  节点
     */
    put(node: Node) {
        var name = node.getComponent(EffectData)!.type;
        var np = this.effects.get(name);
        if (np) {
            np.put(node);
        }
    }

    /**
     * 清除对象池数据
     * @param name  参数为空时，清除所有对象池数据;指定名时，清楚指定数据
     */
    clear(name?: string) {
        if (name) {
            var np = this.effects.get(name)!;
            np.clear();
        }
        else {
            this.effects.forEach(np => {
                np.clear();
            });
            this.effects.clear();
        }
    }
}