import { sys } from 'cc';
import { PREVIEW } from 'cc/env';

export interface IStorageSecurity {
    key: string;
    iv: string;
    init(): void;
    decrypt(str: string): string;
    encrypt(str: string): string;
    encryptKey(str: string): string;
    dispose?(): void;
}

class LRUCache<K, V> {
    private capacity: number;
    private cache: Map<K, V>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.capacity) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

export class StorageManager {
    private id: string = null!;
    private iss: IStorageSecurity = null!;
    private keyCache: LRUCache<string, string> = new LRUCache(100);

    private get encrypted(): boolean {
        return !PREVIEW;
    }

    init(iis: IStorageSecurity) {
        this.iss = iis;
        this.iss.init();
    }

    setUser(id: string) {
        if (this.id !== id) {
            this.keyCache.clear();
        }
        this.id = id;
    }

    set(key: GameStorageKey, value: any): boolean {
        if (null == value || value === undefined) {
            console.warn('[StorageManager] 存储的值为空，则直接移除该存储');
            this.remove(key);
            return true;
        }
        if (typeof value === 'function') {
            console.error('[StorageManager] 储存的值不能为方法');
            return false;
        }
        try {
            const encryptedKey = this.getEncryptedKey(key);
            let serializedValue: string;
            if (typeof value === 'object') {
                serializedValue = JSON.stringify(value);
            }
            else if (typeof value === 'number' || typeof value === 'boolean') {
                serializedValue = String(value);
            }
            else {
                serializedValue = value;
            }
            if (this.encrypted) {
                serializedValue = this.iss.encrypt(serializedValue);
            }
            sys.localStorage.setItem(encryptedKey, serializedValue);
            return true;
        }
        catch (e) {
            console.error('[StorageManager] 存储失败:', key, e);
            return false;
        }
    }

    setBatch(data: Record<string, any>): number {
        let successCount = 0;
        const keys = Object.keys(data);
        for (const key of keys) {
            if (this.set(key as GameStorageKey, data[key])) {
                successCount++;
            }
        }
        return successCount;
    }

    get(key: GameStorageKey, defaultValue: any = ''): string {
        try {
            const encryptedKey = this.getEncryptedKey(key);
            let str: string | null = sys.localStorage.getItem(encryptedKey);
            if (null != str && '' !== str && this.encrypted) {
                str = this.iss.decrypt(str);
            }
            if (null === str || str === '') {
                return defaultValue;
            }
            return str;
        }
        catch (e) {
            console.error('[StorageManager] 读取失败:', key, e);
            return defaultValue;
        }
    }

    getBatch(keys: string[], defaultValues?: Record<string, any>): Record<string, string> {
        const result: Record<string, string> = {};
        for (const key of keys) {
            const defaultValue = defaultValues?.[key] ?? '';
            result[key] = this.get(key as GameStorageKey, defaultValue);
        }
        return result;
    }

    getNumber(key: GameStorageKey, defaultValue = 0): number {
        const r = this.get(key);
        if (r === '0') {
            return 0;
        }
        if (r === '' || r === null || r === undefined) {
            return defaultValue;
        }
        const num = Number(r);
        return isNaN(num) ? defaultValue : num;
    }

    getBoolean(key: GameStorageKey, defaultValue = false): boolean {
        const r = this.get(key);
        if (r === '' || r === null || r === undefined) {
            return defaultValue;
        }
        return r.toLowerCase() === 'true';
    }

    getJson<T = any>(key: GameStorageKey, defaultValue?: T): T {
        const r = this.get(key);
        if (!r || r === '') {
            return defaultValue as T;
        }
        try {
            return JSON.parse(r) as T;
        }
        catch (e) {
            console.error('[StorageManager] JSON解析失败:', key, e);
            return defaultValue as T;
        }
    }

    remove(key: GameStorageKey): boolean {
        const encryptedKey = this.getEncryptedKey(key);
        sys.localStorage.removeItem(encryptedKey);
        return true;
    }

    removeBatch(keys: string[]): number {
        let successCount = 0;
        for (const key of keys) {
            if (this.remove(key as GameStorageKey)) {
                successCount++;
            }
        }
        return successCount;
    }

    clear() {
        sys.localStorage.clear();
        this.keyCache.clear();
    }

    clearUser() {
        if (!this.id) {
            console.warn('[StorageManager] 未设置用户ID，无法清空用户数据');
            return;
        }
        const prefix = `${this.id}_`;
        const keysToRemove: string[] = [];
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            sys.localStorage.removeItem(key);
        }
        this.keyCache.clear();
    }

    has(key: GameStorageKey): boolean {
        const encryptedKey = this.getEncryptedKey(key);
        const value = sys.localStorage.getItem(encryptedKey);
        return value !== null;
    }

    getAllKeys(): string[] {
        const keys: string[] = [];
        const prefix = this.id ? `${this.id}_` : '';
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key) {
                if (prefix) {
                    if (key.startsWith(prefix)) {
                        keys.push(key.slice(prefix.length));
                    }
                }
                else {
                    keys.push(key);
                }
            }
        }
        return keys;
    }

    getStorageInfo(): { keyCount: number; estimatedSize: number } {
        const keys = this.getAllKeys();
        let estimatedSize = 0;
        for (const key of keys) {
            const value = this.get(key as GameStorageKey);
            estimatedSize += key.length + value.length;
        }
        return {
            keyCount: keys.length,
            estimatedSize: estimatedSize * 2
        };
    }

    dispose() {
        this.keyCache.clear();
        if (this.iss && typeof this.iss.dispose === 'function') {
            this.iss.dispose();
        }
        this.iss = null!;
    }

    private getKey(key: string): string {
        if (this.id == null || this.id == '') {
            return key;
        }
        return `${this.id}_${key}`;
    }

    private getEncryptedKey(key: string): string {
        let fullKey = this.getKey(key);
        if (!this.encrypted) {
            return fullKey;
        }
        const cached = this.keyCache.get(fullKey);
        if (cached !== undefined) {
            return cached;
        }
        const encrypted = this.iss.encryptKey(fullKey);
        this.keyCache.set(fullKey, encrypted);
        return encrypted;
    }
}
