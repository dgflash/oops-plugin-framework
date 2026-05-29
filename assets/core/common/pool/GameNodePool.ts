import type { Node } from 'cc';
import { instantiate, NodePool, Prefab } from 'cc';

/**
 * 通用对象池管理器
 * 基于 Prefab 的 UUID 管理对象池，支持全局单例访问
 * 
 * 使用场景：
 * 1、特效对象池管理
 * 2、UI 对象池管理
 * 3、任意 Prefab 的对象池管理
 * 
 * 注意：本类只管理对象池，不管理资源加载与释放
 * 资源管理请使用各模块自己的资源管理系统
 */
export class GameNodePool {
    private static _instance: GameNodePool;
    /** 获取单例实例 */
    static get instance(): GameNodePool {
        if (this._instance == null) {
            this._instance = new GameNodePool();
        }
        return this._instance;
    }

    /** 对象池集合 - key 为 Prefab 的 UUID */
    private _pools: Map<string, NodePool> = new Map();

    /**
     * 获取指定对象池中对象数量
     * @param prefab 预制体资源
     * @returns 对象池中可用对象数量
     */
    getCount(prefab: Prefab): number {
        const pool = this._pools.get(prefab.uuid);
        if (pool) {
            return pool.size();
        }
        return 0;
    }

    /**
     * 预加载对象到池中
     * @param count 预加载数量
     * @param prefab 预制体资源
     */
    preload(count: number, prefab: Prefab): void {
        const uuid = prefab.uuid;
        let pool = this._pools.get(uuid);
        if (pool == null) {
            pool = new NodePool();
            this._pools.set(uuid, pool);
        }

        for (let i = 0; i < count; i++) {
            const node = instantiate(prefab);
            // @ts-ignore
            node._pool_uuid = uuid;
            pool.put(node);
        }
    }

    /**
     * 从对象池获取对象
     * @param prefab 预制体资源
     * @param parent 父节点（可选）
     * @returns 节点对象
     */
    get(prefab: Prefab, parent?: Node): Node {
        const uuid = prefab.uuid;
        let pool = this._pools.get(uuid);
        if (pool == null) {
            pool = new NodePool();
            this._pools.set(uuid, pool);
        }

        let node: Node;
        // 池中无可用对象时创建新对象
        if (pool.size() == 0) {
            node = instantiate(prefab);
            // @ts-ignore
            node._pool_uuid = uuid;
        }
        // 从池中获取对象
        else {
            node = pool.get()!;
        }

        // 设置父节点
        if (parent) {
            node.parent = parent;
        }

        return node;
    }

    /**
     * 回收对象到池中
     * @param node 节点
     */
    put(node: Node) {
        // @ts-ignore
        const uuid = node._pool_uuid;
        if (uuid) {
            const pool = this._pools.get(uuid);
            if (pool) {
                // 从父节点移除
                if (node.parent) {
                    node.removeFromParent();
                }

                // 重置节点状态
                node.active = false;

                // 回收到池中
                pool.put(node);
            }
        }
    }

    /**
     * 清除对象池数据
     * @param prefab 预制体资源，为空时清除所有对象池数据
     */
    clear(prefab?: Prefab) {
        if (prefab) {
            const uuid = prefab.uuid;
            const pool = this._pools.get(uuid);
            if (pool) {
                pool.clear();
            }
        }
        else {
            this._pools.forEach((pool) => {
                pool.clear();
            });
            this._pools.clear();
        }
    }
}
