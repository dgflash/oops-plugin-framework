// import { AES, MD5, Utf8, WordArray } from 'crypto-es';

// /**
//  * CryptoES 加密库封装
//  * https://github.com/entronad/crypto-es
//  *
//  * 安装第三方库生效
//  * npm install -g yarn
//  * yarn add crypto-es
//  */
// export class EncryptUtil {
//     // 将key和iv存储为WordArray类型，这是CryptoES库需要的格式
//     private static key: WordArray;
//     private static iv: WordArray;

//     /**
//      * MD5加密
//      * @param msg 加密信息
//      */
//     static md5(msg: string): string {
//         return MD5(msg).toString();
//     }

//     /** 初始化加密库 */
//     static initCrypto(key: string, iv: string) {
//         this.key = Utf8.parse(key);
//         this.iv = Utf8.parse(iv);
//     }

//     /**
//      * AES 加密
//      * @param msg 待加密的明文
//      */
//     static aesEncrypt(msg: string): string {
//         const encrypted = AES.encrypt(msg, this.key, {
//             iv: this.iv
//         });

//         // 返回Base64格式的密文字符串
//         return encrypted.toString();
//     }

//     /**
//      * AES 解密
//      * @param cipherText 待解密的密文
//      */
//     static aesDecrypt(cipherText: string): string {
//         const decrypted = AES.decrypt(cipherText, this.key, {
//             iv: this.iv
//         });

//         // 将解密结果从WordArray转换为UTF-8字符串
//         return decrypted.toString(Utf8);
//     }
// }