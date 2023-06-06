/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-09 11:55:03
 */
import { Component, Node, _decorator } from "cc";
import { oops } from "../../Oops";
import { ViewParams } from "./Defines";

const { ccclass } = _decorator;

/** 窗口事件触发组件 */
@ccclass('DelegateComponent')
export class DelegateComponent extends Component {
    /** 视图参数 */
    viewParams: ViewParams = null!;

    /** 窗口添加 */
    add() {
        // 触发窗口组件上添加到父节点后的事件
        this.applyComponentsFunction(this.node, "onAdded", this.viewParams.params);
        if (typeof this.viewParams.callbacks.onAdded === "function") {
            this.viewParams.callbacks.onAdded(this.node, this.viewParams.params);
        }
    }

    /** 删除节点，该方法只能调用一次，将会触发onBeforeRemoved回调 */
    remove(isDestroy: boolean) {
        if (this.viewParams.valid) {
            // 触发窗口组件上移除之前的事件
            this.applyComponentsFunction(this.node, "onBeforeRemove", this.viewParams.params);

            //  通知外部对象窗口组件上移除之前的事件（关闭窗口前的关闭动画处理）
            if (typeof this.viewParams.callbacks.onBeforeRemove === "function") {
                this.viewParams.callbacks.onBeforeRemove(
                    this.node,
                    () => {
                        this.removed(this.viewParams, isDestroy);
                    });
            }
            else {
                this.removed(this.viewParams, isDestroy);
            }
        }
    }

    /** 窗口组件中触发移除事件与释放窗口对象 */
    private removed(viewParams: ViewParams, isDestroy: boolean) {
        viewParams.valid = false;

        if (typeof viewParams.callbacks.onRemoved === "function") {
            viewParams.callbacks!.onRemoved(this.node, viewParams.params);
        }

        if (isDestroy) {
            this.node.destroy();

            // 释放界面相关资源
            oops.res.release(viewParams.prefabPath);
        }
        else {
            this.node.removeFromParent();
        }
    }

    onDestroy() {
        // 触发窗口组件上窗口移除之后的事件
        this.applyComponentsFunction(this.node, "onRemoved", this.viewParams.params);

        // 通知外部对象窗口移除之后的事件
        // if (typeof this.viewParams.callbacks!.onRemoved === "function") {
        //     this.viewParams.callbacks!.onRemoved(this.node, this.viewParams.params);
        // }

        this.viewParams = null!;
    }

    protected applyComponentsFunction(node: Node, funName: string, params: any) {
        for (let i = 0; i < node.components.length; i++) {
            let component: any = node.components[i];
            let func = component[funName];
            if (func) {
                func.call(component, params);
            }
        }
    }
}