import type { EventTouch } from 'cc';
import { Component, Node, _decorator, game } from 'cc';

const { ccclass, property, menu } = _decorator;

/** 节点按钮 */
@ccclass('ButtonSimple')
@menu('OopsFramework/Button/ButtonSimple （节点按钮）')
export default class ButtonSimple extends Component {
    @property({
        tooltip: '是否只触发一次'
    })
    private once = false;

    @property({
        tooltip: '每次触发间隔'
    })
    private interval = 500;

    /** 触摸次数计数 */
    private touchCount = 0;
    /** 上次触摸结束时间 */
    private touchEndTime = 0;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    /** 触摸结束 */
    protected onTouchEnd(event: EventTouch) {
        if (this.once) {
            if (this.touchCount > 0) {
                event.propagationStopped = true;
                return;
            }
            this.touchCount++;
        }

        // 防连点，根据设置的间隔触发一次事件
        if (this.touchEndTime && game.totalTime - this.touchEndTime < this.interval) {
            event.propagationStopped = true;
        }
        else {
            this.touchEndTime = game.totalTime;
            this.onClick();
        }
    }

    protected onClick(){

    }

    /** 组件销毁时的清理工作 */
    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}
