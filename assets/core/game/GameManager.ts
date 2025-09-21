/*
 * @Author: dgflash
 * @Date: 2022-02-10 09:50:41
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:09:55
 */
import { Node, director } from 'cc';
import { ViewUtil } from '../utils/ViewUtil';
import { resLoader } from '../common/loader/ResLoader';
import { GameComponent } from '../../module/common/GameComponent';

/** 游戏元素打开参数 */
export interface ElementParams {
    /** 远程包名 */
    bundle?: string;
    /** 节点排序索引 */
    siblingIndex?: number;
}

/** 游戏世界管理 */
export class GameManager {
    /** 自定义游戏世界根节点 */
    root!: Node;

    constructor(root: Node) {
        this.root = root;
    }

    /**
     * 自定义游戏元素显示
     * @param parent        元素父节点
     * @param prefabPath    元素预制
     * @param params        可选参数据
     */
    open(parent: Node | GameComponent, prefabPath: string, params?: ElementParams): Promise<Node> {
        return new Promise(async (resolve, reject) => {
            let bundleName: string = null!
            if (params && params.bundle) {
                bundleName = params.bundle;
            }
            else {
                bundleName = resLoader.defaultBundleName;
            }
            let node: Node = null!;
            // 自动内存管理
            if (parent instanceof GameComponent) {
                node = await parent.createPrefabNodeAsync(prefabPath, bundleName);
                node.parent = parent.node;
            }
            // 手动内存管理
            else {
                node = await ViewUtil.createPrefabNodeAsync(prefabPath, bundleName);
                node.parent = parent;
            }

            // 自定义节点排序索引
            if (params) {
                if (params.siblingIndex) node.setSiblingIndex(params.siblingIndex);
            }

            resolve(node);
        });
    }

    /** 设置游戏动画速度 */
    setTimeScale(scale: number) {
        //@ts-ignore
        director.globalGameTimeScale = scale;
    }
    /** 获取游戏动画速度 */
    getTimeScale() {
        //@ts-ignore
        return director.globalGameTimeScale;
    }
}