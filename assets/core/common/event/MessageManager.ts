import { log, warn } from 'cc';
import type { ListenerFunc } from './EventMessage';

class EventData {
    event!: string;
    listener!: ListenerFunc;
    object: any;

    /** 重置数据，准备回收到对象池 */
    reset() {
        this.event = '';
        this.listener = null!;
        this.object = null;
    }
}

/** EventData 对象池，减少频繁创建对象的 GC 压力 */
class EventDataPool {
    private static pool: EventData[] = [];
    private static readonly MAX_POOL_SIZE = 100;

    /** 从对象池获取对象 */
    static get(): EventData {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return new EventData();
    }

    /** 回收对象到对象池 */
    static put(data: EventData) {
        if (this.pool.length < this.MAX_POOL_SIZE) {
            data.reset();
            this.pool.push(data);
        }
    }

    /** 清空对象池 */
    static clear() {
        this.pool.length = 0;
    }
}

/** 批量注册、移除全局事件对象（用于组件级事件管理） */
export class MessageEventData {
    private events: Map<string, Array<EventData>> = new Map();

    /**
     * 注册全局事件
     * @param event      事件名
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
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
    * 移除全局事件
     * @param event     事件名
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
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
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: any) {
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
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037894&doc_id=2873565
 * @example
// 注册持续监听的全局事件
export class RoleViewComp extends Component{
    onLoad(){
        // 监听全局事件
        oops.message.on(GameEvent.GameServerConnected, this.onHandler, this);
    }

    protected onDestroy() {
        // 对象释放时取消注册的全局事件
        oops.message.off(GameEvent.GameServerConnected, this.onHandler, this);
    }

    private onHandler(event: string, args: any) {
        switch (event) {
            case GameEvent.GameServerConnected:
                console.log("处理游戏服务器连接成功后的逻辑");
                break;
        }
    }
}

// 注册只触发一次的全局事件
export class RoleViewComp extends Component{
    onLoad(){
        // 监听一次事件，事件响应后，该监听自动移除
        oops.message.once(GameEvent.GameServerConnected, this.onHandler, this);
    }

    private onHandler(event: string, args: any) {
        switch (event) {
            case GameEvent.GameServerConnected:
                console.log("处理游戏服务器连接成功后的逻辑");
                break;
        }
    }
}
 */
export class MessageManager {
    private events: Map<string, Array<EventData>> = new Map();

    /**
     * 注册全局事件
     * @param event      事件名
     * @param listener   处理事件的侦听器函数
     * @param object     侦听函数绑定的作用域对象
     */
    on(event: string, listener: ListenerFunc, object: object) {
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
     * 监听一次事件，事件响应后，该监听自动移除
     * @param event     事件名
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的作用域对象
     */
    once(event: string, listener: ListenerFunc, object: object) {
        const _listener: any = ($event: string, ...$args: any) => {
            this.off(event, _listener, object);
            // 正确展开参数传递
            listener.call(object, $event, ...$args);
        };
        this.on(event, _listener, object);
    }

    /**
     * 移除全局事件
     * @param event     事件名
     * @param listener  处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object    侦听函数绑定的作用域对象（可选）
     */
    off(event: string, listener?: Function, object?: object) {
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
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     * @note 使用 concat() 创建数组副本，防止在事件回调中添加/删除监听器时影响遍历
     */
    dispatchEvent(event: string, ...args: any) {
        const list = this.events.get(event);
        if (list != null) {
            // 创建副本以支持在回调中安全地修改监听器列表
            const eds: Array<EventData> = list.concat();
            const length = eds.length;
            for (let i = 0; i < length; i++) {
                const ed = eds[i];
                ed.listener.call(ed.object, event, ...args);
            }
        }
    }

    /**
     * 触发全局事件,支持同步与异步处理
     * @param event      事件名
     * @param args       事件参数
     * @note 使用 concat() 创建数组副本，防止在事件回调中添加/删除监听器时影响遍历
     * @example          事件响应示例
        onTest(event: string, args: any): Promise<void> {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    console.log("异步事逻辑");
                    resolve();
                }, 2000);
            });
        }
     */
    dispatchEventAsync(event: string, ...args: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const list = this.events.get(event);
            if (list != null) {
                // 创建副本以支持在回调中安全地修改监听器列表
                const eds: Array<EventData> = list.concat();
                const length = eds.length;
                for (let i = 0; i < length; i++) {
                    const ed = eds[i];
                    await Promise.resolve(ed.listener.call(ed.object, event, ...args));
                }
            }
            resolve();
        });
    }
}

export const message = new MessageManager();
