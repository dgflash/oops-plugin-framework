/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:57:01
 */
import { ListenerFunc } from "./EventMessage";
import { MessageEventData } from "./MessageManager";

/* 事件对象基类，继承该类将拥有发送和接送事件的能力 */
export class EventDispatcher {
    protected _msg: MessageEventData | null = null;

    /**
     * 注册全局事件
     * @param event     事件名
     * @param listener  处理事件的侦听器函数
     * @param object    侦听函数绑定的作用域对象
     */
    on(event: string, listener: ListenerFunc, object: any) {
        if (this._msg == null) {
            this._msg = new MessageEventData();
        }
        this._msg.on(event, listener, object);
    }

    /**
     * 移除全局事件
     * @param event      事件名
     */
    off(event: string) {
        if (this._msg) {
            this._msg.off(event);
        }
    }

    /** 
     * 触发全局事件 
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: any) {
        if (this._msg == null) {
            this._msg = new MessageEventData();
        }
        this._msg.dispatchEvent(event, ...args);
    }

    /**
     * 销毁事件对象
     */
    destroy() {
        if (this._msg) {
            this._msg.clear();
        }
        this._msg = null;
    }
}