/*
 * @Author: dgflash
 * @Date: 2022-05-12 14:18:44
 * @LastEditors: dgflash
 * @LastEditTime: 2022-05-24 11:09:49
 */
import { ECSModel } from './ECSModel';

/**
 * ECSMask 对象池 - 优化内存分配
 */
class MaskPool {
    private static pool: Uint32Array[] = [];
    private static readonly MAX_POOL_SIZE = 100; // 池容量限制

    static get(length: number): Uint32Array {
        // 从池中获取或创建新数组
        if (this.pool.length > 0) {
            const mask = this.pool.pop()!;
            // 如果长度不匹配，创建新的
            if (mask.length !== length) {
                return new Uint32Array(length);
            }
            // 清空数组内容
            mask.fill(0);
            return mask;
        }
        return new Uint32Array(length);
    }

    static recycle(mask: Uint32Array) {
        // 只回收到池中，不超过最大容量
        if (this.pool.length < this.MAX_POOL_SIZE) {
            this.pool.push(mask);
        }
    }

    static clear() {
        this.pool.length = 0;
    }
}

export class ECSMask {
    private mask!: Uint32Array;
    private size = 0;

    constructor() {
        const length = Math.ceil(ECSModel.compTid / 31);
        this.mask = MaskPool.get(length);
        this.size = length;
    }

    set(num: number) {
        // https://stackoverflow.com/questions/34896909/is-it-correct-to-set-bit-31-in-javascript
        // this.mask[((num / 32) >>> 0)] |= ((1 << (num % 32)) >>> 0);
        const index = (num / 31) >>> 0;
        const bit = num % 31;
        this.mask[index] |= (1 << bit);
    }

    delete(num: number) {
        const index = (num / 31) >>> 0;
        const bit = num % 31;
        this.mask[index] &= ~(1 << bit);
    }

    has(num: number): boolean {
        const index = (num / 31) >>> 0;
        const bit = num % 31;
        return !!(this.mask[index] & (1 << bit));
    }

    or(other: ECSMask): boolean {
        const size = this.size;
        const thisMask = this.mask;
        const otherMask = other.mask;
        // 使用标准 for 循环提升性能
        for (let i = 0; i < size; i++) {
            // &操作符最大也只能对2^30进行操作，如果对2^31&2^31会得到负数。当然可以(2^31&2^31) >>> 0，这样多了一步右移操作。
            if (thisMask[i] & otherMask[i]) {
                return true;
            }
        }
        return false;
    }

    and(other: ECSMask): boolean {
        const size = this.size;
        const thisMask = this.mask;
        const otherMask = other.mask;
        // 使用标准 for 循环提升性能
        for (let i = 0; i < size; i++) {
            if ((thisMask[i] & otherMask[i]) !== thisMask[i]) {
                return false;
            }
        }
        return true;
    }

    clear() {
        // 使用 fill 方法更高效
        this.mask.fill(0);
    }

    /**
     * 销毁并回收到对象池
     */
    destroy() {
        if (this.mask) {
            MaskPool.recycle(this.mask);
            this.mask = null!;
            this.size = 0;
        }
    }

    /**
     * 清空所有对象池（用于内存清理）
     */
    static clearPool() {
        MaskPool.clear();
    }
}
