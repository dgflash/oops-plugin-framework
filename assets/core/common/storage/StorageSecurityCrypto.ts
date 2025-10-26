// import { EncryptUtil } from "../../utils/EncryptUtil";
// import { IStorageSecurity } from "./StorageManager";

// /**
//  * 本地存储加密
//  * 优点：
//  * 1、加密强度更高
//  *
//  * 缺点：
//  * 1、整体代码体积增加约200KB
//  * 2、需要下载 CryptoES 加密库
//  */
// export class StorageSecurityCrypto implements IStorageSecurity {
//     key: string = null!;
//     iv: string = null!;

//     init() {
//         this.key = EncryptUtil.md5(this.key);
//         this.iv = EncryptUtil.md5(this.iv);
//         EncryptUtil.initCrypto(this.key, this.iv);
//     }

//     decrypt(str: string): string {
//         return EncryptUtil.aesDecrypt(str);
//     }

//     encrypt(str: string): string {
//         return EncryptUtil.aesEncrypt(str);
//     }

//     encryptKey(str: string): string {
//         return EncryptUtil.md5(str);
//     }
// }