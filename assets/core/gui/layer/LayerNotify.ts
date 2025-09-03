/*
 * @Author: dgflash
 * @Date: 2022-08-15 10:06:47
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:44:12
 */
import { BlockInputEvents, Node, instantiate } from "cc";
import { EDITOR } from "cc/env";
import { ViewUtil } from "../../utils/ViewUtil";
import { PromptResType } from "../GuiEnum";
import { Notify } from "../prompt/Notify";
import { LayerHelper } from "./LayerHelper";

/* 滚动消息提示层 */
export class LayerNotify extends Node {
    private black!: BlockInputEvents;
    /** 等待提示资源 */
    private wait: Node = null!;
    /** 自定义弹出提示资源 */
    private notify: Node = null!;
    /** 自定义弹出提示内容资源 */
    private notifyItem: Node = null!;

    constructor(name: string) {
        super(name);
        LayerHelper.setFullScreen(this);

        this.black = this.addComponent(BlockInputEvents);
        this.black.enabled = false;
    }

    /** 打开等待提示 */
    async waitOpen() {
        if (this.wait == null) {
            // 兼容编辑器预览模式
            if (EDITOR) {
                this.wait = await ViewUtil.createPrefabNodeAsync(PromptResType.Wait);
            }
            else {
                this.wait = ViewUtil.createPrefabNode(PromptResType.Wait);
            }
        }

        if (this.wait.parent == null) {
            this.wait.parent = this;
            this.black.enabled = true;
        }
    }

    /** 关闭等待提示 */
    waitClose() {
        if (this.wait && this.wait.parent) {
            this.wait.parent = null;
            this.black.enabled = false;
        }
    }

    /**
     * 渐隐飘过提示
     * @param content 文本表示
     * @param useI18n 是否使用多语言
     */
    async toast(content: string, useI18n: boolean) {
        if (this.notify == null) {
            // 兼容编辑器预览模式
            if (EDITOR) {
                this.notify = await ViewUtil.createPrefabNodeAsync(PromptResType.Toast);
            }
            else {
                this.notify = ViewUtil.createPrefabNode(PromptResType.Toast);
            }
            this.notifyItem = this.notify.children[0];
            this.notifyItem.parent = null;
        }

        this.notify.parent = this;
        let childNode = instantiate(this.notifyItem);
        let prompt = childNode.getChildByName("prompt")!;
        let toastCom = prompt.getComponent(Notify)!;
        childNode.parent = this.notify;

        toastCom.onComplete = () => {
            if (this.notify.children.length == 0) {
                this.notify.parent = null;
            }
        };
        toastCom.toast(content, useI18n);

        // 超过3个提示，就施放第一个提示
        if (this.notify.children.length > 3) {
            this.notify.children[0].destroy();
        }
    }
}