/** 组件实例上挂载 ChangeTracker 的符号键 */
export const TRACKER_KEY = Symbol('ecsChangeTracker');
/** 写入备份字段时绕过脏标记的前缀 */
export const SYNC_BACKING_PREFIX = '_sync_';

/**
 * 字段级脏标记追踪器（每个被同步的组件实例一个）。
 * 用位掩码记录哪些 @sync 字段发生过变化，供增量编码读取。
 */
export class ChangeTracker {
    /** 位掩码字数组，每个字存 32 个字段的脏标记 */
    private words: number[] = [];
    /** 当前脏字段数量 */
    private _dirtyCount = 0;
    /** 被追踪的字段总数 */
    private _fieldCount = 0;

    /**
     * 构造函数
     * @param fieldCount 同步字段数量
     */
    constructor(fieldCount: number) {
        this._fieldCount = fieldCount;
        const wordCount = (fieldCount + 31) >>> 5;
        for (let i = 0; i < wordCount; i++) this.words.push(0);
    }

    /** 将指定索引的字段标记为脏 */
    setDirty(index: number): void {
        const w = index >>> 5;
        const bit = 1 << (index & 31);
        if ((this.words[w] & bit) === 0) {
            this.words[w] |= bit;
            this._dirtyCount++;
        }
    }

    /** 指定索引的字段是否已脏 */
    isDirty(index: number): boolean {
        return (this.words[index >>> 5] & (1 << (index & 31))) !== 0;
    }

    /** 是否存在任意脏字段 */
    get hasChanges(): boolean {
        return this._dirtyCount > 0;
    }

    /** 脏字段数量 */
    get dirtyCount(): number {
        return this._dirtyCount;
    }

    /** 将全部字段标记为脏 */
    markAll(): void {
        for (let i = 0; i < this._fieldCount; i++) this.setDirty(i);
    }

    /** 收集所有脏字段的索引 */
    collect(): number[] {
        const out: number[] = [];
        for (let i = 0; i < this._fieldCount; i++) {
            if (this.isDirty(i)) out.push(i);
        }
        return out;
    }

    /** 清除全部脏标记 */
    clear(): void {
        for (let i = 0; i < this.words.length; i++) this.words[i] = 0;
        this._dirtyCount = 0;
    }
}
