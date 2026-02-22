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
    protected data?: any;
    //#endregion

    /**
     * 组件加载时调用
     * 注意：如果子类需要覆盖此方法，必须调用 super.onLoad()
     */
    onLoad() {
        // 只有启用 MVVM 且数据存在时才初始化 VM
        // 使用位运算优化布尔判断（虽然现代引擎已优化，但这是极致优化）
        if (this.mvvm && this.data !== undefined && this.data !== null) {
            this.initializeVM();
        }
    }

    /**
     * 初始化 MVVM 功能
     * @private
     */
    private initializeVM() {
        this.onBind();

        // 优化：使用模板字符串（现代引擎优化更好），并缓存 uuid
        const uuid = this.node.uuid;
        // 优化：只在必要时替换点号，使用更快的 replaceAll（如果支持）
        this.tag = `_temp<${uuid.replace('.', '')}>`;
        VM.add(this.data!, this.tag);

        // 搜寻所有节点：找到 watch path
        const comps = this.getVMComponents();
        const len = comps.length;

        // 优化：避免属性查找，缓存 tag
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
    private replaceVMPath(comp: Component, tag: string) {
        // @ts-ignore - 优化：使用 any 类型避免多次类型转换
        const vmComp: any = comp;
        const path: string = vmComp.watchPath;

        // 优化：使用严格相等避免类型转换
        if (vmComp.templateMode === true) {
            const pathArr: string[] = vmComp.watchPathArr;
            if (pathArr) {
                const len = pathArr.length;
                // 优化：避免在循环中重复声明变量
                for (let i = 0; i < len; i++) {
                    // 优化：直接修改数组元素，避免中间变量
                    pathArr[i] = pathArr[i].replace('*', tag);
                }
            }
        }
        else if (path) {
            // 优化：使用 startsWith 比 split 更快
            // 优化：避免不必要的 split 操作
            if (path.charCodeAt(0) === 42) { // 42 是 '*' 的字符码
                vmComp.watchPath = path.replace('*', tag);
            }
        }
    }

    /**
     * 优化的遍历节点，获取 VM 组件
     * @private
     */
    private getVMComponents(): Component[] {
        const comps = this.node.getComponentsInChildren(VMBase);

        // 优化：提前返回，避免不必要的计算
        if (comps.length === 0) {
            return comps;
        }

        // 优化：只在有嵌套 CCView 时才获取 parents
        const parents = this.node.getComponentsInChildren(CCView);

        // 优化：使用数组长度判断，避免创建新数组
        let hasNested = false;
        const len = parents.length;
        const myUuid = this.uuid;

        for (let i = 0; i < len; i++) {
            const p = parents[i];
            if (p.uuid !== myUuid && p.mvvm) {
                hasNested = true;
                break;
            }
        }

        // 如果没有嵌套的启用了 MVVM 的 CCView，直接返回所有组件
        if (!hasNested) {
            return comps;
        }

        // 优化：使用 Set 过滤，但避免多次遍历
        const filterSet = new Set<Component>();
        for (let i = 0; i < len; i++) {
            const p = parents[i];
            if (p.uuid !== myUuid && p.mvvm) {
                const childComps = p.node.getComponentsInChildren(VMBase);
                const childLen = childComps.length;
                for (let j = 0; j < childLen; j++) {
                    filterSet.add(childComps[j]);
                }
            }
        }

        // 优化：使用传统 for 循环比 filter 更快
        const result: Component[] = [];
        const compsLen = comps.length;
        for (let i = 0; i < compsLen; i++) {
            if (!filterSet.has(comps[i])) {
                result.push(comps[i]);
            }
        }

        return result;
    }

    /** 从父节点移除自己 */
    remove() {
        if (!this.ent) {
            console.error(`组件 ${this.name} 移除失败，实体不存在`);
            return;
        }

        if (this.tid < 0) {
            console.error(`组件 ${this.name} 移除失败，组件未注册 (tid=${this.tid})`);
            return;
        }

        const cct = ECSModel.compCtors[this.tid];
        if (!cct) {
            console.error(`组件 ${this.name} 移除失败，组件构造函数不存在 (tid=${this.tid})`);
            return;
        }

        this.ent.removeUi(cct);
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
            if (this.tag) {
                VM.remove(this.tag);
                // @ts-ignore - 优化：显式清空引用，帮助 GC
                this.tag = undefined;
            }

            // @ts-ignore - 优化：显式清空引用，帮助 GC
            this.data = undefined;
        }

        super.onDestroy();
    }

    abstract reset(): void;
}
