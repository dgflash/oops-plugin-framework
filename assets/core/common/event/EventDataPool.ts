import { EventData } from './EventData';

/** EventData 对象池，减少频繁创建对象的 GC 压力 */
export class EventDataPool {
    /** 对象池，存储可复用的 EventData 对象 */
    private static pool: EventData[] = [];
    /** 对象池最大容量，防止内存占用过大 */
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
        data.reset();
        if (this.pool.length >= this.MAX_POOL_SIZE) {
            // 删除最老的对象
            this.pool.shift();
        }
        this.pool.push(data);
    }

    /** 清空对象池 */
    static clear() {
        this.pool.length = 0;
    }
}
