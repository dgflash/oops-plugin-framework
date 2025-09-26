// import { oops } from "../../Oops";
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
//     constructor() {
//         let key = oops.config.game.localDataKey;
//         let iv = oops.config.game.localDataIv;
//         key = EncryptUtil.md5(key);
//         iv = EncryptUtil.md5(iv);
//         EncryptUtil.initCrypto(key, iv);
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