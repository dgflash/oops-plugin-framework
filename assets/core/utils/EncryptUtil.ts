/*
 * @Author: dgflash
 * @Date: 2022-09-02 09:28:00
 * @LastEditors: dgflash
 * @LastEditTime: 2022-10-21 09:46:39
 */

import CryptoES from "crypto-es";

/** 
 * CryptoES 加密库封装 
 * https://github.com/entronad/crypto-es
 * 
 * 安装第三方库生效
 * npm install -g yarn
 * yarn add crypto-es
 */
export class EncryptUtil {
    private static key: string = null!;
    private static iv: CryptoES.lib.WordArray = null!;

    /**
     * MD5加密
     * @param msg 加密信息
     */
    static md5(msg: string): string {
        return CryptoES.MD5(msg).toString();
    }

    /** 初始化加密库 */
    static initCrypto(key: string, iv: string) {
        this.key = key;
        this.iv = CryptoES.enc.Hex.parse(iv);
    }

    /**
     * AES 加密
     * @param msg 加密信息
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     */
    static aesEncrypt(msg: string, key: string, iv: string): string {
        return CryptoES.AES.encrypt(
            msg,
            this.key,
            {
                iv: this.iv,
                format: this.JsonFormatter
            },
        ).toString();
    }

    /**
     * AES 解密
     * @param str 解密字符串
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     */
    static aesDecrypt(str: string, key: string, iv: string): string {
        const decrypted = CryptoES.AES.decrypt(
            str,
            this.key,
            {
                iv: this.iv,
                format: this.JsonFormatter
            },
        );
        return decrypted.toString(CryptoES.enc.Utf8);
    }

    private static JsonFormatter = {
        stringify: function (cipherParams: any) {
            const jsonObj: any = { ct: cipherParams.ciphertext.toString(CryptoES.enc.Base64) };
            if (cipherParams.iv) {
                jsonObj.iv = cipherParams.iv.toString();
            }
            if (cipherParams.salt) {
                jsonObj.s = cipherParams.salt.toString();
            }
            return JSON.stringify(jsonObj);
        },
        parse: function (jsonStr: any) {
            const jsonObj = JSON.parse(jsonStr);
            const cipherParams = CryptoES.lib.CipherParams.create(
                { ciphertext: CryptoES.enc.Base64.parse(jsonObj.ct) },
            );
            if (jsonObj.iv) {
                cipherParams.iv = CryptoES.enc.Hex.parse(jsonObj.iv)
            }
            if (jsonObj.s) {
                cipherParams.salt = CryptoES.enc.Hex.parse(jsonObj.s)
            }
            return cipherParams;
        },
    };
}