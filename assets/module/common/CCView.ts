/*
 * @Author: dgflash
 * @Date: 2021-11-11 19:05:32
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 17:20:51
 */

import { ecs } from '../../libs/ecs/ECS';
import { ECSModel } from '../../libs/ecs/ECSModel';
import { CCEntity } from './CCEntity';
import { GameComponent } from './GameComponent';

/** 
 * ECS 游戏显示对象组件
 * 
 * 功能介绍：
 * 1. 对象拥有 cc.Component 组件功能与 ecs.Comp 组件功能
 * 2. 对象自带全局事件监听、释放、发送全局消息功能
 * 3. 对象管理的所有节点摊平，直接通过节点名获取cc.Node对象
 * 
 * 应用场景
 * 1. 网络游戏，优先有数据对象，然后创建视图对象，当释放视图组件时，部分场景不希望释放数据对象
 * 
 * @example
@ccclass('RoleViewComp')
@ecs.register('RoleView', false)
export class RoleViewComp extends CCView<Role> {
    @property({ type: sp.Skeleton, tooltip: '角色动画' })
    spine: sp.Skeleton = null!;

    onLoad(){
        
    }
}
 */
export abstract class CCView<T extends CCEntity> extends GameComponent implements ecs.IComp {
    static tid: number = -1;
    static compName: string;

    canRecycle!: boolean;
    ent!: T;
    tid: number = -1;

    /** 从父节点移除自己 */
    remove() {
        const cct = ECSModel.compCtors[this.tid];
        if (this.ent) {
            this.ent.removeUi(cct);
        }
        else {
            console.error(`组件 ${this.name} 移除失败，组件未注册`);
        }
    }

    abstract reset(): void;
}