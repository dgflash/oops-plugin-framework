/** 引擎 utils.ts 中有一些基础数学方法 */

/**
 * 随机管理
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037911&doc_id=2873565
 */
export class RandomManager {
    private static _instance: RandomManager;
    private random: any = null!;

    /** 随机数管理单例对象 */
    static get instance(): RandomManager {
        if (!this._instance) {
            this._instance = new RandomManager();
            this._instance.setRandom(Math.random);
        }
        return this._instance;
    }

    /** 设置第三方随机库 */
    setRandom(random: any) {
        this.random = random;
    }

    private getRandom(): number {
        return this.random();
    }

    /**
     * 生成指定范围的随机浮点数
     * @param min   最小值
     * @param max   最大值
     */
    getRandomFloat(min = 0, max = 1): number {
        return this.getRandom() * (max - min) + min;
    }

    /**
     * 生成指定范围的随机整数
     * @param min   最小值
     * @param max   最大值
     * @param type  类型
     * @example
    var min = 1;
    var max = 10;
    // [min,max) 得到一个两数之间的随机整数,这个值不小于min（如果min不是整数的话，得到一个向上取整的 min），并且小于（但不等于）max
    RandomManager.instance.getRandomInt(min, max, 1);

    // [min,max] 得到一个两数之间的随机整数，包括两个数在内
    RandomManager.instance.getRandomInt(min, max, 2);

    // (min,max) 得到一个两数之间的随机整数，不包括min和max
    RandomManager.instance.getRandomInt(min, max, 3);
     */
    getRandomInt(min: number, max: number, type = 2): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        switch (type) {
        case 1: // [min,max) 得到一个两数之间的随机整数,这个值不小于min（如果min不是整数的话，得到一个向上取整的 min），并且小于（但不等于）max
            return Math.floor(this.getRandom() * (max - min)) + min;
        case 2: // [min,max] 得到一个两数之间的随机整数，包括两个数在内
            return Math.floor(this.getRandom() * (max - min + 1)) + min;
        case 3: { // (min,max) 得到一个两数之间的随机整数，不包括min和max
            const range = max - min - 1;
            if (range <= 0) {
                console.warn(`getRandomInt: 开区间(${min}, ${max})内没有整数`);
                return min;
            }
            return Math.floor(this.getRandom() * range) + min + 1;
        }
        }
        return 0;
    }

    /**
     * 根据最大值，最小值范围生成随机数数组（可重复）
     * @param min   最小值
     * @param max   最大值
     * @param n     随机个数
     * @example
    var a = RandomManager.instance.getRandomByMinMaxList(50, 100, 5)
    console.log("随机的数字", a);
     */
    getRandomByMinMaxList(min: number, max: number, n: number): Array<number> {
        if (n <= 0) {
            return [];
        }
        const result: Array<number> = [];
        for (let i = 0; i < n; i++) {
            result.push(this.getRandomInt(min, max));
        }
        return result;
    }

    /**
     * 获取数组中随机对象（不重复抽取）
     * @param objects 对象数组
     * @param n 随机个数（不能超过数组长度）
     * @example
    var b = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var r = RandomManager.instance.getRandomByObjectList(b, 5);
    console.log("原始的对象", b);
    console.log("随机的对象", r);
     */
    getRandomByObjectList<T>(objects: Array<T>, n: number): Array<T> {
        if (n > objects.length) {
            console.warn(`getRandomByObjectList: 请求数量(${n})超过数组长度(${objects.length})，已自动调整为数组长度`);
            n = objects.length;
        }
        if (n <= 0) {
            return [];
        }

        const temp: Array<T> = objects.slice();
        const result: Array<T> = [];
        for (let i = 0; i < n; i++) {
            const index = this.getRandomInt(0, temp.length, 1);
            result.push(temp.splice(index, 1)[0]);
        }
        return result;
    }

    /**
     * 定和随机分配（将一个总和随机分配成n份）
     * @param n     随机数量
     * @param sum   随机元素总和（必须为正数）
     * @example
    var c = RandomManager.instance.getRandomBySumList(5, 100);
    console.log("定和随机分配", c);
     */
    getRandomBySumList(n: number, sum: number): number[] {
        if (sum < 0) {
            console.warn(`getRandomBySumList: sum(${sum})不能为负数`);
            return [];
        }
        if (n <= 0) {
            return [];
        }

        let residue = sum;
        const result: Array<number> = [];
        for (let i = 0; i < n; i++) {
            let value: number;
            if (i === n - 1) {
                // 最后一个元素取剩余值，确保总和准确
                value = residue;
            }
            else {
                // 使用 [0, residue] 区间，允许取到 0 和 residue
                if (residue <= 0) {
                    value = 0;
                }
                else {
                    // 使用 type 2 [0, residue]，确保能取到边界值
                    value = this.getRandomInt(0, residue, 2);
                }
                residue -= value;
            }
            result.push(value);
        }
        return result;
    }
}