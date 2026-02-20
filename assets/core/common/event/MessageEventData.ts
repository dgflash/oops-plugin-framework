import type { ListenerFunc } from './EventMessage';
import type { TypedEventMap } from './MessageManager';
import { EventData } from './EventData';
import { EventDataPool } from './EventDataPool';
import { message } from './MessageManager';

/** 批量注册、移除全局事件对象（用于组件级事件管理） */
export class MessageEventData {
    /** 本地事件列表，用于批量清理 */
    private events: Map<string, Array<EventData>> = new Map();

    /**
     * 注册全局事件（强类型重载）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    on<K extends keyof TypedEventMap>(event: K, listener: (event: K, data: TypedEventMap[K]) => void, object: object): void;

    /**
     * 注册全局事件（兼容旧用法）
     * @param event      事件名
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    on(event: string, listener: ListenerFunc, object: object): void;

    /**
     * 注册全局事件（实现）
     */
    on(event: string, listener: ListenerFunc, object: object) {
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
    * 移除全局事件（强类型重载）
     * @param event     事件名（枚举）
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    off<K extends keyof TypedEventMap>(event: K, listener?: (event: K, data: TypedEventMap[K]) => void, object?: object): void;

    /**
    * 移除全局事件（兼容旧用法）
     * @param event     事件名
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    off(event: string, listener?: ListenerFunc, object?: object): void;

    /**
    * 移除全局事件（实现）
     */
    off(event: string, listener?: ListenerFunc, object?: object) {
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
     * 触发全局事件（强类型重载）
     * @param event      事件名（枚举）
     * @param data       事件数据
     */
    dispatchEvent<K extends keyof TypedEventMap>(event: K, data: TypedEventMap[K]): void;

    /**
     * 触发全局事件（兼容旧用法）
     * @param event      事件名
     * @param args       事件参数
     */

    dispatchEvent(event: string, ...args: any[]): void;

    /**
     * 触发全局事件（实现）
     */

    dispatchEvent(event: string, ...args: any[]) {
        message.dispatchEvent(event, ...args);
    }

    /** 清除所有的全局事件监听 */
    clear() {
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
