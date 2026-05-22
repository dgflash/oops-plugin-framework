/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 */
import { instantiate, Node, Prefab } from 'cc';
import { oops } from '../../../core/Oops';
import { ViewUtil } from '../../../core/utils/ViewUtil';
import { GameViewModule } from './GameViewModuleBase';

/** 预制节点与节点树管理 */
export class GameNodeModule extends GameViewModule {
    /** 摊平的节点集合（所有节点不能重名） */
    readonly nodes: Map<string, Node> = new Map();

    /** 获取节点
     * @param name 节点名称
     * @returns 节点对象
     */
    getNode(name: string): Node | undefined {
        return this.nodes.get(name);
    }

    /** 获取节点树信息（轻量版） */
    nodeTreeInfoLite(): void {
        this.nodes.clear();
        ViewUtil.nodeTreeInfoLite(this.comp.node, this.nodes);
    }

    /** 创建预制体节点
     * @param path 预制体路径
     * @param bundleName 资源包名称
     * @returns 节点对象
     */
    async createPrefabNode(path: string, bundleName: string = oops.res.defaultBundleName): Promise<Node | null> {
        const prefab = await this.comp.res.load(bundleName, path, Prefab);
        if (!prefab) {
            console.warn('[OopsFramework]', `预制体加载失败: ${path}`);
            return null;
        }
        return instantiate(prefab);
    }

    /** 销毁节点模块 */
    override destroy(): void {
        this.nodes.clear();
    }
}