/*
 * @Author: dgflash
 * @Date: 2021-11-18 11:21:32
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:37:03
 */
import { Node } from "cc";

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
     * 注意：调用`delete`或`$delete`才会触发此回调，如果`this.node.destroy()`，该回调将直接忽略。
     * 
     * 如果指定onBeforeRemoved，则next必须调用，否则节点不会被正常删除。
     * 
     * 比如希望节点做一个FadeOut然后删除，则可以在`onBeforeRemoved`当中播放action动画，动画结束后调用next
     * @param node   当前界面节点
     * @param next   回调方法
     */
    onBeforeRemove?: (node: Node, next: Function) => void
}

/** 弹框层回调对象定义 */
export interface PopViewParams extends UICallbacks {
    /** 是否触摸背景关闭弹窗 */
    touchClose?: boolean,

    /** 控制暗色背景的透明度 默认为190*/
    opacity?: number;
}

/** 本类型仅供gui模块内部使用，请勿在功能逻辑中使用 */
export class ViewParams {
    /** 界面唯一标识 */
    uuid!: string;
    /** 预制路径 */
    prefabPath!: string;
    /** 传递给打开界面的参数 */
    params: any | null;
    /** 窗口事件 */
    callbacks!: UICallbacks | null;
    /** 是否在使用状态 */
    valid: boolean = true;
    /** 界面根节点 */
    node: Node | null = null;;
}