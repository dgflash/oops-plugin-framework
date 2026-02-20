import type { ListenerFunc } from './EventMessage';

/** 事件数据对象，用于存储事件监听器信息 */
export class EventData {
    /** 事件名称 */
    event!: string;
    /** 事件监听器函数 */
    listener!: ListenerFunc;
    /** 监听器绑定的作用域对象 */
    object!: object;

    /** 重置数据，准备回收到对象池 */
    reset() {
        this.event = '';
        this.listener = null!;
        this.object = null!;
    }
}
