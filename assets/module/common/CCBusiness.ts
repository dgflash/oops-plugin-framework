import type { ListenerFunc, ListenerFuncTyped } from '../../core/common/event/EventMessage';
import { GamePartEvent } from './part/GamePartEvent';
import { GamePartRegistry, GamePartKey, createPart } from './GamePartRegistry';
import type { CCEntity } from './CCEntity';

/** 业务逻辑 */
export class CCBusiness<T extends CCEntity> {
    private _ent: T | null = null;

    /** 所属实体引用 */
    get ent(): T {
        return this._ent!;
    }

    set ent(value: T) {
        this._ent = value;
    }

    private _parts: GamePartRegistry | null = null;

    /** 获取模块注册表（懒加载） */
    private get parts(): GamePartRegistry {
        return (this._parts ??= createPart(this));
    }

    /** 获取事件模块 */
    get event(): GamePartEvent {
        return this.parts.get(GamePartKey.Event);
    }

    /** 业务逻辑初始化（由 CCEntity.addBusiness 自动调用） */
    protected init() {

    }

    destroy() {
        // 销毁所有模块
        if (this._parts) {
            this._parts.destroy();
            this._parts = null;
        }

        // 清空实体引用，避免循环引用导致的内存泄漏
        this._ent = null;
    }

    //#region ========== 兼容旧版本 API 如果是新项目可以把注释包起来的代码都删除 ==========

    /**
     * 注册全局事件（强类型）
     * @param event       事件名（枚举）
     * @param listener    处理事件的侦听器函数
     * @param object      侦听函数绑定的this对象
     */
    watch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.watch(event, listener, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除（强类型）
     * @param event     事件名（枚举）
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的this对象
     */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.watchOnce(event, listener, object);
    }

    /**
     * 移除全局事件（强类型）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数（可选）
     * @param object     侦听函数绑定的this对象（可选）
     */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object?: any): void {
        this.event.unwatch(event, listener, object);
    }

    /**
     * 触发强类型全局事件
     * @param event      事件名（枚举）
     * @param data       事件数据
     */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data?: OopsFramework.TypedEventMap[K]): void {
        this.event.emit(event, data);
    }

    /**
     * 触发强类型异步全局事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     */
    emitAsync<K extends keyof OopsFramework.TypedEventMap>(event: K, data: OopsFramework.TypedEventMap[K]): Promise<void> {
        return this.event.emitAsync(event, data);
    }

    /**
     * 注册全局事件
     * @param event       事件名
     * @param listener    处理事件的侦听器函数
     * @param object      侦听函数绑定的this对象
     */
    on(event: string, listener: ListenerFunc, object: object) {
        this.event.on(event, listener, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除
     * @param event     事件名
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的this对象
     */
    once(event: string, listener: ListenerFunc, object: object) {
        this.event.once(event, listener, object);
    }

    /**
     * 移除全局事件
     * @param event      事件名
     * @param listener   处理事件的侦听器函数（可选）
     * @param object     侦听函数绑定的this对象（可选）
     */
    off(event: string, listener?: ListenerFunc, object?: object) {
        this.event.off(event, listener, object);
    }

    /**
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: unknown[]) {
        this.event.dispatchEvent(event, ...args);
    }

    /**
     * 触发全局事件,支持同步与异步处理
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEventAsync(event: string, ...args: unknown[]): Promise<void> {
        return this.event.dispatchEventAsync(event, ...args);
    }

    /**
     * 批量设置全局事件
     * @example
     *  this.setEvent("onGlobal");
     *  this.dispatchEvent("onGlobal", "全局事件");
     *
     *  onGlobal(event: string, args: unknown) { console.log(args) };
     */
    protected setEvent(...args: string[]) {
        this.event.setEvent(...args);
    }

    //#endregion
}
