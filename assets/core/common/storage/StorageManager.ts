import { sys } from "cc";
import { PREVIEW } from "cc/env";
import { md5 } from "../../../libs/security/Md5";
import { EncryptUtil } from "../../utils/EncryptUtil";

/** 本地存储 */
export class StorageManager {
    private _key: string | null = null;
    private _iv: string | null = null;
    private _id: number = -1;

    /**
     * 初始化密钥
     * @param key aes加密的key 
     * @param iv  aes加密的iv
     */
    init(key: string, iv: string) {
        this._key = md5(key);
        this._iv = md5(iv);
    }

    /**
     * 设置用户唯一标识
     * @param id 
     */
    setUser(id: number) {
        this._id = id;
    }

    /**
     * 存储本地数据
     * @param key 存储key
     * @param value 存储值
     * @returns 
     */
    set(key: string, value: any) {
        key = `${key}_${this._id}`;

        if (null == key) {
            console.error("存储的key不能为空");
            return;
        }
        if (!PREVIEW) {
            key = md5(key);
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

        if (!PREVIEW && null != this._key && null != this._iv) {
            try {
                value = EncryptUtil.aesEncrypt(`${value}`, this._key, this._iv);
            }
            catch (e) {
                value = null;
            }
        }
        sys.localStorage.setItem(key, value);
    }

    /**
     * 获取指定关键字的数据
     * @param key          获取的关键字
     * @param defaultValue 获取的默认值
     * @returns 
     */
    get(key: string, defaultValue?: any): string {
        if (null == key) {
            console.error("存储的key不能为空");
            return null!;
        }

        key = `${key}_${this._id}`;

        if (!PREVIEW) {
            key = md5(key);
        }
        let str: string | null = sys.localStorage.getItem(key);
        if (null != str && '' !== str && !PREVIEW && null != this._key && null != this._iv) {
            try {
                str = EncryptUtil.aesDecrypt(str, this._key, this._iv);
            }
            catch (e) {
                str = null;
            }
        }

        if (null === str) {
            return defaultValue;
        }
        return str;
    }

    /** 获取指定关键字的数值 */
    getNumber(key: string, defaultValue: number = 0): number {
        var r = this.get(key);
        return Number(r) || defaultValue;
    }

    /** 获取指定关键字的布尔值 */
    getBoolean(key: string): boolean {
        var r = this.get(key);
        return Boolean(r) || false;
    }

    /** 获取指定关键字的JSON对象 */
    getJson(key: string, defaultValue?: any): any {
        var r = this.get(key);
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

        key = `${key}_${this._id}`;

        if (!PREVIEW) {
            key = md5(key);
        }
        sys.localStorage.removeItem(key);
    }

    /** 清空整个本地存储 */
    clear() {
        sys.localStorage.clear();
    }
}