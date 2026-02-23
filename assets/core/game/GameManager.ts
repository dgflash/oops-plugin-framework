/*
 * @Author: dgflash
 * @Date: 2022-02-10 09:50:41
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:09:55
 */
import type { Node } from 'cc';
import { director, isValid } from 'cc';
import { GameComponent } from '../../module/common/GameComponent';
import { resLoader } from '../common/loader/ResLoader';
import { ViewUtil } from '../utils/ViewUtil';
import { View } from '../../types/Types';

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

    /** 手动管理的节点集合（用于内存释放） */
    private _manualNodes: Set<Node> = new Set();

    constructor(root: Node) {
        this.root = root;
    }

    /**
     * 自定义游戏元素显示
     * @param parent        元素父节点
     * @param prefabPath    元素预制
     * @param params        可选参数据
     * @returns Promise<Node | null> 成功返回节点，失败返回 null
     */
    async open(parent: View, prefabPath: string, params?: ElementParams): Promise<Node | null> {
        try {
            // 简化 bundleName 获取逻辑
            const bundleName = params?.bundle || resLoader.defaultBundleName;

            let node: Node | null = null;

            // 自动内存管理
            if (parent instanceof GameComponent) {
                node = await parent.createPrefabNode(prefabPath, bundleName);
                if (!node || !isValid(node)) {
                    console.error(`[GameManager] 创建预制失败: ${prefabPath}`);
                    return null;
                }
                node.parent = parent.node;
            }
            // 手动内存管理
            else {
                node = await ViewUtil.createPrefabNodeAsync(prefabPath, bundleName);
                if (!node || !isValid(node)) {
                    console.error(`[GameManager] 创建预制失败: ${prefabPath}`);
                    return null;
                }
                node.parent = parent;

                // 记录手动管理的节点，便于后续释放
                this._manualNodes.add(node);
            }

            // 自定义节点排序索引
            if (params?.siblingIndex !== undefined) {
                node.setSiblingIndex(params.siblingIndex);
            }

            return node;
        }
        catch (error) {
            console.error(`[GameManager] 打开游戏元素失败: ${prefabPath}`, error);
            return null;
        }
    }

    /**
     * 关闭并销毁手动管理的节点
     * @param node 要关闭的节点
     */
    close(node: Node): void {
        if (!node || !isValid(node)) {
            return;
        }

        // 从手动管理集合中移除
        if (this._manualNodes.has(node)) {
            this._manualNodes.delete(node);
        }

        // 销毁节点（会自动从父节点移除）
        node.destroy();
    }

    /**
     * 释放所有手动管理的节点
     * @description 在场景切换或游戏结束时调用，防止内存泄漏
     */
    releaseAllManualNodes(): void {
        if (this._manualNodes.size === 0) {
            return;
        }

        // 使用数组缓存节点，避免在迭代时修改 Set
        const nodes = Array.from(this._manualNodes);
        this._manualNodes.clear();

        // 批量销毁节点
        for (const node of nodes) {
            if (node && isValid(node)) {
                node.destroy();
            }
        }
    }

    /**
     * 获取手动管理的节点数量（用于调试和监控）
     */
    getManualNodeCount(): number {
        return this._manualNodes.size;
    }

    /** 设置游戏动画速度 */
    setTimeScale(scale: number): void {
        //@ts-ignore
        director.globalGameTimeScale = scale;
    }

    /** 获取游戏动画速度 */
    getTimeScale(): number {
        //@ts-ignore
        return director.globalGameTimeScale;
    }

    /**
     * 清理资源，释放内存
     * @description 在 GameManager 不再使用时调用
     */
    destroy(): void {
        // 释放所有手动管理的节点
        this.releaseAllManualNodes();

        // 清理引用
        this.root = null!;
    }
}
