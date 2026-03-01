export * from './BTNodeJson';
export * from './BehaviorTree';
export * from './BranchNode';
export * from './Decorator';
export * from './BTreeNode';
export * from './Priority';
export * from './Sequence';
export * from './Task';
export * from './Selector';

// 导入此文件即完成内置节点工厂注册，fromJSON 可直接使用内置类型
import './BTNodeFactory';
