import type { EventKeyboard } from 'cc';
import { Input, input } from 'cc';
import { GamePartBase } from '../GamePartBase';

/** 键盘事件回调 */
export interface KeyboardCallbacks {
    onKeyDown?: (event: EventKeyboard) => void;
    onKeyUp?: (event: EventKeyboard) => void;
    onKeyPressing?: (event: EventKeyboard) => void;
}

/** 键盘输入 */
export class GamePartKeyboard extends GamePartBase {
    private _enabled = false;
    private _callbacks: KeyboardCallbacks | null = null;

    /**
     * 键盘事件开关
     * @param on         是否开启
     * @param callbacks  开启时传入对应键事件回调（可只传需要的项）
     */
    setKeyboard(on: boolean, callbacks?: KeyboardCallbacks): void {
        if (on) {
            if (callbacks) {
                this._callbacks = callbacks;
            }
            if (!this._callbacks) {
                console.warn('[OopsFramework]', 'setKeyboard(true) 需传入 callbacks');
                return;
            }
            this._register(this._callbacks);
            this._enabled = true;
        }
        else {
            if (this._enabled && this._callbacks) {
                this._unregister(this._callbacks);
            }
            this._enabled = false;
            this._callbacks = null;
        }
    }

    /** 销毁键盘模块 */
    override destroy(): void {
        if (this._enabled && this._callbacks) {
            this._unregister(this._callbacks);
            this._enabled = false;
            this._callbacks = null;
        }
    }

    /** 注册键盘事件
     * @param callbacks 键盘事件回调
     */
    private _register(callbacks: KeyboardCallbacks): void {
        if (callbacks.onKeyDown) {
            input.on(Input.EventType.KEY_DOWN, callbacks.onKeyDown, this.comp);
        }
        if (callbacks.onKeyUp) {
            input.on(Input.EventType.KEY_UP, callbacks.onKeyUp, this.comp);
        }
        if (callbacks.onKeyPressing) {
            input.on(Input.EventType.KEY_PRESSING, callbacks.onKeyPressing, this.comp);
        }
    }

    /** 注销键盘事件
     * @param callbacks 键盘事件回调
     */
    private _unregister(callbacks: KeyboardCallbacks): void {
        if (callbacks.onKeyDown) {
            input.off(Input.EventType.KEY_DOWN, callbacks.onKeyDown, this.comp);
        }
        if (callbacks.onKeyUp) {
            input.off(Input.EventType.KEY_UP, callbacks.onKeyUp, this.comp);
        }
        if (callbacks.onKeyPressing) {
            input.off(Input.EventType.KEY_PRESSING, callbacks.onKeyPressing, this.comp);
        }
    }
}
