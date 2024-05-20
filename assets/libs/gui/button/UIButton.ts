import { AudioClip, Component, Enum, EventHandler, EventTouch, Node, _decorator, game } from "cc";
import { oops } from "../../../core/Oops";

const { ccclass, property, menu } = _decorator;

enum ButtonType {
    /** 短按 */
    ClickShort,
    /** 长按 */
    ClickLong
}

/** 
 * 通用按钮
 * 1、防连点
 * 2、短按触发
 * 3、长按触发
 * 4、按钮点击触发音效 
 * 5、防连点
 */
Enum(ButtonType);
@ccclass("UIButton")
@menu('ui/button/UIButton')
export default class UIButton extends Component {
    @property
    _type: ButtonType = ButtonType.ClickShort;
    @property({
        tooltip: "按钮类型",
        type: ButtonType
    })
    get type() {
        return this._type;
    }
    set type(val) {
        this._type = val;
    }

    //#region 长按相关属性
    @property({
        tooltip: "长按时间（秒）",
        visible: function (this) {
            //@ts-ignore
            return this._type == ButtonType.ClickLong;
        }
    })
    time: number = 1;

    @property({
        type: [EventHandler],
        tooltip: "长按触发事件",
        visible: function (this) {
            //@ts-ignore
            return this._type == ButtonType.ClickLong;
        }
    })
    clickEvents: EventHandler[] = [];

    protected _passTime = 0;
    protected _isTouchLong: boolean = true;
    protected _event: EventTouch | null = null;
    //#endregion

    //#region 短按相关属性
    @property({
        tooltip: "每次触发间隔"
    })
    private interval: number = 500;

    /** 触摸次数 */
    private _touchCount = 0;
    /** 触摸结束时间 */
    private _touchEndTime = 0;
    //#endregion

    @property({
        tooltip: "是否只能触发一次"
    })
    private once: boolean = false;

    @property({
        tooltip: "触摸音效",
        type: AudioClip
    })
    private effect: AudioClip = null!;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchtStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    /** 触摸开始 */
    private onTouchtStart(event: EventTouch) {
        if (this._type == ButtonType.ClickLong) {
            this._event = event;
            this._passTime = 0;
            this._isTouchLong = false;
            this.enabled = true;
        }
    }

    /** 触摸结束 */
    private onTouchEnd(event: EventTouch) {
        // 是否只触发一次
        if (this.once) {
            if (this._touchCount > 0) {
                event.propagationStopped = true;
                return;
            }
            this._touchCount++;
        }

        if (this._type == ButtonType.ClickShort) {
            // 防连点500毫秒出发一次事件
            if (this._touchEndTime && game.totalTime - this._touchEndTime < this.interval) {
                event.propagationStopped = true;
            }
            else {
                this._touchEndTime = game.totalTime;
            }

            // 短按触摸音效
            if (this.effect) oops.audio.playEffect(this.effect);
        }
        else if (this._type == ButtonType.ClickLong) {
            if (this._passTime > this.time) {
                event.propagationStopped = true;
            }
            this._event = null;
            this._passTime = 0;
            this._isTouchLong = false;
        }
    }

    /** 引擎更新事件 */
    update(dt: number) {
        if (this._event && !this._isTouchLong) {
            this._passTime += dt;

            if (this._passTime >= this.time) {
                this._isTouchLong = true;
                this.clickEvents.forEach(event => {
                    event.emit([event.customEventData]);
                });

                this._event = null;
                this._isTouchLong = false;
                this.enabled = false;

                // 长按音效
                if (this._type == ButtonType.ClickLong && this.effect) oops.audio.playEffect(this.effect);
            }
        }
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchtStart, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        if (this.effect) oops.audio.releaseEffect(this.effect);
    }
}
