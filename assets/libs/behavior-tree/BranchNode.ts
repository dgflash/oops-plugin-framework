/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 13:58:32
 */
import { BehaviorTree } from './BehaviorTree';
import { BTreeNode } from './BTreeNode';

/** 复合节点 */
export abstract class BranchNode extends BTreeNode {
    /** 子节点数组 */
    children: Array<BTreeNode>;
    /** 当前任务索引 */
    protected _actualTask: number = 0;
    /** 正在运行的节点 */
    protected _runningNode: BTreeNode | null = null;
    protected _nodeRunning: BTreeNode | null = null;
    /** 外部参数对象 */
    protected _blackboard: any;

    constructor(nodes: Array<BTreeNode>) {
        super();
        this.children = nodes || [];
    }

    start() {
        this._actualTask = 0;
        super.start();
    }

    run(blackboard?: any) {
        if (this.children.length === 0) { // 没有子任务直接视为执行失败
            if (this._control) {
                this._control.fail();
            }
        }
        else {
            this._blackboard = blackboard;
            this.start();
            if (this._actualTask < this.children.length) {
                this._run();
            }
        }

        this.end();
    }

    /** 执行当前节点逻辑 */
    protected _run(blackboard?: any) {
        // 直接使用子节点，不需要通过 getNode 查询（性能优化）
        const node = this.children[this._actualTask];
        if (node) {
            this._runningNode = node;
            node.setControl(this);
            node.start(this._blackboard);
            node.run(this._blackboard);
        }
    }

    running(node: BTreeNode) {
        this._nodeRunning = node;
        if (this._control) {
            this._control.running(node);
        }
    }

    success() {
        this._nodeRunning = null;
        if (this._runningNode) {
            this._runningNode.end(this._blackboard);
        }
    }

    fail() {
        this._nodeRunning = null;
        if (this._runningNode) {
            this._runningNode.end(this._blackboard);
        }
    }

    /** 清理节点资源 */
    destroy() {
        // 清理所有子节点
        if (this.children) {
            this.children.forEach(child => {
                if (child && typeof child.destroy === 'function') {
                    child.destroy();
                }
            });
        }
        this._runningNode = null;
        this._nodeRunning = null;
        this._blackboard = null;
        super.destroy();
    }
}
