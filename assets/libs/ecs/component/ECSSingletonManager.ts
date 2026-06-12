import type { ecs } from '../ECS';
/** 本世界单例组件表：tid -> 实例 */
export class ECSSingletonManager {
    private readonly _map: Map<number, ecs.IComp> = new Map();

    /** 是否已存在某 tid 的单例 */
    has(tid: number): boolean {
        return this._map.has(tid);
    }

    /** 获取某 tid 的单例（不存在返回 undefined） */
    get<T extends ecs.IComp = ecs.IComp>(tid: number): T | undefined {
        return this._map.get(tid) as T | undefined;
    }

    /** 登记单例（已存在则忽略，避免覆盖） */
    setIfAbsent(tid: number, comp: ecs.IComp): void {
        if (!this._map.has(tid)) this._map.set(tid, comp);
    }

    /**
     * 获取或创建单例组件
     * @param tid 组件 tid
     * @param create 不存在时的创建回调
     */
    getOrCreate<T extends ecs.IComp>(tid: number, create: () => T): T {
        const existing = this.get<T>(tid);
        if (existing) return existing;
        const comp = create();
        this.setIfAbsent(tid, comp);
        return comp;
    }

    /** 注册外部已构造的单例组件 */
    add(obj: ecs.IComp): void {
        const tid = obj.tid;
        this.setIfAbsent(tid, obj);
    }

    /** 解除某 tid 的单例登记 */
    delete(tid: number): boolean {
        return this._map.delete(tid);
    }

    /** 清空全部单例登记 */
    clear(): void {
        this._map.clear();
    }
}
