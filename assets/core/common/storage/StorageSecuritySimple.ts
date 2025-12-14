import type { IStorageSecurity } from './StorageManager';

/**
 * 本地存储加密
 * 优点：
 * 1、代码体积小
 * 2、不依赖第三方库，使用这套方案可删除
 *    StorageSecurityCrypto.ts
 *    EncryptUtil.ts
 *    package.json 中的crypto依赖减小包体
 * 3、使用异或加密算法，跨平台兼容性好
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
     * 异或加密字符串
     * 使用异或算法可以避免不同平台上字符编码差异导致的解密问题
     */
    encrypt(data: string): string {
        let encryptedText = '';
        const keyLength = this.secretkey.length;
        
        for (let i = 0; i < data.length; i++) {
            const keyChar = this.secretkey.charCodeAt(i % keyLength);
            const dataChar = data.charCodeAt(i);
            encryptedText += ('00' + (dataChar ^ keyChar).toString(16)).slice(-2);
        }
        
        return encryptedText;
    }

    /**
     * 异或解密字符串
     */
    decrypt(encryptedData: string): string {
        let decryptedText = '';
        const keyLength = this.secretkey.length;
        
        for (let i = 0; i < encryptedData.length; i += 2) {
            const keyChar = this.secretkey.charCodeAt((i / 2) % keyLength);
            const encryptedChar = parseInt(encryptedData.slice(i, i + 2), 16);
            decryptedText += String.fromCharCode(encryptedChar ^ keyChar);
        }
        
        return decryptedText;
    }

    encryptKey(str: string): string {
        return this.encrypt(str);
    }
}
