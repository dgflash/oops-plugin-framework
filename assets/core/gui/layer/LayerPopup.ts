/*
 * @Date: 2021-11-24 16:08:36
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 13:44:28
 */

import { BlockInputEvents, EventTouch, Layers, Node } from "cc";
import { ViewUtil } from "../../utils/ViewUtil";
import { ViewParams } from "./Defines";
import { UIConfig } from "./LayerManager";
import { LayerUI } from "./LayerUI";

const Mask: string = 'common/prefab/mask';

/* 弹窗层，允许同时弹出多个窗口 */
export class LayerPopUp extends LayerUI {
    /** 触摸事件阻挡 */
    protected black!: BlockInputEvents;
    /** 半透明遮罩资源 */
    protected mask!: Node;

    constructor(name: string) {
        super(name);
        this.init();
    }

    private init() {
        this.layer = Layers.Enum.UI_2D;
        this.black = this.addComponent(BlockInputEvents);
        this.black.enabled = false;
    }

    protected async showUi(vp: ViewParams) {
        await super.showUi(vp);

        // 界面加载完成显示时，启动触摸非窗口区域关闭
        this.openVacancyRemove(vp.config);

        // 界面加载完成显示时，层级事件阻挡
        this.black.enabled = true;
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
            this.black.enabled = false;
        }
        this.closeVacancyRemove();
        this.closeMask();
    }

    /** 关闭遮罩 */
    protected closeMask() {
        var flag = true;
        for (var value of this.ui_nodes.values()) {
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
        if (!this.hasEventListener(Node.EventType.TOUCH_END, this.onTouchEnd, this)) {
            this.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }

        // 背景半透明遮罩
        if (this.mask == null) {
            this.mask = ViewUtil.createPrefabNode(Mask);
        }
        if (config.mask) {
            this.mask.parent = this;
            this.mask.setSiblingIndex(0);
        }
    }

    /** 关闭触摸非窗口区域关闭 */
    protected closeVacancyRemove() {
        var flag = true;
        for (var value of this.ui_nodes.values()) {
            if (value.config.vacancy) {
                flag = false;
                break;
            }
        }

        if (flag && this.hasEventListener(Node.EventType.TOUCH_END, this.onTouchEnd, this)) {
            this.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }
    }

    private onTouchEnd(event: EventTouch) {
        if (event.target === this) {
            this.ui_nodes.forEach(vp => {
                // 关闭已显示的界面
                if (vp.valid && vp.config.vacancy) {
                    this.remove(vp.config.prefab, vp.config.destroy);
                }
            });
        }
    }

    clear(isDestroy: boolean) {
        super.clear(isDestroy)
        this.black.enabled = false;
        this.active = false;
        this.closeVacancyRemove();
        this.closeMask();
    }
}