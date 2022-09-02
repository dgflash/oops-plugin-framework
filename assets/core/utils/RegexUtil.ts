/*
 * @Author: dgflash
 * @Date: 2022-07-26 15:29:57
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:08:25
 */

/** 正则工具 */
export class RegexUtil {
    /**
     * 判断字符是否为双字节字符（如中文字符）
     * @param string 原字符串
     */
    static isDoubleWord(string: string): boolean {
        return /[^\x00-\xff]/.test(string);
    }
}
