import type { EventTouch } from 'cc';
import { Button, Component, EventHandler, _decorator, game } from 'cc';

const { ccclass, property, menu, requireComponent } = _decorator;

/**
 * 通用按钮
 * 1、防连点
 * 2、支持只触发一次
 * 
 * 注意：此组件需要配合 Button 组件使用，会自动添加 Button 组件
 */
@ccclass('UIButton')
@menu('OopsFramework/Button/UIButton （通用按钮）')
@requireComponent(Button)
export default class UIButton extends Component {
    @property({
        tooltip: '每次触发间隔（毫秒）'
    })
    private interval = 500;

    @property({
        tooltip: '是否只触发一次'
    })
    private once = false;

    /** 触摸次数 */
    private _touchCount = 0;
    /** 触摸结束时间 */
    private _touchEndTime = 0;
    /** 按钮组件引用 */
    private _button: Button | null = null;
    /** 原始触摸结束回调 */
    private _originalTouchEnded: Function | null = null;

    onLoad() {
        this._button = this.getComponent(Button);
        if (!this._button) {
            console.warn('[UIButton] 未找到 Button 组件，请确保节点上有 Button 组件');
            return;
        }

        // 保存原始回调并劫持
        // @ts-ignore
        this._originalTouchEnded = this._button._onTouchEnded;
        // @ts-ignore
        this._button._onTouchEnded = this._onTouchEnded.bind(this);
    }

    /**
     * 触摸结束事件处理
     * @param event 触摸事件
     */
    private _onTouchEnded(event: EventTouch) {
        if (!this._button) return;

        // @ts-ignore
        if (!this._button._interactable || !this._button.enabledInHierarchy) {
            return;
        }

        // @ts-ignore
        if (this._button._pressed) {
            // 是否只触发一次
            if (this.once) {
                if (this._touchCount > 0) {
                    event.propagationStopped = true;
                    return;
                }
                this._touchCount++;
            }

            // 防连点，根据设置的间隔触发一次事件
            if (this._touchEndTime && game.totalTime - this._touchEndTime < this.interval) {
                event.propagationStopped = true;
            }
            else {
                this._touchEndTime = game.totalTime;
                EventHandler.emitEvents(this._button.clickEvents, event);
                this.node.emit(Button.EventType.CLICK, this._button);
            }
        }

        // @ts-ignore
        this._button._pressed = false;
        // @ts-ignore
        this._button._updateState();

        if (event) {
            event.propagationStopped = true;
        }
    }

    onDestroy() {
        // 恢复原始回调
        if (this._button && this._originalTouchEnded) {
            // @ts-ignore
            this._button._onTouchEnded = this._originalTouchEnded;
        }
        this._button = null;
        this._originalTouchEnded = null;
    }
}
