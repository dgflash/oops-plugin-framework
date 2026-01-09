/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:57:01
 */
import type { ListenerFunc } from './EventMessage';
import { MessageEventData } from './MessageManager';

/**
 * 事件对象基类，继承该类将拥有发送和接收事件的能力
 * 
 * @性能优化
 * - 懒加载 MessageEventData 实例，未使用事件功能时不占用内存
 * - 支持批量清理事件，避免逐个移除的性能损耗
 * - 使用对象池管理内部 EventData 对象
 * 
 * @内存管理
 * ⚠️ 必须在对象销毁时调用 destroy() 方法，否则会导致内存泄漏
 * 
 * @example
 * class MyClass extends EventDispatcher {
 *     constructor() {
 *         super();
 *         this.on('myEvent', this.onMyEvent, this);
 *     }
 * 
 *     onMyEvent(event: string, data: any) {
 *         console.log('收到事件:', event, data);
 *     }
 * 
 *     destroy() {
 *         super.destroy(); // 清理所有事件监听
 *     }
 * }
 */
export class EventDispatcher {
    protected _msg: MessageEventData | null = null;

    /** 确保 MessageEventData 已初始化 */
    private ensureMessageEventData(): MessageEventData {
        if (this._msg == null) {
            this._msg = new MessageEventData();
        }
        return this._msg;
    }

    /**
     * 注册全局事件
     * @param event     事件名
     * @param listener  处理事件的侦听器函数
     * @param object    侦听函数绑定的作用域对象
     */
    on(event: string, listener: ListenerFunc, object: any) {
        this.ensureMessageEventData().on(event, listener, object);
    }

    /**
     * 移除全局事件
     * @param event      事件名
     * @param listener   处理事件的侦听器函数（可选，不传则移除该事件的所有监听器）
     * @param object     侦听函数绑定的作用域对象（可选）
     */
    off(event: string, listener?: ListenerFunc, object?: any) {
        if (this._msg) {
            // 支持精确移除单个监听器
            if (listener) {
                this._msg.off(event, listener, object);
            } else {
                // 移除该事件的所有监听器
                this._msg.off(event);
            }
        }
    }

    /**
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: any) {
        this.ensureMessageEventData().dispatchEvent(event, ...args);
    }

    /**
     * 销毁事件对象，释放所有事件监听
     */
    destroy() {
        if (this._msg) {
            this._msg.clear();
            this._msg = null;
        }
    }
}
