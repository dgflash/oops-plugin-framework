/*
 * @Author: dgflash
 * @Date: 2021-11-11 19:05:32
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 17:22:05
 */

import { ecs } from '../../libs/ecs/ECS';
import { ECSModel } from '../../libs/ecs/ECSModel';
import VMParent from '../../libs/model-view/VMParent';
import { CCEntity } from './CCEntity';

/** 
 * 支持 MVVM 功能的 ECS 游戏显示对象组件
 * 
 * 使用方法：
 * 1. 对象拥有 cc.Component 组件功能与 ecs.Comp 组件功能
 * 2. 对象自带全局事件监听、释放、发送全局消息功能
 * 3. 对象管理的所有节点摊平，直接通过节点名获取cc.Node对象（节点名不能有重名）
 * 4. 对象支持 VMParent 所有功能
 * 
 * 应用场景
 * 1. 网络游戏，优先有数据对象，然后创建视图对象，当释放视图组件时，部分场景不希望释放数据对象
 * 
 * @example
@ccclass('LoadingViewComp')
@ecs.register('LoadingView', false)
export class LoadingViewComp extends CCViewVM<Initialize> {
    // VM 组件绑定数据
    data: any = {
        // 加载资源当前进度
        finished: 0,
        // 加载资源最大进度
        total: 0,
        // 加载资源进度比例值
        progress: "0",
        // 加载流程中提示文本
        prompt: ""
    };

    private progress: number = 0;

    reset(): void {
      
    }
}
 */
export abstract class CCViewVM<T extends CCEntity> extends VMParent implements ecs.IComp {
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