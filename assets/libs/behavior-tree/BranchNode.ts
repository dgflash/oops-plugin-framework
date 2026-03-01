/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 13:58:32
 */
import type { BTNodeJson } from './BTNodeJson';
import { BTreeNode } from './BTreeNode';

/** 复合节点 */
export abstract class BranchNode extends BTreeNode {
    /** 子节点数组 */
    children: BTreeNode[];
    /** 当前任务索引 */
    protected _actualTask: number = 0;
    /**
     * 当前正在执行的子节点。
     * 原 _runningNode 与 _nodeRunning 语义重叠，合并为单一引用。
     */
    protected _activeNode: BTreeNode | null = null;
    /** 外部参数对象 */
    protected _blackboard: object | undefined = undefined;

    constructor(nodes: BTreeNode[]) {
        super();
        this.children = nodes ?? [];
    }

    start(blackboard?: object): void {
        this._actualTask = 0;
        super.start(blackboard);
    }

    run(blackboard?: object): void {
        if (this.children.length === 0) {
            this._control?.fail();
        }
        else {
            this._blackboard = blackboard;
            this.start(blackboard);
            if (this._actualTask < this.children.length) {
                this._run();
            }
        }

        this.end(blackboard);
    }

    /** 执行当前索引对应的子节点 */
    protected _run(): void {
        const node = this.children[this._actualTask];
        if (node) {
            this._activeNode = node;
            node.setControl(this);
            node.start(this._blackboard);
            node.run(this._blackboard);
        }
    }

    running(node: BTreeNode): void {
        this._activeNode = node;
        this._control?.running(node);
    }

    success(): void {
        const node = this._activeNode;
        this._activeNode = null;
        node?.end(this._blackboard);
    }

    fail(): void {
        const node = this._activeNode;
        this._activeNode = null;
        node?.end(this._blackboard);
    }

    toJSON(): BTNodeJson {
        const json = super.toJSON();
        json.children = this.children.map(c => c.toJSON());
        return json;
    }

    /** 清理节点资源 */
    destroy(): void {
        for (const child of this.children) {
            child.destroy();
        }
        this.children.length = 0;
        this._activeNode = null;
        this._blackboard = undefined;
        super.destroy();
    }
}
