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

        // 先进行异或加密
        const xorEncrypted = this.xorEncrypt(data);

        // 然后进行 Base64 编码
        return this.base64Encode(xorEncrypted);
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

    /** 解密字符串 */
    decrypt(encryptedData: string): string {
        if (!encryptedData) return '';

        // 先进行 Base64 解码
        const base64Decoded = this.base64Decode(encryptedData);

        // 然后进行异或解密
        return this.xorDecrypt(base64Decoded);
    }

    /** 异或解密 */
    private xorDecrypt(encryptedData: string): string {
        return this.xorEncrypt(encryptedData); // 异或操作是可逆的
    }

    /**
     * 安全的 Base64 编码
     */
    private base64Encode(data: string): string {
        // 使用浏览器或 Node.js 的 Base64 编码
        if (typeof btoa === 'function') {
            return btoa(data);
        }
        else if (typeof Buffer !== 'undefined') {
            return Buffer.from(data).toString('base64');
        }
        else {
            // 回退到纯 JavaScript 实现
            return this.fallbackBase64Encode(data);
        }
    }

    /**
     * 安全的 Base64 解码
     */
    private base64Decode(base64String: string): string {
        // 使用浏览器或 Node.js 的 Base64 解码
        if (typeof atob === 'function') {
            return atob(base64String);
        }
        else if (typeof Buffer !== 'undefined') {
            return Buffer.from(base64String, 'base64').toString('utf8');
        }
        else {
            // 回退到纯 JavaScript 实现
            return this.fallbackBase64Decode(base64String);
        }
    }

    /**
     * 回退的 Base64 编码实现
     */
    private fallbackBase64Encode(data: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let output = '';
        let i = 0;

        while (i < data.length) {
            const byte1 = data.charCodeAt(i++);
            const byte2 = data.charCodeAt(i++);
            const byte3 = data.charCodeAt(i++);

            const enc1 = byte1 >> 2;
            const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
            const enc3 = isNaN(byte2) ? 64 : ((byte2 & 15) << 2) | (byte3 >> 6);
            const enc4 = isNaN(byte3) ? 64 : byte3 & 63;

            output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
        }

        return output;
    }

    /**
     * 回退的 Base64 解码实现
     */
    private fallbackBase64Decode(base64String: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let output = '';
        let i = 0;

        base64String = base64String.replace(/[^A-Za-z0-9+/]/g, '');

        while (i < base64String.length) {
            const enc1 = chars.indexOf(base64String.charAt(i++));
            const enc2 = chars.indexOf(base64String.charAt(i++));
            const enc3 = chars.indexOf(base64String.charAt(i++));
            const enc4 = chars.indexOf(base64String.charAt(i++));

            const byte1 = (enc1 << 2) | (enc2 >> 4);
            const byte2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const byte3 = ((enc3 & 3) << 6) | enc4;

            output += String.fromCharCode(byte1);
            if (enc3 !== 64) output += String.fromCharCode(byte2);
            if (enc4 !== 64) output += String.fromCharCode(byte3);
        }

        return output;
    }

    encryptKey(str: string): string {
        return this.encrypt(str);
    }
}