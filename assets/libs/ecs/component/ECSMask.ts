/**
 * ECSMask 对象池 - 按字长复用 Uint32Array，减少 GC
 */
class MaskPool {
    /** 按字长缓存的 Uint32Array 池 */
    private static pool: Uint32Array[] = [];
    /** 池容量上限 */
    private static readonly MAX_POOL_SIZE = 128;

    /**
     * 从池中获取指定长度的掩码数组，无可用则新建。
     * @param length 字数（Uint32 元素个数）
     */
    static get(length: number): Uint32Array {
        const pool = this.pool;
        for (let i = pool.length - 1; i >= 0; i--) {
            if (pool[i].length === length) {
                const mask = pool[i];
                pool[i] = pool[pool.length - 1];
                pool.pop();
                mask.fill(0);
                return mask;
            }
        }
        return new Uint32Array(length);
    }

    /**
     * 回收掩码数组到对象池。
     * @param mask 待回收的掩码，可为 null
     */
    static recycle(mask: Uint32Array | null): void {
        if (!mask) return;
        if (this.pool.length < this.MAX_POOL_SIZE) {
            mask.fill(0);
            this.pool.push(mask);
        }
    }

    /** 清空对象池 */
    static clear(): void {
        this.pool.length = 0;
    }
}

/**
 * 组件位掩码（32 位字）
 *
 * 用 Uint32Array 每字存 32 个组件位，位索引通过移位计算（`tid >>> 5` / `tid & 31`），
 * 避免历史实现里 31 位字 + 整数除法的开销。所有按位运算均对整型友好。
 */
export class ECSMask {
    /** 底层位数组，destroy 后置 null */
    private mask: Uint32Array | null = null;
    /** 字数（word 数量） */
    private size = 0;

    /**
     * 初始化掩码。
     * @param wordCount 32 位字数（由调用方按已注册组件数提供，见 registry.maskWordCount）
     */
    constructor(wordCount: number) {
        this.mask = MaskPool.get(wordCount);
        this.size = wordCount;
    }

    /**
     * 置位指定组件类型 id。
     * @param num 组件类型 id（tid）
     */
    set(num: number): void {
        let mask = this.mask;
        if (!mask) return;
        const word = num >>> 5;
        // 越界则自动扩容：避免“组件晚于实体/匹配器注册”时 TypedArray 越界写被静默丢弃，
        // 导致该位永远置不上、实体永不匹配的隐性 bug（兼容动态加载 / 热更场景）。
        if (word >= this.size) {
            this.grow(word + 1);
            mask = this.mask!;
        }
        mask[word] |= (1 << (num & 31));
    }

    /** 扩容底层位数组到至少 wordCount 个字（保留已有位，旧数组回收到池） */
    private grow(wordCount: number): void {
        const old = this.mask;
        const next = MaskPool.get(wordCount);
        if (old) {
            next.set(old);
            MaskPool.recycle(old);
        }
        this.mask = next;
        this.size = wordCount;
    }

    /**
     * 清除指定组件类型 id 的位。
     * @param num 组件类型 id（tid）
     */
    delete(num: number): void {
        const mask = this.mask;
        if (!mask) return;
        mask[num >>> 5] &= ~(1 << (num & 31));
    }

    /**
     * 是否包含指定组件类型 id。
     * @param num 组件类型 id（tid）
     */
    has(num: number): boolean {
        const mask = this.mask;
        if (!mask) return false;
        return (mask[num >>> 5] & (1 << (num & 31))) !== 0;
    }

    /**
     * 是否与 other 有交集（任意一个公共位）。
     * 用于 anyOf / excludeOf 判定。
     */
    or(other: ECSMask): boolean {
        const a = this.mask;
        const b = other.mask;
        if (!a || !b) return false;
        const n = a.length < b.length ? a.length : b.length;
        for (let i = 0; i < n; i++) {
            if ((a[i] & b[i]) !== 0) return true;
        }
        return false;
    }

    /**
     * 本掩码是否为 other 的子集（this 的每一位都在 other 中）。
     * 用于 allOf 判定（实体是否拥有规则要求的所有组件）。
     */
    and(other: ECSMask): boolean {
        const a = this.mask;
        const b = other.mask;
        if (!a || !b) return false;
        const an = a.length;
        const bn = b.length;
        for (let i = 0; i < an; i++) {
            const w = a[i];
            if (w === 0) continue;
            const ow = i < bn ? b[i] : 0;
            if ((w & ow) !== w) return false;
        }
        return true;
    }

    /** 置位组件数量（popcount） */
    bitCount(): number {
        const mask = this.mask;
        if (!mask) return 0;
        let count = 0;
        for (let i = 0; i < mask.length; i++) {
            let v = mask[i];
            // Hamming weight（SWAR）
            v = v - ((v >>> 1) & 0x55555555);
            v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
            v = (v + (v >>> 4)) & 0x0f0f0f0f;
            count += (v * 0x01010101) >>> 24;
        }
        return count;
    }

    /** 是否为空（无任何置位） */
    isEmpty(): boolean {
        const mask = this.mask;
        if (!mask) return true;
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] !== 0) return false;
        }
        return true;
    }

    /** 清零所有位，保留底层数组 */
    clear(): void {
        if (this.mask) this.mask.fill(0);
    }

    /** 销毁并回收底层数组到对象池 */
    destroy(): void {
        if (this.mask) {
            MaskPool.recycle(this.mask);
            this.mask = null;
            this.size = 0;
        }
    }

    /** 清空 Mask 对象池（内存清理） */
    static clearPool(): void {
        MaskPool.clear();
    }
}
