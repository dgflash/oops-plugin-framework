/** 延迟结构变更命令队列，帧末由 RootSystem.execute 统一 flush */
export class ECSCommandBuffer {
    private readonly _list: Array<() => void> = [];

    /** 入队一个延迟命令（遍历实体时避免直接增删组件） */
    push(fn: () => void): void {
        this._list.push(fn);
    }

    /** 当前待执行命令数量 */
    get size(): number {
        return this._list.length;
    }

    /** 帧末统一执行队列（先快照，避免 flush 过程中新入队命令在本帧执行） */
    flush(): void {
        const list = this._list;
        if (list.length === 0) return;
        const snapshot = list.slice();
        list.length = 0;
        for (let i = 0; i < snapshot.length; i++) {
            try {
                snapshot[i]();
            }
            catch (e) {
                console.error('[ECS] 延迟命令执行失败', e);
            }
        }
    }

    /** 清空队列（不执行） */
    clear(): void {
        this._list.length = 0;
    }
}
