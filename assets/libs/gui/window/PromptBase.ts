import { _decorator } from "cc";
import { GameComponent } from "db://oops-framework/module/common/GameComponent";
import { LanguageLabel } from "../language/LanguageLabel";

const { ccclass, property } = _decorator;

/** 
 * 基础提示窗口
 * 1. 自定义提示标题、按钮名
 * 2. 自定义确认、取消事件回调
 * 3. 自定义提示内容
 * 4. 支持文本多语言
 */
@ccclass("PromptBase")
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
    protected config: any = null!;

    /**
     * 窗口打开事件
     * @param params 参数 
     * {
     *     title:      标题
     *     content:    内容
     *     okWord:     ok按钮上的文字
     *     okFunc:     确认时执行的方法
     *     cancelWord: 取消按钮的文字
     *     cancelFunc: 取消时执行的方法
     *     needCancel: 是否需要取消按钮
     * }
     */
    onAdded(params: any): boolean {
        this.config = params;
        if (this.config == null) return false;

        this.labTitle.dataID = this.config.title;                                           // 窗口标题
        this.labContent.dataID = this.config.content;                                       // 提示内容
        this.labOk.dataID = this.config.okWord;                                             // 确定按钮文字
        if (this.labCancel) {
            this.labCancel.dataID = this.config.cancelWord || "";                           // 取消按钮文字
            this.labCancel.node.parent!.active = this.config.needCancel || false;
        }
        this.node.active = true;
        return true;
    }

    protected onLoad(): void {
        this.setButton();
    }

    private btnOk() {
        if (typeof this.config.onOk == "function") {
            this.config.onOk();
        }
        this.remove();
    }

    private btnCancel() {
        if (typeof this.config.onCancel == "function") {
            this.config.onCancel();
        }
        this.remove();
    }

    private btnClose() {
        this.remove();
    }

    onDestroy() {
        this.config = null!;
        super.onDestroy();
    }
}