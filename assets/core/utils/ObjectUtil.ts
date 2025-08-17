/*
 * @Author: dgflash
 * @Date: 2022-07-26 15:29:57
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:07:54
 */

/** 对象工具 */
export class ObjectUtil {
    /**
     * 判断指定的值是否为对象
     * @param value 值
     */
    static isObject(value: any): boolean {
        return Object.prototype.toString.call(value) === '[object Object]';
    }

    /**
     * 深拷贝
     * @param target 目标
     */
    static deepCopy(target: any): any {
        if (target == null || typeof target !== 'object') {
            return target;
        }

        let result: any = null;

        if (target instanceof Date) {
            result = new Date();
            result.setTime(target.getTime());
            return result;
        }

        if (target instanceof Array) {
            result = [];
            for (let i = 0, length = target.length; i < length; i++) {
                result[i] = this.deepCopy(target[i]);
            }
            return result;
        }

        if (target instanceof Object) {
            result = {};
            for (const key in target) {
                if (target.hasOwnProperty(key)) {
                    result[key] = this.deepCopy(target[key]);
                }
            }
            return result;
        }

        console.warn(`不支持的类型：${result}`);
    }

    /**
     * 拷贝对象
     * @param target 目标
     */
    static copy(target: object): object {
        return JSON.parse(JSON.stringify(target));
    }

    /**
     * @function 检测是否为非法对象，比如"",null, undefined, NaN, [], {}
     * @param {any} obj 任意基础数据对象，如：number、string、array、object等
     * @returns boolean 非法为trre, 否则为false
     */
    static isIllegalObject(obj: any): boolean {
        // 检查是否为空或未定义
        if (obj == null || obj == undefined) return true;
        // 检查是否是特殊值
        if (obj === Infinity || obj === -Infinity) return true;
        // 检测是否包含空格的字符串
        if (typeof obj === "string" && obj.trim() === "") return true;
        // 检查是否是无效的数字
        if (Number.isNaN(obj)) return true;
        // 检查是否是空数组
        if (Array.isArray(obj) && obj.length <= 0) return true;
        // 检查是否是空对象
        if (typeof (obj) == "object" && Object.keys(obj).length <= 0) return true;
        return false;
    }
}
