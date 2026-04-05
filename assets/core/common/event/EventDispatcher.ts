import { EventData } from './EventData';
import { EventDataPool } from './EventDataPool';
import type { ListenerFunc, ListenerFuncTyped } from './EventMessage';
import { message } from './MessageManager';

/** 批量注册、移除全局事件对象（用于组件级事件管理） */
export class EventDispatcher {
    /** 本地事件列表，用于批量清理 */
    private events: Map<string, Array<EventData>> = new Map();

    //#region 强类型事件方法

    /**
     * 注册全局事件（强类型）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    watch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: object): void {
        this.on(event as string, listener as ListenerFunc, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除（强类型）
     * @param event     事件名（枚举）
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: object): void {
        this.once(event as string, listener as ListenerFunc, object);
    }

    /**
     * 移除全局事件（强类型）
     * @param event     事件名（枚举）
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object?: object): void {
        this.off(event as string, listener as ListenerFunc, object);
    }

    /**
     * 触发强类型事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data: OopsFramework.TypedEventMap[K]): void {
        message.emit(event, data);
    }

    /**
     * 触发强类型异步事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     */
    emitAsync<K extends keyof OopsFramework.TypedEventMap>(event: K, data: OopsFramework.TypedEventMap[K]): Promise<void> {
        return message.emitAsync(event, data);
    }

    //#endregion

    //#region 弱类型事件方法

    /**
     * 注册全局事件
     * @param event      事件名
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    on(event: string, listener: ListenerFunc, object: object): void {
        // 先注册到全局消息管理器
        message.on(event, listener, object);

        // 记录到本地事件列表，用于批量清理
        let eds = this.events.get(event);
        if (eds == null) {
            eds = [];
            this.events.set(event, eds);
        }

        const ed: EventData = EventDataPool.get();
        ed.event = event;
        ed.listener = listener;
        ed.object = object;
        eds.push(ed);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除
     * @param event     事件名
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    once(event: string, listener: ListenerFunc, object: object): void {
        message.once(event, listener, object);

        // 记录到本地事件列表
        let eds = this.events.get(event);
        if (eds == null) {
            eds = [];
            this.events.set(event, eds);
        }

        const ed: EventData = EventDataPool.get();
        ed.event = event;
        ed.listener = listener;
        ed.object = object;
        eds.push(ed);
    }

    /**
     * 移除全局事件
     * @param event     事件名
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    off(event: string, listener?: ListenerFunc, object?: object): void {
        const eds = this.events.get(event);
        if (!eds) return;

        // 如果没有指定 listener，移除该事件的所有监听器
        if (!listener) {
            for (const eb of eds) {
                message.off(event, eb.listener, eb.object);
                EventDataPool.put(eb);
            }
            this.events.delete(event);
            return;
        }

        // 移除指定的监听器
        const length = eds.length;
        for (let i = 0; i < length; i++) {
            const eb = eds[i];
            if (eb.listener == listener && eb.object == object) {
                message.off(event, eb.listener, eb.object);
                EventDataPool.put(eb);
                eds.splice(i, 1);
                break;
            }
        }

        // 如果该事件已无监听器，删除事件
        if (eds.length == 0) {
            this.events.delete(event);
        }
    }

    /**
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: any[]): void {
        message.dispatchEvent(event, ...args);
    }

    /**
     * 触发全局事件,支持同步与异步处理
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEventAsync(event: string, ...args: any[]): Promise<void> {
        return message.dispatchEventAsync(event, ...args);
    }

    //#endregion

    /** 清除所有的全局事件监听 */
    clear(): void {
        // 直接遍历 Map，避免创建临时数组
        for (const [event, eds] of this.events) {
            for (const eb of eds) {
                message.off(event, eb.listener, eb.object);
                EventDataPool.put(eb);
            }
        }
        this.events.clear();
    }
}
