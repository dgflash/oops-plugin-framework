import { EventDispatcher } from '../../../core/common/event/EventDispatcher';
import { EventMessage, type ListenerFunc, type ListenerFuncTyped } from '../../../core/common/event/EventMessage';
import { GamePartBase } from '../GamePartBase';

/** 全局事件管理（含游戏前后台、画布、全屏、旋转等生命周期） */
export class GamePartEvent extends GamePartBase {
    private _event: EventDispatcher | null = null;

    /** 获取事件分发器 */
    private get event(): EventDispatcher {
        if (this._event == null) {
            this._event = new EventDispatcher();
        }
        return this._event;
    }

    /** 监听事件
     * @param event 事件类型
     * @param listener 监听回调
     * @param object 监听对象
     */
    watch<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>,
        object: object
    ): void {
        this.event.on(event as string, listener as ListenerFunc, object);
    }

    /** 监听事件（只触发一次）
     * @param event 事件类型
     * @param listener 监听回调
     * @param object 监听对象
     */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>,
        object: object
    ): void {
        this.event.once(event as string, listener as ListenerFunc, object);
    }

    /** 取消监听事件
     * @param event 事件类型
     * @param listener 监听回调
     * @param object 监听对象
     */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>,
        object?: object
    ): void {
        this.event.off(event as string, listener as ListenerFunc, object);
    }

    /** 触发事件
     * @param event 事件类型
     * @param data 事件数据
     */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data?: OopsFramework.TypedEventMap[K]): void {
        this.event.emit(event, data);
    }

    /** 异步触发事件
     * @param event 事件类型
     * @param data 事件数据
     */
    emitAsync<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        data?: OopsFramework.TypedEventMap[K]
    ): Promise<void> {
        return this.event.emitAsync(event, data);
    }

    /** 监听事件
     * @param event 事件名称
     * @param listener 监听回调
     * @param object 监听对象
     */
    on(event: string, listener: ListenerFunc, object: object): void {
        this.event.on(event, listener, object);
    }

    /** 监听事件（只触发一次）
     * @param event 事件名称
     * @param listener 监听回调
     * @param object 监听对象
     */
    once(event: string, listener: ListenerFunc, object: object): void {
        this.event.once(event, listener, object);
    }

    /** 取消监听事件
     * @param event 事件名称
     * @param listener 监听回调
     * @param object 监听对象
     */
    off(event: string, listener?: ListenerFunc, object?: object): void {
        this.event.off(event, listener, object);
    }

    /** 分发事件
     * @param event 事件名称
     * @param args 事件参数
     */
    dispatchEvent(event: string, ...args: any[]): void {
        this.event.dispatchEvent(event, ...args);
    }

    /** 异步分发事件
     * @param event 事件名称
     * @param args 事件参数
     */
    dispatchEventAsync(event: string, ...args: any[]): Promise<void> {
        return this.event.dispatchEventAsync(event, ...args);
    }

    /**
     * 批量设置全局事件（按组件上的方法名绑定）
     * @example
     * this.event.setEvent('onGlobal');
     * onGlobal(event: string, args: any) { console.log(args); }
     */
    setEvent(...args: string[]): void {
        const self: any = this.comp;
        for (const name of args) {
            const func = self[name];
            if (func) {
                this.on(name, func, this.comp);
            }
            else {
                console.error(`名为【${name}】的全局事方法不存在`);
            }
        }
    }

    /** 设置游戏显示回调
     * @param callback 回调函数
     */
    setGameShow(callback: () => void): void {
        this.on(EventMessage.GAME_SHOW, callback, this.comp);
    }

    /** 设置游戏隐藏回调
     * @param callback 回调函数
     */
    setGameHide(callback: () => void): void {
        this.on(EventMessage.GAME_HIDE, callback, this.comp);
    }

    /** 设置游戏尺寸变化回调
     * @param callback 回调函数
     */
    setGameResize(callback: () => void): void {
        this.on(EventMessage.GAME_RESIZE, callback, this.comp);
    }

    /** 设置游戏全屏回调
     * @param callback 回调函数
     */
    setGameFullScreen(callback: () => void): void {
        this.on(EventMessage.GAME_FULL_SCREEN, callback, this.comp);
    }

    /** 设置游戏方向变化回调
     * @param callback 回调函数
     */
    setGameOrientation(callback: () => void): void {
        this.on(EventMessage.GAME_ORIENTATION, callback, this.comp);
    }

    /** 销毁事件模块 */
    override destroy(): void {
        if (this._event) {
            this._event.clear();
            this._event = null;
        }
    }
}
