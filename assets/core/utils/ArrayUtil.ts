/*
 * @Author: dgflash
 * @Date: 2021-08-11 16:41:12
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 14:50:57
 */

/** 数组工具 */
export class ArrayUtil {
    /**
     * 数组去重，并创建一个新数组返回
     * @param arr  源数组
     */
    static noRepeated(arr: any[]) {
        const res = [arr[0]];
        for (let i = 1; i < arr.length; i++) {
            let repeat = false;
            for (let j = 0; j < res.length; j++) {
                if (arr[i] == res[j]) {
                    repeat = true;
                    break;
                }
            }

            if (!repeat) {
                res.push(arr[i]);
            }
        }
        return res;
    }

    /**
     * 复制二维数组
     * @param array 目标数组 
     */
    static copy2DArray(array: any[][]): any[][] {
        let newArray: any[][] = [];
        for (let i = 0; i < array.length; i++) {
            newArray.push(array[i].concat());
        }
        return newArray;
    }

    /**
     * Fisher-Yates Shuffle 随机置乱算法
     * @param array 目标数组
     */
    static fisherYatesShuffle(array: any[]): any[] {
        let count = array.length;
        while (count) {
            let index = Math.floor(Math.random() * count--);
            let temp = array[count];
            array[count] = array[index];
            array[index] = temp;
        }
        return array;
    }

    /**
     * 混淆数组
     * @param array 目标数组
     */
    static confound(array: []): any[] {
        return array.slice().sort(() => Math.random() - .5);
    }

    /**
     * 数组扁平化
     * @param array 目标数组
     */
    static flattening(array: any[]) {
        for (; array.some(v => Array.isArray(v));) {    // 判断 array 中是否有数组
            array = [].concat.apply([], array); // 压扁数组
        }
        return array;
    }

    /** 删除数组中指定项 */
    static removeItem(array: any[], item: any) {
        const temp = array.concat();
        for (let i = 0; i < temp.length; i++) {
            const value = temp[i];
            if (item == value) {
                array.splice(i, 1);
                break;
            }
        }
    }

    /**
     * 合并数组
     * @param array1 目标数组1
     * @param array2 目标数组2
     */
    static combineArrays(array1: any[], array2: any[]): any[] {
        return [...array1, ...array2];
    }

    /**
     * 获取数组中随机成员
     * @param array 目标数组
     */
    static getRandomValueInArray(array: any[]): any {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * 随机打乱数组
     * @param array 目标数组
     * @example [1,2,3,4,5] --> [5, 1, 2, 3, 4] 
     */
    static shuffleArray<T>(array: T[]): T[] {
        // 创建一个原数组的副本
        const newArr = [...array];

        // 使用Fisher-Yates 洗牌算法打乱新数组
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }

        // 返回打乱后的新数组
        return newArr;
    }

    /**
     * 获取连续数字数组, 范围在[start, end]之间
     * @param start 开始数字
     * @param end 结束数字
     * @example getNumsBetween(1, 10) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] 
     */
    static getNumsBetween(start: number, end: number): number[] {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
}
