import type { BTNodeJson } from './BTNodeJson';
import { BTreeNode } from './BTreeNode';
import type { IControl } from './IControl';

type NodeFactory = (json: BTNodeJson) => BTreeNode;

/** 可复用 ID 池，避免 countUnnamed 单向无限增长 */
const _idPool: number[] = [];
let _idCounter = 0;

function allocId(): number {
    return _idPool.length > 0 ? _idPool.pop()! : ++_idCounter;
}

function freeId(id: number): void {
    _idPool.push(id);
}

/** 行为树 */
export class BehaviorTree implements IControl {
    private readonly _title: string;
    private readonly _id: number;

    /** 根节点 */
    private readonly _root: BTreeNode;
    /** 当前执行节点 */
    private _current: BTreeNode | null = null;
    /** 是否已开始执行 */
    private _started = false;
    /** 外部参数对象 */
    private _blackboard: object | undefined = undefined;

    /** 是否正在执行中 */
    get started(): boolean {
        return this._started;
    }

    /**
     * @param node          根节点
     * @param blackboard    共享数据对象
     */
    constructor(node: BTreeNode, blackboard?: object) {
        this._id = allocId();
        this._title = node.constructor.name + '(btree_' + this._id + ')';
        this._root = node;
        this._blackboard = blackboard;
    }

    /** 设置行为逻辑中的共享数据 */
    setObject(blackboard: object): void {
        this._blackboard = blackboard;
    }

    /** 执行行为树逻辑 */
    run(blackboard?: object): void {
        if (this._started) {
            console.error(`行为树【${this._title}】未调用步骤，在最后一次调用步骤时有一个任务未完成`);
        }

        this._started = true;
        const node = this._root;
        this._current = node;
        node.setControl(this);
        node.start(this._blackboard);
        node.run(this._blackboard);
    }

    running(node: BTreeNode): void {
        this._started = false;
    }

    success(): void {
        this._current?.end(this._blackboard);
        this._started = false;
    }

    fail(): void {
        this._current?.end(this._blackboard);
        this._started = false;
    }

    /** 清理行为树资源，释放 ID 供后续复用 */
    destroy(): void {
        this._current = null;
        this._blackboard = undefined;
        this._started = false;
        freeId(this._id);
    }

    /** ------------------------------------------------------------------ */

    /** JSON 节点工厂：type -> 构造函数 */
    private static readonly _factories: Map<string, NodeFactory> = new Map<string, NodeFactory>();

    /**
     * 注册节点工厂，供 fromJSON() 反序列化使用。
     * 内置类型由 BTNodeFactory.ts 统一注册；自定义 Task 子类手动调用此方法。
     */
    static registerFactory(type: string, factory: NodeFactory): void {
        this._factories.set(type, factory);
    }

    /**
     * 从 JSON 描述反序列化出节点树。
     * 需先通过 registerFactory 注册对应 type 的工厂。
     */
    static fromJSON(json: BTNodeJson): BTreeNode {
        const factory = this._factories.get(json.type);
        if (!factory) {
            throw new Error(`未注册的节点类型【${json.type}】，请先调用 BehaviorTree.registerFactory()`);
        }
        const node = factory(json);
        if (json.id !== undefined) {
            node.id = json.id;
        }
        return node;
    }

    /** ------------------------------------------------------------------ */

    private static readonly _registeredNodes: Map<string, BTreeNode> = new Map<string, BTreeNode>();

    /** 注册节点，name 重复时覆盖旧值 */
    static register(name: string, node: BTreeNode): void {
        this._registeredNodes.set(name, node);
    }

    /**
     * 注销节点并销毁其资源。
     * 与 destroy() 联动，防止静态 Map 长期持有已废弃节点。
     */
    static unregister(name: string): void {
        const node = this._registeredNodes.get(name);
        if (node) {
            node.destroy();
            this._registeredNodes.delete(name);
        }
    }

    /** 清理并销毁所有已注册节点 */
    static clearAll(): void {
        for (const node of this._registeredNodes.values()) {
            node.destroy();
        }
        this._registeredNodes.clear();
    }

    /**
     * 获取节点：传入实例时直接返回，传入名称时从注册表查找。
     * 构造/配置阶段通过此方法解析，运行时持有实例引用，避免热路径 Map 查找。
     */
    static getNode(name: string | BTreeNode): BTreeNode {
        if (name instanceof BTreeNode) {
            return name;
        }
        const node = this._registeredNodes.get(name);
        if (!node) {
            throw new Error(`无法找到节点【${name}】，可能它没有注册过`);
        }
        return node;
    }
}
