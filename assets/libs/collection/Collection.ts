/*
 * @Author: dgflash
 * @Date: 2022-07-22 15:54:51
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-22 14:47:59
 */

/** 支持Map与Array功能的集合对象 */
export class Collection<K, V> extends Map<K, V> {
    private _array: V[] = [];
    /** 优化：维护 value 到 index 的映射，避免 indexOf 查找 */
    private _valueToIndex: Map<V, number> = new Map();

    /** 获取数组对象 */
    get array() {
        return this._array;
    }

    /**
     * 设置值
     * @param key       关键字
     * @param value     数据值
     */
    set(key: K, value: V) {
        if (this.has(key)) {
            // 更新现有值
            const old = super.get(key)!;
            const index = this._valueToIndex.get(old);
            if (index !== undefined) {
                this._array[index] = value;
                this._valueToIndex.delete(old);
                this._valueToIndex.set(value, index);
            }
        }
        else {
            // 添加新值
            const index = this._array.length;
            this._array.push(value);
            this._valueToIndex.set(value, index);
        }

        return super.set(key, value);
    }

    /**
     * 删除值
     * @param key       关键字
     */
    delete(key: K): boolean {
        const value = super.get(key);
        if (value !== undefined) {
            const index = this._valueToIndex.get(value);
            if (index !== undefined) {
                // 使用快速删除：将最后一个元素移到删除位置
                const lastIndex = this._array.length - 1;
                if (index !== lastIndex) {
                    const lastValue = this._array[lastIndex];
                    this._array[index] = lastValue;
                    this._valueToIndex.set(lastValue, index);
                }
                this._array.pop();
                this._valueToIndex.delete(value);
            }
            return super.delete(key);
        }
        return false;
    }

    clear(): void {
        // 优化：使用 length = 0 更高效
        this._array.length = 0;
        this._valueToIndex.clear();
        super.clear();
    }
}
