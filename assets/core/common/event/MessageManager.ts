import { log, warn } from 'cc';
import type { ListenerFunc } from './EventMessage';
import { EventData } from './EventData';
import { EventDataPool } from './EventDataPool';

/**
 * 全局事件类型映射接口
 * 业务层可以通过 declare module 扩展此接口来定义强类型事件
 *
 * @example
 * // 在业务代码中扩展
 * declare module 'db://oops-framework/core/common/event/MessageManager' {
 *     interface TypedEventMap {
 *         [YourEvent.SomeEvent]: { data: string };
 *     }
 * }
 */

export interface TypedEventMap {
    // 业务层通过 declare module 扩展此接口
}

/**
 * 全局消息管理
 *
 * @性能优化说明
 * 1. 使用对象池管理 EventData 对象，减少 GC 压力
 * 2. 重复注册检测，避免同一监听器被多次添加
 * 3. Map 数据结构，提供 O(1) 的事件查找性能
 * 4. 支持精确移除单个监听器，避免误删
 *
 * @内存管理注意事项
 * ⚠️ 重要：组件销毁时必须调用 off() 移除事件监听，否则会导致内存泄漏
 * ⚠️ 建议：在 onDestroy() 或 destroy() 中移除所有注册的事件
 *
 * @强类型事件说明
 * - 使用 emit() 和 emitAsync() 方法可获得编译时的强类型约束
 * - 使用 dispatchEvent() 和 dispatchEventAsync() 兼容旧代码
 *
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037894&doc_id=2873565
 */
export class MessageManager {
    private events: Map<string, Array<EventData>> = new Map();

    /**
     * 注册全局事件（强类型）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    on<K extends keyof TypedEventMap>(
        event: K,
        listener: (event: K, data: TypedEventMap[K]) => void,
        object: object
    ): void;

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
    on(event: string, listener: ListenerFunc, object: object): void {
        if (!event || !listener) {
            warn(`注册【${event}】事件的侦听器函数为空`);
            return;
        }

        let eds = this.events.get(event);
        if (eds == null) {
            eds = [];
            this.events.set(event, eds);
        }

        // 检查重复注册，如果已存在则直接返回，避免重复添加
        const length = eds.length;
        for (let i = 0; i < length; i++) {
            const bin = eds[i];
            if (bin.listener == listener && bin.object == object) {
                warn(`名为【${event}】的事件重复注册侦听器`);
                return;
            }
        }

        // 从对象池获取 EventData 对象
        const data: EventData = EventDataPool.get();
        data.event = event;
        data.listener = listener;
        data.object = object;
        eds.push(data);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除（强类型）
     * @param event     事件名（枚举）
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    once<K extends keyof TypedEventMap>(
        event: K,
        listener: (event: K, data: TypedEventMap[K]) => void,
        object: object
    ): void;

    /**
     * 监听一次事件，事件响应后，该监听自动移除（兼容旧用法）
     * @param event     事件名
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    once(event: string, listener: ListenerFunc, object: object): void;

    /**
     * 监听一次事件，事件响应后，该监听自动移除（实现）
     */
    once(event: string, listener: ListenerFunc, object: object): void {

        const _listener: any = ($event: string, ...$args: any[]) => {
            this.off(event, _listener, object);
            listener.call(object, $event, ...$args);
        };
        this.on(event, _listener, object);
    }

    /**
     * 移除全局事件（强类型）
     * @param event     事件名（枚举）
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    off<K extends keyof TypedEventMap>(
        event: K,
        listener?: (event: K, data: TypedEventMap[K]) => void,
        object?: object
    ): void;

    /**
     * 移除全局事件（兼容旧用法）
     * @param event     事件名
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    off(event: string, listener?: Function, object?: object): void;

    /**
     * 移除全局事件（实现）
     */
    off(event: string, listener?: Function, object?: object): void {
        const eds = this.events.get(event);

        if (!eds) {
            log(`名为【${event}】的事件不存在`);
            return;
        }

        // 如果没有指定 listener，移除该事件的所有监听器
        if (!listener) {
            for (const bin of eds) {
                EventDataPool.put(bin);
            }
            this.events.delete(event);
            return;
        }

        // 移除指定的监听器
        const length = eds.length;
        for (let i = 0; i < length; i++) {
            const bin: EventData = eds[i];
            if (bin.listener == listener && bin.object == object) {
                EventDataPool.put(bin);
                eds.splice(i, 1);
                break;
            }
        }

        if (eds.length == 0) {
            this.events.delete(event);
        }
    }

    /**
     * 触发全局事件（兼容旧用法）
     * @param event      事件名
     * @param args       事件参数
     * @note 使用 concat() 创建数组副本，防止在事件回调中添加/删除监听器时影响遍历
     */

    dispatchEvent(event: string, ...args: any[]): void {
        const list = this.events.get(event);
        if (list != null) {
            const eds: Array<EventData> = list.concat();
            const length = eds.length;
            for (let i = 0; i < length; i++) {
                const ed = eds[i];
                ed.listener.call(ed.object, event, ...args);
            }
        }
    }

    /**
     * 触发全局事件,支持同步与异步处理（兼容旧用法）
     * @param event      事件名
     * @param args       事件参数
     * @note 使用 concat() 创建数组副本，防止在事件回调中添加/删除监听器时影响遍历
     */

    dispatchEventAsync(event: string, ...args: any[]): Promise<void> {
        return new Promise((resolve) => {
            const list = this.events.get(event);
            if (list != null) {
                const eds: Array<EventData> = list.concat();
                const length = eds.length;
                (async () => {
                    for (let i = 0; i < length; i++) {
                        const ed = eds[i];
                        await Promise.resolve(ed.listener.call(ed.object, event, ...args));
                    }
                    resolve();
                })();
            }
            else {
                resolve();
            }
        });
    }

    /**
     * 触发强类型事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     * @note 使用此方法可获得编译时的强类型约束，参数不匹配会编译报错
     */
    emit<K extends keyof TypedEventMap>(event: K, data: TypedEventMap[K]): void {
        const list = this.events.get(event as string);
        if (list != null) {
            const eds: Array<EventData> = list.concat();
            const length = eds.length;
            for (let i = 0; i < length; i++) {
                const ed = eds[i];
                ed.listener.call(ed.object, event, data);
            }
        }
    }

    /**
     * 触发强类型异步事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     * @note 使用此方法可获得编译时的强类型约束，参数不匹配会编译报错
     */
    emitAsync<K extends keyof TypedEventMap>(event: K, data: TypedEventMap[K]): Promise<void> {
        return new Promise((resolve) => {
            const list = this.events.get(event as string);
            if (list != null) {
                const eds: Array<EventData> = list.concat();
                const length = eds.length;
                (async () => {
                    for (let i = 0; i < length; i++) {
                        const ed = eds[i];
                        await Promise.resolve(ed.listener.call(ed.object, event, data));
                    }
                    resolve();
                })();
            }
            else {
                resolve();
            }
        });
    }
}

export const message = new MessageManager();
