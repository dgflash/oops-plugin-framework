/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 14:05:02
 */
import { BehaviorTree } from './BehaviorTree';
import type { BTNodeJson } from './BTNodeJson';
import { BTreeNode } from './BTreeNode';

/**
 * 装饰器节点：条件语句，附加在其他节点上控制其是否执行。
 * 装饰器为 true 时子树执行，为 false 时子树跳过。
 */
export class Decorator extends BTreeNode {
    node: BTreeNode | null = null;

    constructor(node?: string | BTreeNode) {
        super();
        if (node !== undefined) {
            this.node = BehaviorTree.getNode(node);
        }
    }

    protected setNode(node: string | BTreeNode): void {
        this.node = BehaviorTree.getNode(node);
    }

    start(blackboard?: object): void {
        if (this.node) {
            this.node.setControl(this);
            this.node.start(blackboard);
        }
        else {
            console.error(`装饰器节点【${this.title}】没有设置子节点`);
        }
        super.start(blackboard);
    }

    end(blackboard?: object): void {
        this.node?.end(blackboard);
    }

    run(blackboard?: object): void {
        if (this.node) {
            this.node.run(blackboard);
        }
        else {
            console.error(`装饰器节点【${this.title}】没有设置子节点`);
            this.fail();
        }
    }

    toJSON(): BTNodeJson {
        const json = super.toJSON();
        json.children = this.node ? [this.node.toJSON()] : [];
        return json;
    }

    /** 清理节点资源：先销毁子节点，再清理自身 */
    destroy(): void {
        this.node?.destroy();
        this.node = null;
        super.destroy();
    }
}
