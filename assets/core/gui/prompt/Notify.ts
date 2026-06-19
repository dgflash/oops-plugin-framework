import { Animation, Component, Label, _decorator } from 'cc';
import { LanguageLabel } from '../../../libs/gui/language/LanguageLabel';

const { ccclass, property } = _decorator;

/** 滚动消息提示组件  */
@ccclass('Notify')
export class Notify extends Component {
    @property(Label)
    private lab_content: Label = null!;

    @property(Animation)
    private animation: Animation = null!;

    /** 提示动画完成 */
    onComplete: Function = null!;

    onLoad() {
        this.animation.on(Animation.EventType.FINISHED, this.onFinished, this);
    }

    private onFinished() {
        this.node.parent!.destroy();
        this.onComplete && this.onComplete();
        this.onComplete = null!;
    }

    /**
     * 显示提示
     * @param msg       文本
     * @param useI18n   设置为 true 时，使用多语言功能 msg 参数为多语言 key
     */
    toast(msg: string, useI18n: boolean) {
        const label = this.lab_content.getComponent(LanguageLabel)!;
        if (useI18n) {
            label.enabled = true;
            label.dataID = msg;
        } else {
            label.enabled = false;
            this.lab_content.string = msg;
        }
    }
}
