import { BTreeNode } from './BTreeNode';

/**
 * 叶子任务节点基类，子类重写 run() 实现具体行为逻辑。
 * 默认实现直接调用 success()。
 */
export class Task extends BTreeNode {
    run(blackboard?: object): void {
        this.success();
    }
}
