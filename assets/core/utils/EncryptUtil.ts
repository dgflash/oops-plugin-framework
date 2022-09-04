/*
 * @Author: dgflash
 * @Date: 2022-09-02 09:28:00
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 14:50:10
 */
/** Crypto加密 */
export class EncryptUtil {
    /**
     * AES 加密
     * @param msg 加密信息
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     */
    static aesEncrypt(msg: string, key: string, iv: string): string {
        //@ts-ignore
        let encrypt = CryptoJS.AES.encrypt(msg, key, {
            iv: iv,
            //@ts-ignore
            mode: CryptoJS.mode.CBC,
            //@ts-ignore
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypt.toString();
    }

    /**
     * AES 解密
     * @param str 解密字符串
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     */
    static aesDecrypt(str: string, key: string, iv: string): string {
        //@ts-ignore
        let decrypt = CryptoJS.AES.decrypt(str, key, {
            iv: iv,
            //@ts-ignore
            mode: CryptoJS.mode.CBC,
            //@ts-ignore
            padding: CryptoJS.pad.Pkcs7
        });
        //@ts-ignore
        return CryptoJS.enc.Utf8.stringify(decrypt);
    }
}