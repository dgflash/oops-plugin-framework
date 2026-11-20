import { log, warn } from 'cc';
import { EventData } from './EventData';
import type { ListenerFunc, ListenerFuncTyped } from './EventMessage';

/**
 * 全局消息管理
 *
 * @性能优化说明
 * 1. 重复注册检测，避免同一监听器被多次添加
 * 2. Map 数据结构，提供 O(1) 的事件查找性能
 * 3. 支持精确移除单个监听器，避免误删
 *
 * 派发按注册表快照逐个调；回调里同步 off 掉的监听记录当场清空、派发时跳过。
 * 记录不回收复用：派发途中被 off 的记录若又被新 on 拿去，快照会按旧位置调到新监听。
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

    //#region 强类型事件方法（提供给 Agent 自动生成用）

    /**
     * 注册全局事件（强类型）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    watch<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>,
        object: object
    ): void {
        this.on(event as string, listener as ListenerFunc, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除（强类型）
     * @param event     事件名（枚举）
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>,
        object: object
    ): void {
        this.once(event as string, listener as ListenerFunc, object);
    }

    /**
     * 移除全局事件（强类型）
     * @param event     事件名（枚举）
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>,
        object?: object
    ): void {
        this.off(event as string, listener as ListenerFunc, object);
    }

    /**
     * 触发强类型事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     * @note 使用此方法可获得编译时的强类型约束，参数不匹配会编译报错
     */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data?: OopsFramework.TypedEventMap[K]): void {
        const list = this.events.get(event as string);
        if (list != null) {
            const eds: Array<EventData> = list.concat();
            const length = eds.length;
            for (let i = 0; i < length; i++) {
                const ed = eds[i];
                const listener = this.take(event as string, ed);
                if (listener) listener.call(ed.object, event, data);
            }
        }
    }

    /**
     * 触发强类型异步事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     * @note 使用此方法可获得编译时的强类型约束，参数不匹配会编译报错
     */
    emitAsync<K extends keyof OopsFramework.TypedEventMap>(
        event: K,
        data?: OopsFramework.TypedEventMap[K]
    ): Promise<void> {
        return new Promise(resolve => {
            const list = this.events.get(event as string);
            if (list != null) {
                const eds: Array<EventData> = list.concat();
                const length = eds.length;
                (async () => {
                    for (let i = 0; i < length; i++) {
                        const ed = eds[i];
                        const listener = this.take(event as string, ed);
                        if (listener) await Promise.resolve(listener.call(ed.object, event, data));
                    }
                    resolve();
                })();
            } else {
                resolve();
            }
        });
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
        this.add(event, listener, object, false);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除；没触发前可按同一个 listener 用 off 移除
     * @param event     事件名
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    once(event: string, listener: ListenerFunc, object: object): void {
        this.add(event, listener, object, true);
    }

    private add(event: string, listener: ListenerFunc, object: object, once: boolean): void {
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

        const data = new EventData();
        data.event = event;
        data.listener = listener;
        data.object = object;
        data.once = once;
        eds.push(data);
    }

    /**
     * 移除全局事件
     * @param event     事件名
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
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
                bin.reset();
            }
            this.events.delete(event);
            return;
        }

        // 移除指定的监听器
        const length = eds.length;
        for (let i = 0; i < length; i++) {
            const bin: EventData = eds[i];
            if (bin.listener == listener && bin.object == object) {
                bin.reset();
                eds.splice(i, 1);
                break;
            }
        }

        if (eds.length == 0) {
            this.events.delete(event);
        }
    }

    /**
     * 触发全局事件
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
                const listener = this.take(event, ed);
                if (listener) listener.call(ed.object, event, ...args);
            }
        }
    }

    /**
     * 触发全局事件,支持同步与异步处理
     * @param event      事件名
     * @param args       事件参数
     * @note 使用 concat() 创建数组副本，防止在事件回调中添加/删除监听器时影响遍历
     */
    dispatchEventAsync(event: string, ...args: any[]): Promise<void> {
        return new Promise(resolve => {
            const list = this.events.get(event);
            if (list != null) {
                const eds: Array<EventData> = list.concat();
                const length = eds.length;
                (async () => {
                    for (let i = 0; i < length; i++) {
                        const ed = eds[i];
                        const listener = this.take(event, ed);
                        if (listener) await Promise.resolve(listener.call(ed.object, event, ...args));
                    }
                    resolve();
                })();
            } else {
                resolve();
            }
        });
    }

    //#endregion

    /** 派发到这条记录时要调的回调；已注销的为空，一次性的先注销 */
    private take(event: string, ed: EventData): ListenerFunc | null {
        const listener = ed.listener;
        if (listener && ed.once) this.off(event, listener, ed.object);
        return listener;
    }
}

export const message = new MessageManager();
