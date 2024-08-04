/*
 * @Author: dgflash
 * @Date: 2022-08-15 10:06:47
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:44:12
 */
import { BlockInputEvents, Layers, Node, Widget, find, instantiate } from "cc";
import { ViewUtil } from "../../utils/ViewUtil";
import { Notify } from "../prompt/Notify";

const ToastPrefabPath: string = 'common/prefab/notify';
const WaitPrefabPath: string = 'common/prefab/wait';

/*
 * 滚动消息提示层
 */
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
    toast(content: string, useI18n: boolean): void {
        try {
            if (this.notify == null) {
                this.notify = ViewUtil.createPrefabNode(ToastPrefabPath);
                this.notifyItem = find("item", this.notify)!;
                this.notifyItem.parent = null;
            }

            this.notify.parent = this;
            let childNode = instantiate(this.notifyItem);
            let toastCom = childNode.getChildByName("prompt")!.getComponent(Notify)!;
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
        catch {
            console.error("从oops-game-kit项目中拷贝 assets/bundle/common/prefab/notify.prefab 与 assets/bundle/common/anim/notify.anim 覆盖到本项目中");
        }
    }
}