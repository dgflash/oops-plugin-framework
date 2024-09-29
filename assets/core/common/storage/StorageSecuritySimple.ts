import { oops } from "../../Oops";
import { IStorageSecurity } from "./StorageManager";

/** 
 * 本地存储加密
 * 优点：
 * 1、代码体积小
 * 2、不依赖第三方库，使用这套方案可删除 
 *    StorageSecurityCrypto.ts
 *    EncryptUtil.ts
 *    package.json 中的crypto依赖减小包体
 * 
 * 缺点：
 * 1、加密强度小
 */
export class StorageSecuritySimple implements IStorageSecurity {
    private secretkey: string = null!;

    constructor() {
        const key = oops.config.game.localDataKey;
        const iv = oops.config.game.localDataIv;
        this.secretkey = key + iv;
    }

    encrypt(str: string): string {
        let er = '';
        for (let i = 0; i < str.length; i++) {
            er += String.fromCharCode(str.charCodeAt(i) ^ this.secretkey.charCodeAt(i % this.secretkey.length));
        }
        return er;
    }

    decrypt(str: string): string {
        let dr = '';
        for (let i = 0; i < str.length; i++) {
            dr += String.fromCharCode(str.charCodeAt(i) ^ this.secretkey.charCodeAt(i % this.secretkey.length));
        }
        return dr;
    }

    encryptKey(str: string): string {
        return this.encrypt(str);
    }
}