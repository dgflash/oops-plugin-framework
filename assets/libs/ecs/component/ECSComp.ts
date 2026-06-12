import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import { ecsWorldManager } from '../world/ECSWorldManager';

/**
 * 组件抽象类
 * 注：建议组件里面只放数据可能在实际写代码会碰到一些比较麻烦的问题，如果是单纯对组件内的数据操作可以在组件里面写方法
 */
export abstract class ECSComp implements ecs.IComp {
    /** 组件的类型编号，-1表示未给该组件分配编号 */
    static tid = -1;
    /** 组件名 */
    static compName: string;

    /**
     * 是否可回收组件对象，默认情况下都是可回收的
     * 注：如果该组件对象是由ecs系统外部创建的，则不可回收，需要用户自己手动进行回收
     */
    canRecycle = true;
    /** 拥有该组件的实体 */
    ent!: ECSEntity;
    /** 组件的类型编号 */
    tid = -1;

    /**
     * 最近一次写入的帧 epoch（私有存储）。
     * 由 markDirty() 写入、lastWriteEpoch 读取，供 isChangedSince() 做增量变更检测；
     * 与当前世界的 epoch（RootSystem 每帧自增）配合，避免逐字段脏标记开销。
     */
    private _lastWriteEpoch = 0;

    /**
     * 标记该组件在某一帧发生了变化（变更检测用）。
     * @param epoch 当前帧编号（默认取当前世界的 epoch）
     */
    markDirty(epoch?: number): void {
        this._lastWriteEpoch = epoch ?? ecsWorldManager.current.epoch;
    }

    /** 最近一次写入的帧 epoch */
    get lastWriteEpoch(): number {
        return this._lastWriteEpoch;
    }

    /**
     * 自上一次某 epoch 起是否发生过变化。
     * @param sinceEpoch 比较基准帧
     */
    isChangedSince(sinceEpoch: number): boolean {
        return this._lastWriteEpoch > sinceEpoch;
    }

    /**
     * 组件被回收时会调用这个接口。可以在这里重置数据，或者解除引用
     * 注：不要偷懒，除非你能确定并保证组件在复用时，里面的数据是先赋值然后再使用
     */
    abstract reset(): void;
}
