/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-09 11:55:03
 */
import { Component, Node, _decorator } from "cc";
import { oops } from "../../Oops";
import { UIConfig } from "./UIConfig";

const { ccclass } = _decorator;

const EventOnAdded: string = "onAdded";
const EventOnBeforeRemove: string = "onBeforeRemove";
const EventOnRemoved: string = "onRemoved";

/** 窗口元素组件 */
@ccclass('LayerUIElement')
export class LayerUIElement extends Component {
    /** 视图参数 */
    params: UIParams = null!;
    /** 关闭窗口之前 */
    onCloseWindowBefore: Function = null!;
    /** 界面关闭回调 - 包括关闭动画播放完（辅助框架内存业务流程使用） */
    private onCloseWindow: Function = null!;

    /** 窗口添加 */
    add(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            // 触发窗口组件上添加到父节点后的事件
            for (let i = 0; i < this.node.components.length; i++) {
                const component: any = this.node.components[i];
                const func = component[EventOnAdded];
                if (func) {
                    if (await func.call(component, this.params.params) == false) {
                        resolve(false);
                        return;
                    }
                }
            }

            // 触发外部窗口显示前的事件（辅助实现自定义动画逻辑）
            if (typeof this.params.callbacks.onAdded === "function") {
                this.params.callbacks.onAdded(this.node, this.params.params);
            }

            resolve(true);
        });
    }

    /** 删除节点，该方法只能调用一次，将会触发onBeforeRemoved回调 */
    remove(isDestroy?: boolean) {
        if (this.params.valid) {
            // 触发窗口移除舞台之前事件
            this.applyComponentsFunction(this.node, EventOnBeforeRemove, this.params.params);

            //  通知外部对象窗口组件上移除之前的事件（关闭窗口前的关闭动画处理）
            if (typeof this.params.callbacks.onBeforeRemove === "function") {
                this.params.callbacks.onBeforeRemove(this.node, this.onBeforeRemoveNext.bind(this, isDestroy));
            }
            else {
                this.onBeforeRemoveNext(isDestroy);
            }
        }
        else {
            this.onBeforeRemoveNext(isDestroy);
        }
    }

    /** 窗口关闭前动画处理完后的回调方法，主要用于释放资源 */
    private onBeforeRemoveNext(isDestroy?: boolean) {
        this.onCloseWindowBefore && this.onCloseWindowBefore();
        this.removed(this.params, isDestroy);
    }

    /** 窗口组件中触发移除事件与释放窗口对象 */
    private removed(uip: UIParams, isDestroy?: boolean) {
        uip.valid = false;

        if (uip.callbacks && typeof uip.callbacks.onRemoved === "function") {
            uip.callbacks.onRemoved(this.node, uip.params);
        }

        // 界面移除舞台事件
        this.onCloseWindow && this.onCloseWindow(uip);

        if (isDestroy) {
            // 释放界面显示对象
            this.node.destroy();

            // 释放界面相关资源
            oops.res.release(uip.config.prefab, uip.config.bundle);

            oops.log.logView(`【界面管理】释放【${uip.config.prefab}】界面资源`);
        }
        else {
            this.node.removeFromParent();
        }

        // 触发窗口组件上窗口移除之后的事件
        this.applyComponentsFunction(this.node, EventOnRemoved, this.params.params);
    }

    private applyComponentsFunction(node: Node, funName: string, params: any) {
        for (let i = 0; i < node.components.length; i++) {
            const component: any = node.components[i];
            const func = component[funName];
            if (func) {
                func.call(component, params);
            }
        }
    }

    onDestroy() {
        this.params = null!;
        this.onCloseWindowBefore = null!;
        this.onCloseWindow = null!;
    }
}

/** 本类型仅供gui模块内部使用，请勿在功能逻辑中使用 */
export class UIParams {
    /** 界面唯一编号 */
    uiid: string = null!;
    /** 界面配置 */
    config: UIConfig = null!;
    /** 传递给打开界面的参数 */
    params: any = null!;
    /** 窗口事件 */
    callbacks: UICallbacks = null!;
    /** 是否在使用状态 */
    valid: boolean = true;
    /** 界面根节点 */
    node: Node = null!;
}

/*** 界面回调参数对象定义 */
export interface UICallbacks {
    /**
     * 节点添加到层级以后的回调
     * @param node   当前界面节点
     * @param params 外部传递参数
     */
    onAdded?: (node: Node, params: any) => void,

    /**
     * 窗口节点 destroy 之后回调
     * @param node   当前界面节点
     * @param params 外部传递参数
     */
    onRemoved?: (node: Node | null, params: any) => void,

    /** 
     * 如果指定onBeforeRemoved，则next必须调用，否则节点不会被正常删除。
     * 
     * 比如希望节点做一个FadeOut然后删除，则可以在`onBeforeRemoved`当中播放action动画，动画结束后调用next
     * @param node   当前界面节点
     * @param next   回调方法
     */
    onBeforeRemove?: (node: Node, next: Function) => void,

    /** 网络异常时，窗口加载失败回调 */
    onLoadFailure?: () => void;
}