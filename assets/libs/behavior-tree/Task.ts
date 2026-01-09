/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 11:43:20
 */
import { BTreeNode } from './BTreeNode';

/** 
 * 任务行为节点
 * 这是一个基类，子类应该实现具体的 run 方法
 */
export class Task extends BTreeNode {
    run(blackboard?: any) {
        // 默认实现：直接成功
        // 子类应该重写此方法实现具体逻辑
        this.success();
    }
}
