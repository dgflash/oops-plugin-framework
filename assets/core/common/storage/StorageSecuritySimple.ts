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
    key: string = null!;
    iv: string = null!;
    private secretkey: string = null!;

    init() {
        this.secretkey = this.key + this.iv;
    }

    /**
     * 加密字符串
     */
    encrypt(data: string): string {
        let encryptedText = '';
        for (let i = 0; i < data.length; i++) {
            let charCode = data.charCodeAt(i);
            encryptedText += String.fromCharCode(charCode + this.secretkey.length);
        }
        return encryptedText;
    }

    /** 解密字符串 */
    decrypt(encryptedData: string): string {
        let decryptedText = '';
        for (let i = 0; i < encryptedData.length; i++) {
            let charCode = encryptedData.charCodeAt(i);
            decryptedText += String.fromCharCode(charCode - this.secretkey.length);
        }
        return decryptedText;
    }

    encryptKey(str: string): string {
        return this.encrypt(str);
    }
}