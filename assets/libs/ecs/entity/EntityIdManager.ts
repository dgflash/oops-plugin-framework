/**
 * 实体唯一编号（eid）统一管理器 —— 世代式数字句柄
 *
 * 设计目标（在不改变"实体是对象"这一对外模型的前提下，拿到数字句柄的核心能力）：
 * - eid 仍是一个普通的正整数，CCEntity/CCView 及所有现有以 eid 为 Map key 的逻辑（childs/eid2Entity/SoA）零改动。
 * - eid 内部编码"索引(index) + 世代号(generation)"：实体回收后世代号 +1，旧 eid 自然失效，
 *   从而支持"悬空引用检测"（{@link EntityIdManager.isValid}）。
 * - 索引可循环复用，避免编号无限增长。
 *
 * 编码方式（避免 32 位有符号位移溢出，改用乘加，结果始终是 < 2^53 的安全整数）：
 *   eid = generation * INDEX_CAPACITY + index
 *   index      = eid % INDEX_CAPACITY
 *   generation = Math.floor(eid / INDEX_CAPACITY)
 *
 * 其中 index 取值范围为 [1, INDEX_CAPACITY)，0 保留为"无效"。
 * generation=0 且 index=1 时 eid=1，与历史从 1 开始自增的编号自然衔接。
 */
export class EntityIdManager {
    /** 索引位宽（2^21 ≈ 209 万并发实体上限，足够绝大多数项目） */
    private static readonly INDEX_BITS = 21;
    /** 索引容量（= 2^INDEX_BITS），同时作为 generation 的进位基数 */
    private static readonly INDEX_CAPACITY = 1 << EntityIdManager.INDEX_BITS;

    /** index -> 当前世代号（数组下标即 index） */
    private generations: number[] = [0];
    /** 可复用的空闲索引栈 */
    private freeIndices: number[] = [];
    /** 下一个从未分配过的索引（0 保留无效，从 1 开始） */
    private nextIndex = 1;
    /** 当前存活的 eid 数量 */
    private aliveCount = 0;

    /** 从 eid 中解出索引部分 */
    static indexOf(eid: number): number {
        return eid % EntityIdManager.INDEX_CAPACITY;
    }

    /** 从 eid 中解出世代号部分 */
    static generationOf(eid: number): number {
        return Math.floor(eid / EntityIdManager.INDEX_CAPACITY);
    }

    /** 将索引与世代号编码为 eid */
    private static pack(index: number, generation: number): number {
        return generation * EntityIdManager.INDEX_CAPACITY + index;
    }

    /**
     * 分配一个新的 eid（优先复用空闲索引，复用时沿用该索引已递增的世代号）
     * @returns 编码后的唯一 eid（正整数）
     */
    allocate(): number {
        let index = this.freeIndices.pop();
        if (index === undefined) {
            index = this.nextIndex++;
            this.generations[index] = 0;
        }
        this.aliveCount++;
        return EntityIdManager.pack(index, this.generations[index]);
    }

    /**
     * 释放一个 eid：递增其索引的世代号，使旧 eid 立即失效，并将索引回收复用
     * @param eid 要释放的 eid
     * @returns 是否成功释放（传入的是过期/无效 eid 时返回 false）
     */
    release(eid: number): boolean {
        const index = EntityIdManager.indexOf(eid);
        if (index <= 0 || index >= this.nextIndex) return false;
        if (this.generations[index] !== EntityIdManager.generationOf(eid)) return false;
        this.generations[index]++;
        this.freeIndices.push(index);
        this.aliveCount--;
        return true;
    }

    /**
     * 校验 eid 是否仍指向当前存活的实体（悬空引用检测核心）
     * @param eid 待校验的 eid
     * @returns 仍有效返回 true；已被回收/从未分配返回 false
     */
    isValid(eid: number): boolean {
        if (eid <= 0) return false;
        const index = EntityIdManager.indexOf(eid);
        if (index <= 0 || index >= this.nextIndex) return false;
        return this.generations[index] === EntityIdManager.generationOf(eid);
    }

    /**
     * 预留/占用一个指定的 eid（用于反序列化、联机状态恢复时保持编号一致）。
     * 会同步 nextIndex、世代号，并从空闲栈中移除该索引，避免后续 allocate 冲突。
     * @param eid 要占用的 eid
     */
    reserve(eid: number): void {
        const index = EntityIdManager.indexOf(eid);
        const generation = EntityIdManager.generationOf(eid);
        if (index <= 0) return;

        if (index >= this.nextIndex) {
            // 补齐中间从未分配的索引并放入空闲栈，待后续 allocate 复用
            for (let i = this.nextIndex; i < index; i++) {
                this.generations[i] = 0;
                this.freeIndices.push(i);
            }
            this.nextIndex = index + 1;
        }
        else {
            // 该索引此前可能在空闲栈中，移除避免重复分配
            const pos = this.freeIndices.indexOf(index);
            if (pos !== -1) this.freeIndices.splice(pos, 1);
        }
        this.generations[index] = generation;
    }

    /** 当前存活的 eid 数量 */
    get size(): number {
        return this.aliveCount;
    }

    /** 重置管理器（清空所有索引与世代记录），用于 ecs.world.clear */
    reset(): void {
        this.generations = [0];
        this.freeIndices.length = 0;
        this.nextIndex = 1;
        this.aliveCount = 0;
    }
}
