import { sys } from "cc";
import { PREVIEW } from "cc/env";

export interface IStorageSecurity {
    decrypt(str: string): string;
    encrypt(str: string): string;
    encryptKey(str: string): string;
}

/** 
 * 本地存储 
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037957&doc_id=2873565
 */
export class StorageManager {
    private id: string = null!;
    private iss: IStorageSecurity = null!;

    /** 数据加密开关 */
    private get encrypted(): boolean {
        return !PREVIEW;
    }

    /** 本地存储数据加密方式初始化 */
    init(iis: IStorageSecurity) {
        this.iss = iis;
    }

    /**
     * 设置用户唯一标识
     * @param id 
     */
    setUser(id: string) {
        this.id = id;
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
            keywords = this.iss.encryptKey(keywords);
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
        else if (typeof value === 'boolean') {
            value = String(value);
        }

        if (this.encrypted) {
            value = this.iss.encrypt(value);
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
            key = this.iss.encryptKey(key);
        }

        let str: string | null = sys.localStorage.getItem(key);
        if (null != str && '' !== str && this.encrypted) {
            str = this.iss.decrypt(str);
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
            keywords = this.iss.encryptKey(keywords);
        }
        sys.localStorage.removeItem(keywords);
    }

    /** 清空整个本地存储 */
    clear() {
        sys.localStorage.clear();
    }

    /** 获取数据分组关键字 */
    private getKey(key: string): string {
        if (this.id == null || this.id == "") {
            return key;
        }
        return `${this.id}_${key}`;
    }
}