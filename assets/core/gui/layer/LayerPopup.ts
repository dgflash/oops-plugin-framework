/*
 * @Date: 2021-11-24 16:08:36
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:44:28
 */
import { BlockInputEvents, EventTouch, Node } from "cc";
import { ViewUtil } from "../../utils/ViewUtil";
import { PromptResType } from "../GuiEnum";
import { LayerUI } from "./LayerUI";
import { UIState } from "./LayerUIElement";
import { UIConfig } from "./UIConfig";

/* 弹窗层，允许同时弹出多个窗口 */
export class LayerPopUp extends LayerUI {
    /** 触摸事件阻挡 */
    protected black!: BlockInputEvents;
    /** 半透明遮罩资源 */
    protected mask!: Node;

    protected onChildAdded(child: Node) {
        this.mask && this.mask.setSiblingIndex(this.children.length - 2);
    }

    protected onChildRemoved(child: Node) {
        this.mask && this.mask.setSiblingIndex(this.children.length - 2);
        super.onChildRemoved(child);
    }

    protected uiInit(state: UIState): Promise<boolean> {
        return new Promise(async (resolve) => {
            const r = await super.uiInit(state);
            if (r) {
                // 界面加载完成显示时，启动触摸非窗口区域关闭
                this.openVacancyRemove(state.config);

                // 界面加载完成显示时，层级事件阻挡
                this.black.enabled = true;
            }
            resolve(r);
        });
    }

    protected closeUi(state: UIState) {
        super.closeUi(state);

        // 界面关闭后，关闭触摸事件阻挡、关闭触摸非窗口区域关闭、关闭遮罩
        this.closeBlack();
    }

    /** 设置触摸事件阻挡 */
    protected closeBlack() {
        // 所有弹窗关闭后，关闭事件阻挡功能
        if (this.ui_nodes.size == 0) {
            if (this.black) this.black.enabled = false;
            this.closeVacancyRemove();
        }
        this.closeMask();
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
            if (this.ui_nodes.size == 0) {
                this.mask.uiSprite.enabled = true;
                this.mask.parent = null;
            }
            else {
                this.mask.uiSprite.enabled = false;
            }
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

        if (config.mask) this.mask.parent = this;
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

    /** 触摸非窗口区域关闭 */
    private onTouchEnd(event: EventTouch) {
        if (this.ui_nodes.size > 0) {
            let vp = this.ui_nodes.array[this.ui_nodes.size - 1];
            if (vp.valid && vp.config.vacancy) {
                this.remove(vp.config.prefab);
            }
        }
    }

    clear(isDestroy: boolean) {
        super.clear(isDestroy)
        this.closeBlack();
    }
}