/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-09 11:55:03
 */
import { Component, Node, _decorator } from "cc";
import { oops } from "../../Oops";
import { UIConfig } from "./UIConfig";

const EventOnAdded: string = "onAdded";
const EventOnBeforeRemove: string = "onBeforeRemove";
const EventOnRemoved: string = "onRemoved";

const { ccclass } = _decorator;

/** 窗口元素组件 */
@ccclass('LayerUIElement')
export class LayerUIElement extends Component {
    /** 视图参数 */
    state: UIState = null!;
    /** 关闭窗口之前 */
    onClose: Function = null!;

    /** 添加界面且界面设置到父节点之前 */
    add(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            // 触发窗口组件上添加到父节点后的事件
            for (let i = 0; i < this.node.components.length; i++) {
                const component: any = this.node.components[i];
                const func = component[EventOnAdded];
                if (func) {
                    if (await func.call(component, this.state.params.data) == false) {
                        resolve(false);
                        return;
                    }
                }
            }

            // 触发外部窗口显示前的事件（辅助实现自定义动画逻辑）
            if (typeof this.state.params.onAdded === "function") {
                this.state.params.onAdded(this.node, this.state.params.data);
            }

            resolve(true);
        });
    }

    /** 删除节点，该方法只能调用一次，将会触发onBeforeRemoved回调 */
    remove(isDestroy: boolean) {
        if (this.state.valid) {
            // 触发窗口移除舞台之前事件
            this.applyComponentsFunction(this.node, EventOnBeforeRemove, this.state.params.data);

            //  通知外部对象窗口组件上移除之前的事件（关闭窗口前的关闭动画处理）
            if (typeof this.state.params.onBeforeRemove === "function") {
                this.state.params.onBeforeRemove(this.node, this.onBeforeRemoveNext.bind(this, isDestroy));
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
    private onBeforeRemoveNext(isDestroy: boolean) {
        this.state.valid = false;

        if (this.state.params && typeof this.state.params.onRemoved === "function") {
            this.state.params.onRemoved(this.node, this.state.params.data);
        }

        // 关闭动画播放完后，界面移除舞台事件
        this.onClose && this.onClose();

        if (isDestroy) {
            // 释放界面显示对象
            this.node.destroy();

            // 释放界面相关资源
            oops.res.release(this.state.config.prefab, this.state.config.bundle);

            // oops.log.logView(`【界面管理】释放【${uip.config.prefab}】界面资源`);
        }
        else {
            this.node.removeFromParent();
        }

        // 触发窗口组件上窗口移除之后的事件
        this.applyComponentsFunction(this.node, EventOnRemoved, this.state.params.data);
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
        this.state = null!;
        this.onClose = null!;
    }
}

/** 本类型仅供gui模块内部使用，请勿在功能逻辑中使用 */
export class UIState {
    /** 界面唯一编号 */
    uiid: string = null!;
    /** 界面配置 */
    config: UIConfig = null!;
    /** 窗口事件 */
    params: UIParam = null!;
    /** 是否在使用状态 */
    valid: boolean = true;
    /** 界面根节点 */
    node: Node = null!;
}

/*** 界面打开参数 */
export interface UIParam {
    /** 自定义传递参数 */
    data?: any;

    /** 是否开启预加载（默认不开启 - 开启后加载完不显示界面） */
    preload?: boolean;

    /**
     * 节点添加到层级以后的回调
     * @param node   当前界面节点
     * @param params 外部传递参数
     */
    onAdded?: (node: Node, params: any) => void,

    /** 
     * 如果指定onBeforeRemoved，则next必须调用，否则节点不会被正常删除。
     * 
     * 比如希望节点做一个FadeOut然后删除，则可以在`onBeforeRemoved`当中播放action动画，动画结束后调用next
     * @param node   当前界面节点
     * @param next   回调方法
     */
    onBeforeRemove?: (node: Node, next: Function) => void,

    /**
     * 窗口节点 destroy 之后回调
     * @param node   当前界面节点
     * @param params 外部传递参数
     */
    onRemoved?: (node: Node, params: any) => void
}