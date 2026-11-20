import type { EventTouch } from 'cc';
import { BlockInputEvents, Node } from 'cc';
import { ViewUtil } from '../../utils/ViewUtil';
import { LayerUI } from './LayerUI';
import type { UIState } from './LayerUIElement';
import { LayerUIElement } from './LayerUIElement';
import type { UIConfig } from './UIConfig';
import { GuiPromptConfig } from '../GuiPromptConfig';

/* 弹窗层，允许同时弹出多个窗口 */
export class LayerPopUp extends LayerUI {
    /** 触摸事件阻挡 */
    protected black!: BlockInputEvents;
    /** 半透明遮罩资源 */
    protected mask!: Node;
    /** 同一层的并发开窗共用一次遮罩加载，避免建出多个遮罩、只有最后一个被登记 */
    private maskLoading: Promise<void> | null = null;
    /** 层已销毁：还在路上的遮罩加载回来后直接释放 */
    private disposed = false;

    protected onChildAdded(child: Node) {
        super.onChildAdded(child);
        this.arrangeMask();
    }

    protected onChildRemoved(child: Node) {
        this.arrangeMask();
        super.onChildRemoved(child);
    }

    /** 遮罩贴在最上面那一窗的正下方 */
    private arrangeMask() {
        if (!this.mask?.parent) return;
        // 只认本层开的窗（带 LayerUIElement）：别处挂进来的节点不算窗，遮罩不能跟着它跑到窗上面挡住点击
        const windows = this.children.filter(c => c !== this.mask && !!c.getComponent(LayerUIElement));
        const top = windows[windows.length - 1];
        if (top) {
            const at = top.getSiblingIndex();
            this.mask.setSiblingIndex(this.mask.getSiblingIndex() < at ? at - 1 : at);
        }
        else {
            this.mask.setSiblingIndex(this.children.length - 2);
        }
    }

    protected async uiInit(state: UIState): Promise<boolean> {
        const ready = await super.uiInit(state);
        if (!ready || !state.valid || this.disposed) return false;
        try {
            // 界面加载完成显示时，启动触摸非窗口区域关闭
            await this.openVacancyRemove(state.config);
        }
        catch (error) {
            state.valid = false;
            this.failure(state);
            throw error;
        }
        // 遮罩加载期间窗口可能已被关闭，不能在异步返回后重新阻挡输入
        if (this.disposed || !state.valid || this.ui_nodes.get(state.config.prefab) !== state) {
            this.closeBlack();
            return false;
        }
        // 界面加载完成显示时，层级事件阻挡
        this.black.enabled = true;
        return true;
    }

    protected closeUi(state: UIState) {
        super.closeUi(state);

        // 界面关闭后，关闭触摸事件阻挡、关闭触摸非窗口区域关闭、关闭遮罩
        this.closeBlack();
    }

    /** 检查是否存在需要 mask 的窗口 */
    private hasMaskWindow(): boolean {
        for (const value of this.ui_nodes.values()) {
            if (value.config.mask) {
                return true;
            }
        }
        return false;
    }

    /** 检查是否存在需要 vacancy 的窗口 */
    private hasVacancyWindow(): boolean {
        for (const value of this.ui_nodes.values()) {
            if (value.config.vacancy) {
                return true;
            }
        }
        return false;
    }

    /** 设置触摸事件阻挡 */
    protected closeBlack() {
        // 检查是否还需要阻挡输入（mask 或 vacancy）
        const needsBlocking = this.hasMaskWindow() || this.hasVacancyWindow();

        if (!needsBlocking) {
            if (this.black) this.black.enabled = false;
            this.closeVacancyRemove();
        }

        this.closeMask();
    }

    /** 关闭遮罩 */
    protected closeMask() {
        if (this.mask == null) return;

        // 如果不存在需要 mask 的窗口，则完全移除 mask
        if (!this.hasMaskWindow()) {
            this.mask.uiSprite.enabled = false;
            this.mask.parent = null;
        }
    }

    /** 启动触摸非窗口区域关闭 */
    protected async openVacancyRemove(config: UIConfig) {
        if (this.disposed) return;
        // 背景半透明遮罩（各窗口共用一份）
        if (this.mask == null) {
            if (!this.maskLoading) this.maskLoading = this.loadMask();
            await this.maskLoading;
        }

        // 遮罩加载期间要遮罩的窗可能都关了，这时不再挂上
        if (!this.disposed && config.mask && this.hasMaskWindow()) {
            this.mask.parent = this;
            this.mask.uiSprite.enabled = true;
        }
    }

    /** 加载遮罩预制；层已销毁就当场释放 */
    private async loadMask(): Promise<void> {
        try {
            const mask = await ViewUtil.createPrefabNodeAsync(GuiPromptConfig.Mask.path);
            if (!mask) throw new Error(`遮罩预制【${GuiPromptConfig.Mask.path}】加载失败`);
            if (this.disposed) {
                mask.destroy();
                return;
            }
            this.mask = mask;
            mask.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.black = mask.addComponent(BlockInputEvents);
            this.black.enabled = false;
        }
        finally {
            this.maskLoading = null;
        }
    }

    /** 关闭触摸非窗口区域关闭 */
    protected closeVacancyRemove() {
        if (!this.hasVacancyWindow() && this.hasEventListener(Node.EventType.TOUCH_END, this.onTouchEnd, this)) {
            this.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }
    }

    /** 触摸非窗口区域关闭 */
    private onTouchEnd(event: EventTouch) {
        if (this.ui_nodes.size > 0) {
            const vp = this.ui_nodes.array[this.ui_nodes.size - 1];
            if (vp.valid && vp.config.vacancy) {
                this.remove(vp.config.prefab);
            }
        }
    }

    clear(isDestroy: boolean) {
        super.clear(isDestroy);
        this.closeBlack();
    }

    /** 销毁时释放资源 */
    onDestroy() {
        this.disposed = true;
        for (const state of this.ui_nodes.values()) state.valid = false;
        this.ui_nodes.clear();

        // 清理遮罩节点
        if (this.mask) {
            this.mask.destroy();
            this.mask = null!;
        }

        // 清理事件阻挡组件引用
        this.black = null!;
    }
}
