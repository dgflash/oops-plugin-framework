/*
 * @Date: 2021-11-24 16:08:36
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:44:28
 */

import { BlockInputEvents, EventTouch, Layers, Node } from "cc";
import { ViewUtil } from "../../utils/ViewUtil";
import { PromptResType } from "../GuiEnum";
import { ViewParams } from "./Defines";
import { LayerUI } from "./LayerUI";
import { UIConfig } from "./UIConfig";

/* 弹窗层，允许同时弹出多个窗口 */
export class LayerPopUp extends LayerUI {
    /** 触摸事件阻挡 */
    protected black!: BlockInputEvents;
    /** 半透明遮罩资源 */
    protected mask!: Node;

    constructor(name: string) {
        super(name);
        
        this.layer = Layers.Enum.UI_2D;
        this.on(Node.EventType.CHILD_ADDED, this.onChildAdded, this);
        this.on(Node.EventType.CHILD_REMOVED, this.onChildRemoved, this);
    }

    private onChildAdded(child: Node) {
        if (this.mask) {
            this.mask.setSiblingIndex(this.children.length - 2);
        }
    }

    private onChildRemoved(child: Node) {
        if (this.mask) {
            this.mask.setSiblingIndex(this.children.length - 2);
        }
    }

    protected async showUi(vp: ViewParams): Promise<boolean> {
        const r = await super.showUi(vp);
        if (r) {
            // 界面加载完成显示时，启动触摸非窗口区域关闭
            this.openVacancyRemove(vp.config);

            // 界面加载完成显示时，层级事件阻挡
            this.black.enabled = true;
        }
        return r;
    }

    protected onCloseWindow(vp: ViewParams) {
        super.onCloseWindow(vp);

        // 界面关闭后，关闭触摸事件阻挡、关闭触摸非窗口区域关闭、关闭遮罩
        this.setBlackDisable();
    }

    /** 设置触摸事件阻挡 */
    protected setBlackDisable() {
        // 所有弹窗关闭后，关闭事件阻挡功能
        if (this.ui_nodes.size == 0) {
            if (this.black) this.black.enabled = false;
            this.closeVacancyRemove();
            this.closeMask();
        }
    }

    /** 关闭遮罩 */
    protected closeMask() {
        if (this.mask == null) return;

        let flag = true;
        for (let value of this.ui_nodes.values()) {
            if (value.config.mask) {
                flag = false;
                break;
            }
        }

        if (flag) {
            this.mask.parent = null;
        }
    }

    /** 启动触摸非窗口区域关闭 */
    protected openVacancyRemove(config: UIConfig) {
        // 背景半透明遮罩
        if (this.mask == null) {
            this.mask = ViewUtil.createPrefabNode(PromptResType.Mask);
            this.mask.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);

            this.black = this.mask.addComponent(BlockInputEvents);
            this.black.enabled = false;
        }

        if (config.mask) {
            this.mask.parent = this;
        }
    }

    /** 触摸非窗口区域关闭 */
    private onTouchEnd(event: EventTouch) {
        if (this.ui_nodes.size > 0) {
            let vp = this.ui_nodes.array[this.ui_nodes.size - 1];
            if (vp.valid && vp.config.vacancy) {
                this.remove(vp.config.prefab, vp.config.destroy);
            }
        }
    }

    /** 关闭触摸非窗口区域关闭 */
    protected closeVacancyRemove() {
        let flag = true;
        for (let value of this.ui_nodes.values()) {
            if (value.config.vacancy) {
                flag = false;
                break;
            }
        }

        if (flag && this.hasEventListener(Node.EventType.TOUCH_END, this.onTouchEnd, this)) {
            this.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }
    }

    clear(isDestroy: boolean) {
        super.clear(isDestroy)
        if (this.black) this.black.enabled = false;
        this.closeVacancyRemove();
        this.closeMask();
    }
}