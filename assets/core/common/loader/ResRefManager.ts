import { resLoader } from './ResLoader';

export interface ResRefRecord {
    bundle: string;
    path: string;
    refCount: number;
    referrers: Set<string>;
    lastAccessTime: number;
}

export interface ComponentResInfo {
    resKeys: Set<string>;
}

class ResRefManager {
    private resRefs: Map<string, ResRefRecord> = new Map();
    private componentRefs: Map<string, ComponentResInfo> = new Map();
    private debugMode: boolean = false;

    enableDebug(enabled: boolean = true): void {
        this.debugMode = enabled;
    }

    private getResKey(bundle: string, path: string): string {
        return `${bundle}::${path}`;
    }

    private getComponentKey(component: any): string {
        if (!component) return 'unknown';
        const node = component.node;
        if (!node) return 'unknown';
        const uuid = node.uuid || 'no-uuid';
        const name = node.name || 'unnamed';
        return `${name}(${uuid.substring(0, 8)})`;
    }

    addRef(bundle: string, path: string, component: any): string {
        const resKey = this.getResKey(bundle, path);
        const compKey = this.getComponentKey(component);

        let record = this.resRefs.get(resKey);
        if (!record) {
            record = {
                bundle,
                path,
                refCount: 0,
                referrers: new Set(),
                lastAccessTime: Date.now(),
            };
            this.resRefs.set(resKey, record);
        }

        if (!record.referrers.has(compKey)) {
            record.refCount++;
            record.referrers.add(compKey);
            record.lastAccessTime = Date.now();

            if (!this.componentRefs.has(compKey)) {
                this.componentRefs.set(compKey, { resKeys: new Set() });
            }
            this.componentRefs.get(compKey)!.resKeys.add(resKey);

            if (this.debugMode) {
                console.log(`[ResRef] +1 引用: ${resKey} (总引用: ${record.refCount}, 引用者: ${compKey})`);
            }
        }

        return resKey;
    }

    removeRef(bundle: string, path: string, component: any): boolean {
        const resKey = this.getResKey(bundle, path);
        const compKey = this.getComponentKey(component);

        const record = this.resRefs.get(resKey);
        if (!record) {
            if (this.debugMode) {
                console.warn(`[ResRef] 尝试移除不存在的资源引用: ${resKey}`);
            }
            return false;
        }

        if (!record.referrers.has(compKey)) {
            if (this.debugMode) {
                console.warn(`[ResRef] 组件 ${compKey} 未引用资源 ${resKey}`);
            }
            return false;
        }

        record.refCount--;
        record.referrers.delete(compKey);

        const compInfo = this.componentRefs.get(compKey);
        if (compInfo) {
            compInfo.resKeys.delete(resKey);
        }

        if (this.debugMode) {
            console.log(`[ResRef] -1 引用: ${resKey} (剩余引用: ${record.refCount}, 引用者: ${compKey})`);
        }

        if (record.refCount <= 0) {
            this.releaseResource(resKey, record);
            return true;
        }

        return false;
    }

    releaseAllByComponent(component: any): string[] {
        const compKey = this.getComponentKey(component);
        const compInfo = this.componentRefs.get(compKey);

        if (!compInfo || compInfo.resKeys.size === 0) {
            if (this.debugMode) {
                console.log(`[ResRef] 组件 ${compKey} 没有资源引用`);
            }
            return [];
        }

        const releasedResources: string[] = [];
        const resKeysToProcess = Array.from(compInfo.resKeys);

        for (const resKey of resKeysToProcess) {
            const record = this.resRefs.get(resKey);
            if (!record) continue;

            record.refCount--;
            record.referrers.delete(compKey);

            if (this.debugMode) {
                console.log(`[ResRef] -1 引用: ${resKey} (剩余引用: ${record.refCount}, 组件销毁: ${compKey})`);
            }

            if (record.refCount <= 0) {
                this.releaseResource(resKey, record);
                releasedResources.push(resKey);
            }
        }

        this.componentRefs.delete(compKey);

        return releasedResources;
    }

    private releaseResource(resKey: string, record: ResRefRecord): void {
        if (this.debugMode) {
            console.log(`[ResRef] 🗑️ 释放资源: ${resKey} (引用者: [${Array.from(record.referrers).join(', ')}])`);
        }

        resLoader.release(record.path, record.bundle);
        this.resRefs.delete(resKey);

        for (const compKey of record.referrers) {
            const compInfo = this.componentRefs.get(compKey);
            if (compInfo) {
                compInfo.resKeys.delete(resKey);
            }
        }
    }

    getRefCount(bundle: string, path: string): number {
        const resKey = this.getResKey(bundle, path);
        const record = this.resRefs.get(resKey);
        return record ? record.refCount : 0;
    }

    getReferrers(bundle: string, path: string): string[] {
        const resKey = this.getResKey(bundle, path);
        const record = this.resRefs.get(resKey);
        return record ? Array.from(record.referrers) : [];
    }

    hasRef(bundle: string, path: string): boolean {
        const resKey = this.getResKey(bundle, path);
        return this.resRefs.has(resKey);
    }

    getComponentResCount(component: any): number {
        const compKey = this.getComponentKey(component);
        const compInfo = this.componentRefs.get(compKey);
        return compInfo ? compInfo.resKeys.size : 0;
    }

    printStatus(): void {
        console.log('\n========== 全局资源引用状态 ==========');
        console.log(`总资源数: ${this.resRefs.size}`);
        console.log(`总组件数: ${this.componentRefs.size}`);

        if (this.resRefs.size > 0) {
            console.log('\n[资源引用详情]');
            const sortedRecords = Array.from(this.resRefs.entries()).sort((a, b) => b[1].refCount - a[1].refCount);

            for (const [key, record] of sortedRecords) {
                console.log(`  ${key}`);
                console.log(`    引用计数: ${record.refCount}`);
                console.log(`    引用者: [${Array.from(record.referrers).join(', ')}]`);
            }
        }

        if (this.componentRefs.size > 0) {
            console.log('\n[组件资源详情]');
            for (const [compKey, compInfo] of this.componentRefs) {
                console.log(`  ${compKey}: ${compInfo.resKeys.size} 个资源`);
            }
        }

        console.log('=====================================\n');
    }

    printComponentStatus(component: any): void {
        const compKey = this.getComponentKey(component);
        const compInfo = this.componentRefs.get(compKey);

        console.log(`\n===== 组件资源状态: ${compKey} =====`);
        if (!compInfo || compInfo.resKeys.size === 0) {
            console.log('  无资源引用');
        }
        else {
            console.log(`  引用资源数: ${compInfo.resKeys.size}`);
            for (const resKey of compInfo.resKeys) {
                const record = this.resRefs.get(resKey);
                if (record) {
                    console.log(`    - ${resKey} (全局引用: ${record.refCount})`);
                }
            }
        }
        console.log('================================\n');
    }

    getTotalStats(): { totalResources: number; totalComponents: number; totalRefs: number } {
        let totalRefs = 0;
        for (const record of this.resRefs.values()) {
            totalRefs += record.refCount;
        }
        return {
            totalResources: this.resRefs.size,
            totalComponents: this.componentRefs.size,
            totalRefs,
        };
    }

    clear(): void {
        if (this.debugMode) {
            console.log('[ResRef] 清空所有资源引用记录');
        }
        this.resRefs.clear();
        this.componentRefs.clear();
    }
}

export const resRef = new ResRefManager();
