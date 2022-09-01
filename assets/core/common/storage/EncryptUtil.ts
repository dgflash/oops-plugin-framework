/*
 * @Author: gagahappy<15020055@qq.com>
 * @Date: 2022-09-01 15:13:19
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-01 19:17:24
 * @Description: 
 */

/** Crypto加密 */
export module EncryptUtil {
    /**
     * AES 加密
     * @param msg 
     * @param key 
     * @param iv 
     * @returns 
     */
    export function aesEncrypt(msg: string, key: string, iv: string): string {
        //@ts-ignore
        let encrypt = CryptoJS.AES.encrypt(msg, utf8Parse(key), {
            iv: utf8Parse(iv),
            //@ts-ignore
            mode: CryptoJS.mode.CBC,
            //@ts-ignore
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypt.toString();
    }

    /**
     * AES 解密
     * @param str 
     * @param key 
     * @param iv 
     * @returns 
     */
    export function aesDecrypt(str: string, key: string, iv: string): string {
        //@ts-ignore
        let decrypt = CryptoJS.AES.decrypt(str, utf8Parse(key), {
            iv: utf8Parse(iv),
            //@ts-ignore
            mode: CryptoJS.mode.CBC,
            //@ts-ignore
            padding: CryptoJS.pad.Pkcs7
        });
        //@ts-ignore
        return CryptoJS.enc.Utf8.stringify(decrypt);
    }

    function utf8Parse(utf8Str: string): string {
        //@ts-ignore
        return CryptoJS.enc.Utf8.parse(utf8Str);
    }
}