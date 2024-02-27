
/** 字典 */
export class Dictionary<TKey, TValue> {
    private map: Map<TKey, TValue> | undefined = new Map<TKey, TValue>();
    private list: Array<TValue> = [];

    /**
     * 设置
     * @param key 
     * @param value 
     */
    set(key: TKey, value: TValue): void {
        let old: TValue;
        //删除老的
        if (this.map.has(key)) {
            old = this.map.get(key);
            const index: number = this.list.indexOf(old);
            if (index < 0) {
                throw new Error("Dictionary内部逻辑错误");
            }
            this.map.delete(key);
            this.list.splice(index, 1);
        }
        this.map.set(key, value);
        this.list.push(value);
    }

    /**
     * 指定关键字数据是否存在
     * @param key 
     * @returns 
     */
    has(key: TKey): boolean {
        return this.map.has(key);
    }

    /**
     * 获取指定元素
     * @param key 
     * @returns 
     */
    get(key: TKey): TValue | undefined {
        return this.map.get(key);
    }

    /**
     * 通过索引获取元素
     * @param index 
     * @returns 
     */
    getValue(index: number): TValue | undefined {
        if (index >= this.list.length) {
            throw new Error(index + "索引超出0-" + this.list.length + "范围");
        }
        return this.list[index];
    }

    /**
     * 删除指定元素
     * @param key 
     * @returns 
     */
    delete(key: TKey): TValue | undefined {
        if (!this.map.has(key)) {
            return undefined;
        }
        const result = this.map.get(key);
        const index: number = this.list.indexOf(result);
        if (index < 0) {
            throw new Error("Dictionary内部逻辑错误！");
        }
        this.list.splice(index, 1);
        this.map.delete(key);
        return result;
    }

    /** 清除所有元素 */
    clear() {
        this.map.clear();
        this.list.length = 0;
    }

    /** 元素列表 */
    get elements(): Array<TValue> {
        return this.list;
    }

    /** 数据数量 */
    get size(): number {
        return this.map.size;
    }

    destroy(): void {
        this.map.clear();
        this.map = null;
        this.list = null;
    }
}