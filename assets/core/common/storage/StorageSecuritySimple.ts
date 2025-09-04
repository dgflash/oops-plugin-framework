import { oops } from '../../Oops';
import { IStorageSecurity } from './StorageManager';

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

    /**
     * 加密字符串
     */
    encrypt(data: string): string {
        if (!data) return '';
        return this.xorEncrypt(data);
    }

    /** 解密字符串 */
    decrypt(encryptedData: string): string {
        if (!encryptedData) return '';
        return this.xorDecrypt(encryptedData);
    }

    /** 异或加密 */
    private xorEncrypt(data: string): string {
        let result = '';
        for (let i = 0; i < data.length; i++) {
            const keyChar = this.secretkey.charCodeAt(i % this.secretkey.length);
            const dataChar = data.charCodeAt(i);
            result += String.fromCharCode(dataChar ^ keyChar);
        }
        return result;
    }

    /** 异或解密 */
    private xorDecrypt(encryptedData: string): string {
        return this.xorEncrypt(encryptedData); // 异或操作是可逆的
    }

    encryptKey(str: string): string {
        return this.encrypt(str);
    }
}