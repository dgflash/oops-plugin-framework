import { instantiate, Node, Prefab, Vec3 } from 'cc';
import type { GameComponent } from '../GameComponent';
import { ViewUtil } from '../../../core/utils/ViewUtil';
import { GamePartBase } from '../GamePartBase';
import { MoveTo } from '../../../libs/animator-move/MoveTo';
import { resLoader } from 'db://oops-framework/core/common/loader/ResLoader';

/** 预制节点与节点树管理 */
export class GamePartNode extends GamePartBase {
    /** 宿主组件 */
    protected declare comp: GameComponent;

    /** 摊平的节点集合（所有节点不能重名）- 延迟初始化 */
    private _nodes: Map<string, Node> | null = null;

    /** 获取节点集合 */
    get nodes(): Map<string, Node> {
        if (!this._nodes) {
            this._nodes = new Map();
        }
        return this._nodes;
    }

    /** 获取节点
     * @param name 节点名称
     * @returns 节点对象
     */
    get(name: string): Node | undefined {
        return this._nodes?.get(name);
    }

    /** 获取节点树信息 */
    nodeTreeInfoLite(): void {
        this.nodes.clear();
        ViewUtil.nodeTreeInfoLite(this.comp.node, this.nodes);
    }

    /** 创建预制体节点
     * @param path 预制体路径
     * @param bundleName 资源包名称
     * @returns 节点对象
     */
    async createPrefabNode(path: string, bundleName: string = resLoader.defaultBundleName): Promise<Node | null> {
        const prefab = await this.comp.res.load(bundleName, path, Prefab);
        if (!prefab) {
            console.warn('[OopsFramework]', `预制体加载失败: ${path}`);
            return null;
        }
        return instantiate(prefab);
    }

    /**
     * 移动节点到指定目标位置
     * @param node 要移动的节点
     * @param target 目标位置（Vec3）或目标节点（Node）
     * @param speed 移动速度（每秒移动的像素距离）
     * @param options 可选参数配置
     * @returns MoveTo组件实例
     */
    moveTo(
        node: Node,
        target: Vec3 | Node,
        speed: number,
        options?: {
            hasYAxis?: boolean;
            offset?: number;
            offsetVector?: Vec3;
            onStart?: () => void;
            onComplete?: () => void;
            onChange?: () => void;
        }
    ): MoveTo | null {
        let moveTo = node.getComponent(MoveTo);
        if (!moveTo) {
            moveTo = node.addComponent(MoveTo);
        }

        moveTo.target = target;
        moveTo.speed = speed;

        if (options) {
            if (options.hasYAxis !== undefined) moveTo.hasYAxis = options.hasYAxis;
            if (options.offset !== undefined) moveTo.offset = options.offset;
            if (options.offsetVector !== undefined) moveTo.offsetVector = options.offsetVector;
            if (options.onStart !== undefined) moveTo.onStart = options.onStart;
            if (options.onComplete !== undefined) moveTo.onComplete = options.onComplete;
            if (options.onChange !== undefined) moveTo.onChange = options.onChange;
        }

        moveTo.move();
        return moveTo;
    }

    /** 销毁节点模块 */
    override destroy(): void {
        this._nodes?.clear();
        this._nodes = null;
    }
}