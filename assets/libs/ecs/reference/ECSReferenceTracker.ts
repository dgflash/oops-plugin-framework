import type { ecs } from '../ECS';

/** 一条实体引用记录：某组件实例的某个 @EntityRef 属性指向了被追踪实体 */
interface ReferenceRecord {
    /** 持有引用的组件实例 */
    comp: ecs.IComp;
    /** 组件上存储该引用的属性名 */
    key: string;
}

/**
 * 实体引用追踪器（每个 {@link ECSWorld} 各持一份）。
 *
 * 配合 `@EntityRef` 装饰器使用：记录"谁引用了某个实体"，当该实体被销毁时，
 * 自动把所有指向它的组件属性置为 null，杜绝悬空引用。
 *
 * 与世代式 eid 协同：eid 负责"检测"引用是否失效，本追踪器负责"自动清理"。
 *
 * 注意：记录使用强引用而非 WeakRef，因为组件走对象池复用——
 * 必须在组件移除/实体销毁时显式注销，否则池化复用会让 WeakRef 指向被复用的对象造成误清理。
 * 框架已在 `ECSEntity.remove` / 实体销毁路径中保证注销，故强引用是安全且更简单的选择。
 */
export class ECSReferenceTracker {
    /** 被引用实体 eid -> 指向它的所有引用记录 */
    private _refs: Map<number, ReferenceRecord[]> = new Map();

    /**
     * 注册一条引用（被引用实体 eid <- 某组件的某属性）
     * @param targetEid 被引用实体的 eid
     * @param comp      持有引用的组件实例
     * @param key       组件上存储引用的属性名
     */
    registerReference(targetEid: number, comp: ecs.IComp, key: string): void {
        let list = this._refs.get(targetEid);
        if (!list) {
            list = [];
            this._refs.set(targetEid, list);
        }
        for (let i = 0; i < list.length; i++) {
            if (list[i].comp === comp && list[i].key === key) return;
        }
        list.push({ comp, key });
    }

    /**
     * 注销一条引用（属性改写或组件移除时调用）
     * @param targetEid 被引用实体的 eid
     * @param comp      持有引用的组件实例
     * @param key       组件上存储引用的属性名
     */
    unregisterReference(targetEid: number, comp: ecs.IComp, key: string): void {
        const list = this._refs.get(targetEid);
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
            if (list[i].comp === comp && list[i].key === key) {
                list.splice(i, 1);
                break;
            }
        }
        if (list.length === 0) this._refs.delete(targetEid);
    }

    /**
     * 清理所有指向指定实体的引用：把持有方对应属性置为 null。
     * 实体销毁时调用。
     * @param targetEid 被销毁实体的 eid
     */
    clearReferencesTo(targetEid: number): void {
        const list = this._refs.get(targetEid);
        if (!list) return;
        // 先快照并摘除条目：置空会触发 setter 内部 unregister，提前删除可避免重入修改本列表
        const snapshot = list.slice();
        this._refs.delete(targetEid);
        for (let i = 0; i < snapshot.length; i++) {
            // 走属性自身的 setter 置空（setter 会同步清理存储值）
            Reflect.set(snapshot[i].comp, snapshot[i].key, null);
        }
    }

    /** 当前被引用的实体数量（调试用） */
    get trackedCount(): number {
        return this._refs.size;
    }

    /** 清空全部引用记录（世界 clear 时调用） */
    clear(): void {
        this._refs.clear();
    }
}
