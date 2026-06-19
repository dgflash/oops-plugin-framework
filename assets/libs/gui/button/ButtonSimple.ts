import type { EventTouch } from 'cc';
import { Component, Node, _decorator } from 'cc';

const { ccclass, property, menu } = _decorator;

/** 节点按钮 */
@ccclass('ButtonSimple')
@menu('OopsFramework/Button/ButtonSimple （节点按钮）')
export default class ButtonSimple extends Component {
    @property({ tooltip: '是否只触发一次' })
    private once = false;

    private touched = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    protected onTouchEnd(event: EventTouch) {
        if (this.once) {
            if (this.touched) {
                event.propagationStopped = true;
                return;
            }
            this.touched = true;
        }
    }

    onDestroy() {
        this.node.targetOff(this);
    }
}
