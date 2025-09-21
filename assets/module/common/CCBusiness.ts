/*
 * @Author: dgflash
 * @Date: 2025-09-18 10:20:51
 * @LastEditors: dgflash
 * @LastEditTime: 2025-09-18 17:20:51
 */

import { EventDispatcher } from "../../core/common/event/EventDispatcher";
import { ListenerFunc } from "../../core/common/event/EventMessage";
import { CCEntity } from "./CCEntity";

/** 业务逻辑 */
export class CCBusiness<T extends CCEntity> {
    ent!: T;

    /** 业务逻辑初始化 */
    protected init() {

    }

    destroy() {
        // 释放消息对象
        if (this._event) {
            this._event.destroy();
            this._event = null;
        }
    }

    //#region 全局事件管理

    private _event: EventDispatcher | null = null;
    /** 全局事件管理器 */
    private get event(): EventDispatcher {
        if (this._event == null) this._event = new EventDispatcher();
        return this._event;
    }

    /**
     * 注册全局事件
     * @param event       事件名
     * @param listener    处理事件的侦听器函数
     * @param object      侦听函数绑定的this对象
     */
    on(event: string, listener: ListenerFunc, object: any) {
        this.event.on(event, listener, object);
    }

    /**
     * 移除全局事件
     * @param event      事件名
     */
    off(event: string) {
        this.event.off(event);
    }

    /**
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: any) {
        this.event.dispatchEvent(event, ...args);
    }

    /**
     * 批量设置全局事件
     * @example
     *  this.setEvent("onGlobal");
     *  this.dispatchEvent("onGlobal", "全局事件");
     *
     *  onGlobal(event: string, args: any) { console.log(args) };
     */
    protected setEvent(...args: string[]) {
        const self: any = this;
        for (const name of args) {
            const func = self[name];
            if (func)
                this.on(name, func, this);
            else
                console.error(`名为【${name}】的全局事方法不存在`);
        }
    }

    //#endregion
}