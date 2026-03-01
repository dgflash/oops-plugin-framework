/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 14:04:27
 */
import type { BTreeNode } from './BTreeNode';

/** 行为控制接口 */
export interface IControl {
    /** 行为处理成功 */
    success(): void;

    /** 行为处理失败 */
    fail(): void;

    /** 处理行为逻辑 */
    run(blackboard?: object): void;

    /** 正在处理中，传入当前正在运行的节点 */
    running(node: BTreeNode): void;
}
