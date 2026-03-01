/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 14:05:22
 */
import { BranchNode } from './BranchNode';

/**
 * 逻辑与关系
 * 只要有一个子节点返回 false，则停止执行其它子节点，Sequence 返回 false。
 * 所有子节点都返回 true 时，Sequence 返回 true。
 */
export class Sequence extends BranchNode {
    success(): void {
        super.success();

        this._actualTask += 1;
        if (this._actualTask < this.children.length) {
            this._run();
        }
        else {
            this._control!.success();
        }
    }

    fail(): void {
        super.fail();
        this._control!.fail();
    }

    protected _run(): void {
        if (this._activeNode) {
            this._activeNode.run(this._blackboard);
        }
        else {
            super._run();
        }
    }
}
