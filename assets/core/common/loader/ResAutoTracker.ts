import type { Asset, Component } from 'cc';
import { assetManager } from 'cc';

/**
 * 一次 acquire 记录的根资源及其递归依赖（均已在引擎缓存中执行过 addRef）
 */
export interface TrackedResEntry {
    /** 本轮加载的根资源（如 Prefab、SpriteFrame 等） */
    asset: Asset;
    /** 通过 dependUtil.getDepsRecursively 得到的依赖（不含 asset 本身） */
    deps: Asset[];
}

/**
 * 基于引擎 Asset.refCount 的自动引用管理：生命周期内 acquire，销毁时统一 release。
 * - 不显式自建「第二层」计数器，仅以 addRef/decRef + 条目列表对齐逻辑所有权
 */
class ResAutoTracker {
    /** 持有者 -> 该车持有过的所有条目 */
    private readonly ownerEntries = new Map<Component, TrackedResEntry[]>();
    private debugMode = false;

    enableDebug(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /** 持有者是否已通过本追踪器占用过资源 */
    isTracking(owner: Component): boolean {
        const list = this.ownerEntries.get(owner);
        return list != null && list.length > 0;
    }

    /**
     * 为持有者增加对资源及其递归依赖的引用（主资源 + deps 各自 addRef）
     */
    acquire(owner: Component, asset: Asset | null | undefined): void {
        if (!owner || !asset) {
            return;
        }

        const deps = this.collectDependencyAssets(asset);
        asset.addRef();
        const n = deps.length;
        for (let i = 0; i < n; i++) {
            deps[i].addRef();
        }

        const entry: TrackedResEntry = { asset, deps };
        let arr = this.ownerEntries.get(owner);
        if (!arr) {
            arr = [];
            this.ownerEntries.set(owner, arr);
        }
        arr.push(entry);

        if (this.debugMode) {
            console.log(`[ResAutoTracker] acquire owner=${this.ownerLabel(owner)} asset=${asset.name} deps=${deps.length} ref(main)=${asset.refCount}`);
        }
    }

    /**
     * 为持有者批量登记资源（常用于 loadDir / loadAny）
     */
    acquireMany(owner: Component, assets: (Asset | null | undefined)[] | null | undefined): void {
        if (!owner || !assets || assets.length === 0) {
            return;
        }
        const len = assets.length;
        for (let i = 0; i < len; i++) {
            this.acquire(owner, assets[i]);
        }
    }

    /**
     * 释放持有者登记的一条「与给定 asset uuid 匹配的」条目（若同 asset 有多条仅移除最先匹配的一条）
     */
    releaseByAsset(owner: Component, asset: Asset | null | undefined): boolean {
        if (!owner || !asset) {
            return false;
        }
        const arr = this.ownerEntries.get(owner);
        if (!arr || arr.length === 0) {
            return false;
        }
        const uuid = asset.uuid;
        const idx = arr.findIndex(e => e.asset.uuid === uuid);
        if (idx < 0) {
            return false;
        }
        const [removed] = arr.splice(idx, 1);
        this.releaseEntry(owner, removed);
        if (arr.length === 0) {
            this.ownerEntries.delete(owner);
        }
        return true;
    }

    /** 路径 + bundle：从缓存取资源后解除一条逻辑引用（供 releaseRes(path) 使用） */
    releaseByPath(owner: Component, path: string, bundleName: string): boolean {
        if (!owner || !path) {
            return false;
        }
        const bundle = bundleName ? assetManager.getBundle(bundleName) : null;
        if (!bundle) {
            return false;
        }
        const a = bundle.get(path) as Asset | null;
        if (!a) {
            return false;
        }
        return this.releaseByAsset(owner, a);
    }

    /**
     * 释放持有者名下全部条目，返回被逻辑释放的条目数
     */
    releaseAll(owner: Component | null | undefined): number {
        if (!owner) {
            return 0;
        }
        const arr = this.ownerEntries.get(owner);
        if (!arr || arr.length === 0) {
            this.ownerEntries.delete(owner);
            return 0;
        }
        const count = arr.length;
        const copy = arr.splice(0, arr.length);
        this.ownerEntries.delete(owner);

        let i = copy.length - 1;
        for (; i >= 0; i--) {
            this.releaseEntry(owner, copy[i]!);
        }
        return count;
    }

    /** 持有者当前登记的根资源条目数 */
    getOwnerEntryCount(owner: Component): number {
        return this.ownerEntries.get(owner)?.length ?? 0;
    }

    getStats(): { totalOwners: number; totalTrackedRoots: number; totalDepAssetsInEntries: number } {
        let totalTrackedRoots = 0;
        let totalDepAssetsInEntries = 0;

        const owners = [...this.ownerEntries.keys()];
        const totalOwners = owners.length;

        owners.forEach((owner) => {
            const entries = this.ownerEntries.get(owner);
            const len = entries?.length ?? 0;
            if (!entries || len === 0) return;
            totalTrackedRoots += len;
            for (let i = 0; i < len; i++) {
                totalDepAssetsInEntries += entries[i]!.deps.length;
            }
        });

        return { totalOwners, totalTrackedRoots, totalDepAssetsInEntries };
    }

    printOwnerStatus(owner: Component): void {
        const entries = this.ownerEntries.get(owner);
        console.log(`\n===== ResAutoTracker ${this.ownerLabel(owner)} =====`);
        if (!entries || entries.length === 0) {
            console.log('  (无)');
        }
        else {
            entries.forEach((e, idx) => {
                console.log(`  [${idx}] ${e.asset.constructor.name} name=${e.asset.name} uuid=${e.asset.uuid} refCount=${e.asset.refCount} deps=${e.deps.length}`);
            });
        }
        console.log('========================================\n');
    }

    printStatus(): void {
        console.log('\n========== ResAutoTracker 全局 ==========');
        const stats = this.getStats();
        console.log(`  持有者数: ${stats.totalOwners} | 根资源条目: ${stats.totalTrackedRoots} | 条目内依赖条数之和: ${stats.totalDepAssetsInEntries}`);

        this.ownerEntries.forEach((entries, owner) => {
            console.log(`\n  ▸ ${this.ownerLabel(owner)} — ${entries.length} 条`);
            entries.forEach((e, i) => {
                console.log(`     [${i}] ${e.asset.constructor.name} ref=${e.asset.refCount} deps=${e.deps.length}`);
            });
        });

        console.log('=========================================\n');
    }

    /** 清空记录（不推荐运行时使用；不传参清空全部持有者） */
    clear(): void {
        this.ownerEntries.clear();
        if (this.debugMode) {
            console.warn('[ResAutoTracker] clear() — 已与引擎 refCount 不同步：仅清空表，不负责 decRef');
        }
    }

    private ownerLabel(owner: Component): string {
        const ctor = owner?.constructor?.name ?? 'Unknown';
        const nodeName = owner?.node?.name ?? '?';
        const uuidShort = owner?.uuid?.slice?.(0, 8) ?? '?';
        return `${ctor}<${nodeName}>@${uuidShort}`;
    }

    private collectDependencyAssets(root: Asset): Asset[] {
        const out: Asset[] = [];
        const seen = new Set<string>();
        seen.add(root.uuid);

        const uuidList = assetManager?.dependUtil?.getDepsRecursively?.(root.uuid);
        if (!uuidList?.length) {
            return out;
        }

        const n = uuidList.length;
        for (let i = 0; i < n; i++) {
            const id = uuidList[i] as string;
            if (!id || seen.has(id)) {
                continue;
            }
            const dep = assetManager.assets.get(id);
            if (dep && !seen.has(dep.uuid)) {
                seen.add(dep.uuid);
                out.push(dep);
            }
        }

        return out;
    }

    private releaseEntry(owner: Component, entry: TrackedResEntry): void {
        const deps = entry.deps;
        const dLen = deps.length;
        let i = dLen - 1;
        for (; i >= 0; i--) {
            deps[i]?.decRef();
        }
        entry.asset.decRef();

        if (this.debugMode) {
            console.log(`[ResAutoTracker] release owner=${this.ownerLabel(owner)} asset=${entry.asset.name}`);
        }
    }
}

export const resAutoTracker = new ResAutoTracker();