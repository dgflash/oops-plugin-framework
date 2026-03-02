/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 14:05:40
 */
import { BranchNode } from './BranchNode';

/**
 * 逻辑或关系
 * 只要子节点有一个返回 true，则停止执行其它子节点，Selector 返回 true。
 * 所有子节点都返回 false 时，Selector 返回 false。
 */
export class Selector extends BranchNode {
    success(): void {
        super.success();
        this._control!.success();
    }

    fail(): void {
        super.fail();

        this._actualTask += 1;
        if (this._actualTask < this.children.length) {
            this._run();
        }
        else {
            this._control!.fail();
        }
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
