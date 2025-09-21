import { AudioClip, Component, EventTouch, Node, _decorator, game } from "cc";
import { oops } from "../../../core/Oops";

const { ccclass, property, menu } = _decorator;

/** 节点按钮 */
@ccclass("ButtonSimple")
@menu('OopsFramework/Button/ButtonSimple （节点按钮）')
export default class ButtonSimple extends Component {
    @property({
        tooltip: "是否只触发一次"
    })
    private once: boolean = false;

    @property({
        tooltip: "每次触发间隔"
    })
    private interval: number = 500;

    @property({
        tooltip: "触摸音效",
        type: AudioClip
    })
    private effect: AudioClip = null!;
    private touchCount = 0;
    private touchtEndTime = 0;

    private static effectPath: string = null!;
    /** 批量设置触摸音效 */
    static setBatchEffect(path: string) {
        this.effectPath = path;
    }

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

        // 防连点500毫秒出发一次事件
        if (this.touchtEndTime && game.totalTime - this.touchtEndTime < this.interval) {
            event.propagationStopped = true;
        }
        else {
            this.touchtEndTime = game.totalTime;

            // 短按触摸音效
            this.playEffect();
        }
    }

    /** 短按触摸音效 */
    protected playEffect() {
        if (ButtonSimple.effectPath) {
            oops.audio.playEffect(ButtonSimple.effectPath);
        }
        else if (this.effect) {
            oops.audio.playEffect(this.effect);
        }
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}
