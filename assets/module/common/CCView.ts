/*
 * @Author: dgflash
 * @Date: 2021-11-11 19:05:32
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 17:20:51
 */

import type { Component } from 'cc';
import type { ecs } from '../../libs/ecs/ECS';
import { ECSModel } from '../../libs/ecs/ECSModel';
import { VM } from '../../libs/model-view/ViewModel';
import { VMBase } from '../../libs/model-view/VMBase';
import type { CCEntity } from './CCEntity';
import type { UICtor } from '../../types/Types';
import { GameComponent } from './GameComponent';

/**
 * ECS 游戏显示对象组件
 *
 * 功能介绍：
 * 1. 对象拥有 cc.Component 组件功能与 ecs.Comp 组件功能
 * 2. 对象自带全局事件监听、释放、发送全局消息功能
 * 3. 对象管理的所有节点摊平，直接通过节点名获取cc.Node对象
 * 4. 支持可选的 MVVM 功能（通过 mvvm 属性启用）
 *
 * 应用场景
 * 1. 网络游戏，优先有数据对象，然后创建视图对象，当释放视图组件时，部分场景不希望释放数据对象
 *
 * @example
// 不使用 MVVM 的组件
@ccclass('RoleViewComp')
@ecs.register('RoleView', false)
export class RoleViewComp extends CCView<Role> {
    @property({ type: sp.Skeleton, tooltip: '角色动画' })
    spine: sp.Skeleton = null!;

    onLoad(){
        super.onLoad();
    }
}

// 使用 MVVM 的组件
@ccclass('LoadingViewComp')
@ecs.register('LoadingView', false)
export class LoadingViewComp extends CCView<Initialize> {
    protected mvvm = true;  // 启用 MVVM 功能

    data: LoadingData = {
        finished: 0,
        total: 0,
        progress: "0",
        prompt: ""
    };

    onLoad(){
        super.onLoad();
    }

    reset(): void {
        // 重置逻辑
    }
}
 */
export abstract class CCView<T extends CCEntity> extends GameComponent implements ecs.IComp {
    static tid = -1;
    static compName: string;

    canRecycle!: boolean;
    ent!: T;
    tid = -1;

    //#region MVVM 功能相关（仅在 mvvm = true 时使用）
    /** 是否启用 MVVM 功能（子类可覆盖为 true） */
    protected mvvm = false;

    /**
     * MVVM 绑定的标签，延迟初始化以节省内存
     * 仅在启用 MVVM 时创建
     */
    protected tag?: string;

    /**
     * 需要绑定的私有数据
     * 注意：子类应该显式初始化此属性
     */
    protected data?: object;

    /**
     * 组件加载时调用
     * 注意：如果子类需要覆盖此方法，必须调用 super.onLoad()
     */
    onLoad() {
        // 提前返回，避免不必要的检查
        if (!this.mvvm) return;

        // onBind 语义为"绑定初始化"，与 data 是否存在解耦，始终调用
        this.onBind();

        const data = this.data;
        if (data === undefined || data === null) {
            console.warn(`[CCView] ${this.constructor.name}: mvvm=true 但 data 未定义，VM 绑定已跳过`);
            return;
        }

        this.initializeVM();
    }

    /**
     * 初始化 MVVM 功能
     * @private
     */
    private initializeVM() {
        // 使用正则替换所有的点，避免 VM.add 内部校验失败
        const uuid = this.node.uuid.replace(/\./g, '');
        this.tag = `_temp<${uuid}>`;
        VM.add(this.data!, this.tag);

        const comps = this.getVMComponents();
        const len = comps.length;
        const tag = this.tag;
        for (let i = 0; i < len; i++) {
            this.replaceVMPath(comps[i], tag);
        }
    }

    /**
     * 在 onLoad 完成和 start() 之前调用，你可以在这里进行初始化数据等操作
     * 注意：仅在 mvvm = true 时调用
     * @protected
     */
    protected onBind() { }

    /**
     * 在 onDestroy() 后调用，此时仍然可以获取绑定的 data 数据
     * 注意：仅在 mvvm = true 时调用
     * @protected
     */
    protected onUnBind() { }

    /**
     * 替换 VM 组件的路径
     * @private
     */
    private replaceVMPath(comp: VMBase, tag: string) {
        if (comp.templateMode) {
            const pathArr = comp.watchPathArr;
            const len = pathArr.length;
            for (let i = 0; i < len; i++) {
                pathArr[i] = pathArr[i].replace('*', tag);
            }
        } else if (comp.watchPath[0] === '*') {
            comp.watchPath = comp.watchPath.replace('*', tag);
        }
    }

    /**
     * 获取当前节点下属于本 CCView 管辖的 VMBase 组件（排除嵌套启用 MVVM 的子 CCView 管辖范围）
     * 使用深度优先遍历 + 剪枝优化性能
     * @private
     */
    private getVMComponents(): VMBase[] {
        const result: VMBase[] = [];
        const myUuid = this.uuid;
        
        // 深度优先遍历，遇到嵌套的 MVVM CCView 时剪枝
        const traverse = (node: any) => {
            // 检查当前节点的组件
            const vmComps = node.getComponents(VMBase);
            const vmLen = vmComps.length;
            for (let i = 0; i < vmLen; i++) {
                result.push(vmComps[i]);
            }
            
            // 检查是否有嵌套的 MVVM CCView（排除自己）
            const ccViews = node.getComponents(CCView);
            const ccLen = ccViews.length;
            for (let i = 0; i < ccLen; i++) {
                const view = ccViews[i];
                if (view.uuid !== myUuid && view.mvvm) {
                    // 遇到嵌套的 MVVM CCView，剪枝，不再遍历其子节点
                    return;
                }
            }
            
            // 递归遍历子节点
            const children = node.children;
            const childLen = children.length;
            for (let i = 0; i < childLen; i++) {
                traverse(children[i]);
            }
        };
        
        traverse(this.node);
        return result;
    }
    //#endregion

    /** 从父节点移除自己 */
    remove() {
        const ent = this.ent;
        if (!ent) {
            console.error(`组件 ${this.name} 移除失败，实体不存在`);
            return;
        }

        const tid = this.tid;
        if (tid < 0) {
            console.error(`组件 ${this.name} 移除失败，组件未注册 (tid=${tid})`);
            return;
        }

        const cct = ECSModel.compCtors[tid];
        if (!cct) {
            console.error(`组件 ${this.name} 移除失败，组件构造函数不存在 (tid=${tid})`);
            return;
        }

        ent.removeUi(cct as unknown as UICtor);
        this.ent = null!; // 清空引用，避免内存泄漏
    }

    /**
     * 组件销毁时调用
     * 注意：如果子类需要覆盖此方法，必须调用 super.onDestroy()
     */
    protected onDestroy() {
        // 只有启用了 MVVM 时才执行清理
        if (this.mvvm) {
            this.onUnBind();

            // 解除全部引用
            const tag = this.tag;
            if (tag) {
                VM.remove(tag);
                this.tag = undefined;
            }

            this.data = undefined;
        }

        super.onDestroy();
    }

    abstract reset(): void;
}
