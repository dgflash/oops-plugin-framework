/** Crypto加密 */
export class EncryptUtil {
    /**
     * AES 加密
     * @param msg 加密信息
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     * @returns 
     */
    static aesEncrypt(msg: string, key: string, iv: string): string {
        //@ts-ignore
        let encrypt = CryptoJS.AES.encrypt(msg, utf8Parse(key), {
            iv: this.utf8Parse(iv),
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
     * @returns 
     */
    static aesDecrypt(str: string, key: string, iv: string): string {
        //@ts-ignore
        let decrypt = CryptoJS.AES.decrypt(str, this.utf8Parse(key), {
            iv: this.utf8Parse(iv),
            //@ts-ignore
            mode: CryptoJS.mode.CBC,
            //@ts-ignore
            padding: CryptoJS.pad.Pkcs7
        });
        //@ts-ignore
        return CryptoJS.enc.Utf8.stringify(decrypt);
    }

    private static utf8Parse(utf8Str: string): string {
        //@ts-ignore
        return CryptoJS.enc.Utf8.parse(utf8Str);
    }
}