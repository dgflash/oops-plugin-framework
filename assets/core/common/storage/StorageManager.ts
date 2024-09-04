import { sys } from "cc";
import { PREVIEW } from "cc/env";
import { EncryptUtil } from "../../utils/EncryptUtil";

/** 本地存储 */
export class StorageManager {
    private _key: string | null = null;
    private _iv: string | null = null;
    private _id: string = null!;

    /**
     * 初始化密钥
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     */
    init(key: string, iv: string) {
        EncryptUtil.initCrypto(key, iv);

        this._key = EncryptUtil.md5(key);
        this._iv = EncryptUtil.md5(iv);
    }

    /**
     * 设置用户唯一标识
     * @param id 
     */
    setUser(id: string) {
        this._id = id;
    }

    /**
     * 存储本地数据
     * @param key 存储key
     * @param value 存储值
     * @returns 
     */
    set(key: string, value: any) {
        let keywords = this.getKey(key);

        if (null == key) {
            console.error("存储的key不能为空");
            return;
        }
        if (this.encrypted) {
            keywords = EncryptUtil.md5(keywords);
        }
        if (null == value) {
            console.warn("存储的值为空，则直接移除该存储");
            this.remove(key);
            return;
        }
        if (typeof value === 'function') {
            console.error("储存的值不能为方法");
            return;
        }
        if (typeof value === 'object') {
            try {
                value = JSON.stringify(value);
            }
            catch (e) {
                console.error(`解析失败，str = ${value}`);
                return;
            }
        }
        else if (typeof value === 'number') {
            value = value + "";
        }

        if (this.encrypted && null != this._key && null != this._iv) {
            value = EncryptUtil.aesEncrypt(`${value}`, this._key, this._iv);
        }
        sys.localStorage.setItem(keywords, value);
    }

    /**
     * 获取指定关键字的数据
     * @param key          获取的关键字
     * @param defaultValue 获取的默认值
     * @returns 
     */
    get(key: string, defaultValue: any = ""): string {
        if (null == key) {
            console.error("存储的key不能为空");
            return null!;
        }

        key = this.getKey(key);

        if (this.encrypted) {
            key = EncryptUtil.md5(key);
        }

        let str: string | null = sys.localStorage.getItem(key);
        if (null != str && '' !== str && this.encrypted && null != this._key && null != this._iv) {
            str = EncryptUtil.aesDecrypt(str, this._key, this._iv);
        }

        if (null === str) {
            return defaultValue;
        }
        return str;
    }

    /** 获取指定关键字的数值 */
    getNumber(key: string, defaultValue: number = 0): number {
        const r = this.get(key);
        if (r == "0") {
            return Number(r);
        }
        return Number(r) || defaultValue;
    }

    /** 获取指定关键字的布尔值 */
    getBoolean(key: string): boolean {
        const r = this.get(key);
        return r.toLowerCase() === 'true';
    }

    /** 获取指定关键字的JSON对象 */
    getJson(key: string, defaultValue?: any): any {
        const r = this.get(key);
        return (r && JSON.parse(r)) || defaultValue;
    }

    /**
     * 删除指定关键字的数据
     * @param key 需要移除的关键字
     * @returns 
     */
    remove(key: string) {
        if (null == key) {
            console.error("存储的key不能为空");
            return;
        }

        let keywords = this.getKey(key);

        if (this.encrypted) {
            keywords = EncryptUtil.md5(keywords);
        }
        sys.localStorage.removeItem(keywords);
    }

    /** 清空整个本地存储 */
    clear() {
        sys.localStorage.clear();
    }

    /** 获取数据分组关键字 */
    private getKey(key: string): string {
        if (this._id == null || this._id == "") {
            return key;
        }
        return `${this._id}_${key}`;
    }

    /** 数据加密开关 */
    private get encrypted(): boolean {
        return !PREVIEW
    }
}