import { BlockInputEvents, Node, instantiate } from 'cc';
import { ViewUtil } from '../../utils/ViewUtil';
import { GuiPromptConfig } from '../GuiPromptConfig';
import { Notify } from '../prompt/Notify';
import { LayerHelper } from './LayerHelper';

/* 滚动消息提示层 */
export class LayerNotify extends Node {
    private black!: BlockInputEvents;
    /** 等待提示资源 */
    private wait: Node = null!;
    /** 自定义弹出提示资源 */
    private notify: Node = null!;
    /** 自定义弹出提示内容资源 */
    private notifyItem: Node = null!;
    /** 最后一次请求是开还是关（开关不计数，以最后一次为准） */
    private waitWanted: boolean = false;
    /** 等待提示预制的创建过程；所有并发的 waitOpen 共用这一次 */
    private waitCreating: Promise<void> | null = null;

    constructor(name: string) {
        super(name);
        LayerHelper.setFullScreen(this);

        this.black = this.addComponent(BlockInputEvents);
        this.black.enabled = false;
    }

    /**
     * 打开等待提示
     *
     * 预制第一次用时要异步创建，期间可能又来几次开 / 关：创建只做一次，建好后按最后一次请求显示或隐藏。
     * 切到后台时引擎的资源加载回调（走 rAF）全停，几个界面的加载超时定时器却照样触发，
     * 回前台后开、关、创建完成的先后是乱的 —— 之前每次开各建一份、「建好前被关过」只记一个标记，
     * 第二份建好时标记已被第一份用掉，转圈连同挡输入就一直留在屏幕上。
     */
    async waitOpen() {
        this.waitWanted = true;
        if (this.wait == null) {
            this.waitCreating ??= ViewUtil.createPrefabNodeAsync(GuiPromptConfig.Wait.path).then(node => {
                this.wait = node;
            }).finally(() => {
                this.waitCreating = null;
            });
            await this.waitCreating;
        }
        this.applyWait();
    }

    /** 关闭等待提示 */
    waitClose() {
        this.waitWanted = false;
        this.applyWait();
    }

    /** 按最后一次请求显示或隐藏等待提示（预制还没建好就等建好后再来） */
    private applyWait() {
        if (this.wait == null) return;
        if (this.waitWanted) {
            if (this.wait.parent == null) this.wait.parent = this;
        }
        else if (this.wait.parent) {
            this.wait.parent = null;
        }
        this.black.enabled = this.waitWanted;
    }

    /**
     * 渐隐飘过提示
     * @param content 文本表示
     * @param useI18n 是否使用多语言
     */
    async toast(content: string, useI18n: boolean) {
        if (this.notify == null) {
            this.notify = await ViewUtil.createPrefabNodeAsync(
                GuiPromptConfig.Notify.path
            );
            this.notifyItem = this.notify.children[0];
            this.notifyItem.parent = null;
        }

        this.notify.parent = this;
        const item = instantiate(this.notifyItem);
        const prompt = item.getChildByName('prompt')!;
        const notify = prompt.getComponent(Notify)!;
        item.parent = this.notify;

        notify.onComplete = () => {
            if (this.notify.children.length <= 1) {
                this.notify.parent = null;
            }
        };
        notify.toast(content, useI18n);

        // 超过3个提示，就释放第一个提示
        if (this.notify.children.length > 3) {
            this.notify.children[0].destroy();
        }
    }

    /** 销毁时释放资源 */
    onDestroy() {
        // 清理等待提示节点
        if (this.wait) {
            this.wait.destroy();
            this.wait = null!;
        }

        // 清理通知提示节点
        if (this.notify) {
            this.notify.destroy();
            this.notify = null!;
        }

        // 清理通知项模板节点
        if (this.notifyItem) {
            this.notifyItem.destroy();
            this.notifyItem = null!;
        }

        // 清理事件阻挡组件
        this.black = null!;
    }
}
