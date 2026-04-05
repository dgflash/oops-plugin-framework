/*
 * @Author: dgflash
 * @Date: 2025-09-18 10:20:51
 * @LastEditors: dgflash
 * @LastEditTime: 2025-09-18 17:20:51
 */

import { EventDispatcher } from '../../core/common/event/EventDispatcher';
import type { ListenerFunc, ListenerFuncTyped } from '../../core/common/event/EventMessage';
import type { CCEntity } from './CCEntity';

/** 业务逻辑 */
export class CCBusiness<T extends CCEntity> {
    ent!: T;

    /** 业务逻辑初始化（由 CCEntity.addBusiness 自动调用） */
    protected init() {

    }

    destroy() {
        // 释放消息对象
        if (this._event) {
            this._event.clear();
            this._event = null;
        }

        // 清空实体引用，避免循环引用导致的内存泄漏
        this.ent = null!;
    }

    //#region 全局事件管理

    private _event: EventDispatcher | null = null;
    /** 全局事件管理器 */
    private get event(): EventDispatcher {
        if (this._event == null) this._event = new EventDispatcher();
        return this._event;
    }

    //#region 强类型事件方法

    /**
     * 注册全局事件（强类型）
     * @param event       事件名（枚举）
     * @param listener    处理事件的侦听器函数
     * @param object      侦听函数绑定的this对象
     */
    watch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.on(event as string, listener as ListenerFunc, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除（强类型）
     * @param event     事件名（枚举）
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的this对象
     */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.once(event as string, listener as ListenerFunc, object);
    }

    /**
     * 移除全局事件（强类型）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数（可选）
     * @param object     侦听函数绑定的this对象（可选）
     */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object?: any): void {
        this.event.off(event as string, listener as ListenerFunc, object);
    }

    /**
     * 触发强类型全局事件
     * @param event      事件名（枚举）
     * @param data       事件数据
     */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data: OopsFramework.TypedEventMap[K]): void {
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

    //#endregion

    //#region 弱类型事件方法

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
        for (const name of args) {
            const func = (this as Record<string, unknown>)[name];
            if (typeof func === 'function') {
                this.on(name, func as ListenerFunc, this);
            }
            else {
                console.error(`名为【${name}】的全局事方法不存在`);
            }
        }
    }

    //#endregion

    //#endregion
}
