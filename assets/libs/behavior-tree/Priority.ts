import { BranchNode } from './BranchNode';

/** 优先选择节点：首个成功的子节点即返回成功，全部失败则返回失败 */
export class Priority extends BranchNode {
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
}
