/*
 * @Author: dgflash
 * @Date: 2025-08-15 10:06:47
 * @LastEditors: dgflash
 * @LastEditTime: 2025-08-15 10:06:47
 */
import { Node, NodePool, Prefab, Vec3, warn } from "cc";
import { resLoader } from "../../common/loader/ResLoader";
import { ViewUtil } from "../../utils/ViewUtil";
import { LayerCustomType } from "./LayerEnum";
import { GameElementParams, LayerGameElement } from "./LayerGameElement";
import { LayerHelper } from "./LayerHelper";
import { GameElementConfig } from "./UIConfig";

/* 二维游戏层 */
export class LayerGame extends Node {
    /** 当前显示的元素节点 */
    protected elements = new Map<string, GameElementParams>();

    constructor() {
        super(LayerCustomType.Game);
        LayerHelper.setFullScreen(this);
    }

    /**
     * 添加游戏元素
     * @param prefab    资源地址
     * @param config    游戏元素自定义配置
     */
    add(prefab: string, config: GameElementConfig = {}): Node {
        let params = this.setParams(prefab, config, false);
        let node = ViewUtil.createPrefabNode(prefab, params.config.bundle);
        if (node) {
            // 设置自定义属性
            this.setNode(node, config);

            let lge = node.addComponent(LayerGameElement);
            lge.params = params;
            params.nodes.push(node);
        }
        return node;
    }

    /**
     * 加载资源并添加游戏元素
     * @param prefab    资源地址
     * @param config    游戏元素自定义配置
     */
    addAsync(prefab: string, config: GameElementConfig = {}): Promise<Node> {
        return new Promise(async (resolve, reject) => {
            let bundleName = config.bundle ? config.bundle : resLoader.defaultBundleName;
            await resLoader.loadAsync(bundleName, prefab, Prefab);
            let node = this.add(prefab, config);
            resolve(node);
        });
    }

    /**
     * 添加游戏元素 - 支持对象池
     * @param prefab    资源地址
     * @param config    游戏元素自定义配置
     */
    addPool(prefab: string, config: GameElementConfig = {}): Node {
        let params = this.setParams(prefab, config, true);
        let node: Node = null!;
        if (params.pool.size() > 0) {
            node = params.pool.get()!;
        }
        else {
            node = ViewUtil.createPrefabNode(prefab, params.config.bundle);
            node.addComponent(LayerGameElement);
        }

        // 设置自定义属性
        this.setNode(node, config);

        let lge = node.getComponent(LayerGameElement)!;
        lge.params = params;

        return node;
    }

    /**
     * 加载资源并添加游戏元素 - 支持对象池
     * @param prefab    资源地址
     * @param config    游戏元素自定义配置
     */
    addPoolAsync(prefab: string, config: GameElementConfig = {}): Promise<Node> {
        return new Promise(async (resolve, reject) => {
            let bundleName = config.bundle ? config.bundle : resLoader.defaultBundleName;
            await resLoader.loadAsync(bundleName, prefab, Prefab);
            let node = this.addPool(prefab, config);
            resolve(node);
        });
    }

    /** 清理池数据 */
    clearPool(node: Node) {
        let lge = node.getComponent(LayerGameElement)!;
        if (lge) {
            let params = this.elements.get(lge.params.uiid);
            if (params) params.pool.clear();
        }
    }

    /**
     * 移除游戏元素
     * @param node 游戏元素节点
     */
    remove(node: Node) {
        let lge = node.getComponent(LayerGameElement)!;
        if (lge) {
            if (lge.params.pool) {
                lge.params.pool.put(node);
            }
            else {
                let nodes = lge.params.nodes;
                let index = nodes.indexOf(node);
                if (index != -1) {
                    nodes.splice(index, 1);
                    if (nodes.length == 0) {
                        this.elements.delete(lge.params.uiid);
                        resLoader.release(lge.params.config.prefab!, lge.params.config.bundle);
                    }
                }
                node.removeFromParent();
            }
        }
        else {
            warn(`当前删除游戏元素的 Node 不是通过框架添加的`);
        }
    }

    /** 设置元素参数 */
    private setParams(prefab: string, config: GameElementConfig, pool: boolean) {
        let bundleName = config.bundle ? config.bundle : resLoader.defaultBundleName;
        let uuid = bundleName + "_" + prefab;
        let params = this.elements.get(uuid);
        if (params == null) {
            config.prefab = prefab;
            params = new GameElementParams();
            params.uiid = uuid;
            params.config = config;
            if (pool) {
                params.pool = new NodePool();
            }
            else {
                params.nodes = [];
            }
            this.elements.set(uuid, params);
        }
        return params;
    }

    /** 设置自定义属性 */
    private setNode(node: Node, config: GameElementConfig) {
        node.scale = config.scale ? config.scale : Vec3.ONE;
        node.position = config.position ? config.position : Vec3.ZERO;
        node.eulerAngles = config.eulerAngles ? config.eulerAngles : Vec3.ZERO;
        node.parent = config.parent ? config.parent : this;
        if (config.siblingIndex != null) node.setSiblingIndex(config.siblingIndex);
    }
}