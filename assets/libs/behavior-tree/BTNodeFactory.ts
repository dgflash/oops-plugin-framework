/**
 * 内置节点工厂注册。
 * 由 index.ts 导出时执行，确保所有内置类型在 fromJSON 前已注册。
 * 自定义 Task 子类需在业务初始化时手动调用 BehaviorTree.registerFactory()。
 */
import { BehaviorTree } from './BehaviorTree';
import { Decorator } from './Decorator';
import { Priority } from './Priority';
import { Selector } from './Selector';
import { Sequence } from './Sequence';
import { Task } from './Task';

BehaviorTree.registerFactory('Sequence', (j) =>
    new Sequence((j.children ?? []).map(c => BehaviorTree.fromJSON(c)))
);

BehaviorTree.registerFactory('Selector', (j) =>
    new Selector((j.children ?? []).map(c => BehaviorTree.fromJSON(c)))
);

BehaviorTree.registerFactory('Priority', (j) =>
    new Priority((j.children ?? []).map(c => BehaviorTree.fromJSON(c)))
);

BehaviorTree.registerFactory('Decorator', (j) => {
    const child = j.children?.[0];
    return new Decorator(child ? BehaviorTree.fromJSON(child) : undefined);
});

BehaviorTree.registerFactory('Task', (_j) => new Task());
