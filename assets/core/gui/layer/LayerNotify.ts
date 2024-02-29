/*
 * @Author: dgflash
 * @Date: 2022-08-15 10:06:47
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:44:12
 */
import { BlockInputEvents, Layers, Node, Widget } from "cc";
import { ViewUtil } from "../../utils/ViewUtil";
import { Notify } from "../prompt/Notify";

const ToastPrefabPath: string = 'common/prefab/notify';
const WaitPrefabPath: string = 'common/prefab/wait';

/*
 * 滚动消息提示层
 */
export class LayerNotify extends Node {
    /** 游戏运行时永久缓冲资源 */
    private wait: Node = null!;
    private black!: BlockInputEvents;

    constructor(name: string) {
        super(name);

        var widget: Widget = this.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;
        widget.alignMode = 2;
        widget.enabled = true;
        this.init();
    }

    private init() {
        this.layer = Layers.Enum.UI_2D;
        this.black = this.addComponent(BlockInputEvents);
        this.black.enabled = false;
    }

    /** 打开等待提示 */
    waitOpen() {
        if (this.wait == null) this.wait = ViewUtil.createPrefabNode(WaitPrefabPath);
        if (this.wait.parent == null) {
            this.wait.parent = this;
            this.black.enabled = true;
        }
    }

    /** 关闭等待提示 */
    waitClose() {
        if (this.wait.parent) {
            this.wait.parent = null;
            this.black.enabled = false;
        }
    }

    /**
     * 渐隐飘过提示
     * @param content 文本表示
     * @param useI18n 是否使用多语言
     */
    toast(content: string, useI18n: boolean): void {
        let childNode = ViewUtil.createPrefabNode(ToastPrefabPath)
        let toastCom = childNode.getComponent(Notify)!;
        childNode.parent = this;
        toastCom.toast(content, useI18n);
    }
}