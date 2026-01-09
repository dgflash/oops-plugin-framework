import { _decorator } from 'cc';
import { GameComponent } from 'db://oops-framework/module/common/GameComponent';
import { LanguageLabel } from '../language/LanguageLabel';

const { ccclass, property } = _decorator;

/** 提示窗口配置参数 */
export interface PromptConfig {
    /** 标题多语言ID */
    title?: string;
    /** 内容多语言ID */
    content: string;
    /** 确认按钮文字多语言ID */
    okWord?: string;
    /** 确认回调函数 */
    onOk?: () => void;
    /** 取消按钮文字多语言ID */
    cancelWord?: string;
    /** 取消回调函数 */
    onCancel?: () => void;
    /** 是否需要取消按钮 */
    needCancel?: boolean;
}

/**
 * 基础提示窗口
 * 1. 自定义提示标题、按钮名
 * 2. 自定义确认、取消事件回调
 * 3. 自定义提示内容
 * 4. 支持文本多语言
 */
@ccclass('PromptBase')
export class PromptBase extends GameComponent {
    /** 窗口标题多语言组件 */
    @property(LanguageLabel)
    private labTitle: LanguageLabel = null!;

    /** 提示内容多语言组件 */
    @property(LanguageLabel)
    private labContent: LanguageLabel = null!;

    /** 确认按钮文本多语言组件 */
    @property(LanguageLabel)
    private labOk: LanguageLabel = null!;

    /** 取消按钮文本多语言组件 */
    @property(LanguageLabel)
    private labCancel: LanguageLabel = null!;

    /** 窗口配置 */
    protected config: PromptConfig | null = null;

    /**
     * 窗口打开事件
     * @param params 参数配置
     */
    onAdded(params: PromptConfig): boolean {
        // 参数验证
        if (!params || !params.content) {
            console.error('[PromptBase] 缺少必要参数：content');
            return false;
        }

        this.config = params;

        // 设置标题（如果有）
        if (this.labTitle && params.title) {
            this.labTitle.dataID = params.title;
        }

        // 设置内容
        if (this.labContent) {
            this.labContent.dataID = params.content;
        }

        // 设置确认按钮文字
        if (this.labOk && params.okWord) {
            this.labOk.dataID = params.okWord;
        }

        // 设置取消按钮文字和显示状态
        if (this.labCancel) {
            if (params.cancelWord) {
                this.labCancel.dataID = params.cancelWord;
            }
            // 安全地设置取消按钮的父节点显示状态
            const parent = this.labCancel.node.parent;
            if (parent) {
                parent.active = params.needCancel || false;
            }
        }

        this.node.active = true;
        return true;
    }

    protected onLoad(): void {
        this.setButton();
    }

    /** 确认按钮点击事件 */
    private btnOk() {
        if (this.config && typeof this.config.onOk === 'function') {
            // 先保存回调引用，避免在remove过程中被清理
            const callback = this.config.onOk;
            this.remove();
            // 在窗口移除后执行回调，避免回调中的逻辑影响窗口关闭
            callback();
        } else {
            this.remove();
        }
    }

    /** 取消按钮点击事件 */
    private btnCancel() {
        if (this.config && typeof this.config.onCancel === 'function') {
            // 先保存回调引用，避免在remove过程中被清理
            const callback = this.config.onCancel;
            this.remove();
            // 在窗口移除后执行回调，避免回调中的逻辑影响窗口关闭
            callback();
        } else {
            this.remove();
        }
    }

    /** 关闭按钮点击事件 */
    private btnClose() {
        this.remove();
    }

    /** 组件销毁时的清理工作 */
    protected onDestroy() {
        // 清理配置对象，释放回调函数引用，防止内存泄漏
        if (this.config) {
            this.config.onOk = undefined;
            this.config.onCancel = undefined;
            this.config = null;
        }

        // 显式清理组件引用
        this.labTitle = null!;
        this.labContent = null!;
        this.labOk = null!;
        this.labCancel = null!;

        super.onDestroy();
    }
}
