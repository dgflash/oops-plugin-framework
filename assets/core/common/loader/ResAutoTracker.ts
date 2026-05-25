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

    /**
     * 启用或关闭调试模式
     * @param enabled - 是否启用调试输出
     */
    enableDebug(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * 获取追踪器统计信息
     * @returns 包含持有者数、根资源条目数、依赖条数之和的统计对象
     */
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

    /**
     * 打印指定持有者的资源状态到控制台
     * @param owner - 资源持有者（Component）
     */
    printOwnerStatus(owner: Component): void {
        const entries = this.ownerEntries.get(owner);
        console.log(`\n===== ResAutoTracker ${this.ownerLabel(owner)} =====`);
        if (!entries || entries.length === 0) {
            console.log('  (无)');
        }
        else {
            console.table(entries.map((e, idx) => ({
                类型: e.asset.constructor.name,
                名称: e.asset.name,
                唯一标识: e.asset.uuid,
                引用数: e.asset.refCount,
                依赖数: e.deps.length
            })));
        }
        console.log('========================================\n');
    }

    /**
     * 打印追踪器全局状态到控制台
     */
    printStatus(): void {
        console.log('\n========== ResAutoTracker 全局 ==========');
        const stats = this.getStats();
        console.log(`  持有者数: ${stats.totalOwners} | 根资源条目: ${stats.totalTrackedRoots} | 条目内依赖条数之和: ${stats.totalDepAssetsInEntries}`);

        this.ownerEntries.forEach((entries, owner) => {
            console.log(`\n  ▸ ${this.ownerLabel(owner)} — ${entries.length} 条`);
            console.table(entries.map((e, i) => ({
                类型: e.asset.constructor.name,
                名称: e.asset.name,
                引用: e.asset.refCount,
                依赖数: e.deps.length
            })));
        });

        console.log('=========================================\n');
    }

    /**
     * 持有者是否已通过本追踪器占用过资源
     * @param owner - 资源持有者（Component）
     * @returns 是否正在追踪该持有者的资源
     */
    isTracking(owner: Component): boolean {
        const list = this.ownerEntries.get(owner);
        return list != null && list.length > 0;
    }

    /**
     * 为持有者增加对资源及其递归依赖的引用（主资源 + deps 各自 addRef）
     * @param owner - 资源持有者（Component）
     * @param asset - 要引用的资源，可为 null 或 undefined
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
            console.log(`[ResAutoTracker] 获取 [持有者]${this.ownerLabel(owner)} [资源]${asset.name} [依赖数]${deps.length} [引用数]${asset.refCount}`);
        }
    }

    /**
     * 为持有者批量登记资源（常用于 loadDir / loadAny）
     * @param owner - 资源持有者（Component）
     * @param assets - 要引用的资源数组，可为 null 或 undefined
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
     * @param owner - 资源持有者（Component）
     * @param asset - 要释放的资源，可为 null 或 undefined
     * @returns 是否成功释放
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

    /**
     * 路径 + bundle：从缓存取资源后解除一条逻辑引用（供 releaseRes(path) 使用）
     * @param owner - 资源持有者（Component）
     * @param path - 资源路径
     * @param bundleName - bundle 名称
     * @returns 是否成功释放
     */
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
     * @param owner - 资源持有者（Component），可为 null 或 undefined
     * @returns 被释放的条目数量
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

    /**
     * 持有者当前登记的根资源条目数
     * @param owner - 资源持有者（Component）
     * @returns 该持有者登记的条目数量
     */
    getOwnerEntryCount(owner: Component): number {
        return this.ownerEntries.get(owner)?.length ?? 0;
    }

    /**
     * 生成持有者的标签字符串（用于调试输出）
     * @param owner - 资源持有者（Component）
     * @returns 格式化的持有者标签字符串
     */
    private ownerLabel(owner: Component): string {
        const ctor = owner?.constructor?.name ?? 'Unknown';
        const nodeName = owner?.node?.name ?? '?';
        const uuidShort = owner?.uuid?.slice?.(0, 8) ?? '?';
        return `${ctor}<${nodeName}>@${uuidShort}`;
    }

    /**
     * 收集指定资源的递归依赖资源列表
     * @param root - 根资源
     * @returns 依赖资源数组（不含根资源本身）
     */
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

    /**
     * 释放单个条目（执行 decRef 操作）
     * @param owner - 资源持有者（Component）
     * @param entry - 要释放的追踪条目
     */
    private releaseEntry(owner: Component, entry: TrackedResEntry): void {
        const deps = entry.deps;
        const dLen = deps.length;
        let i = dLen - 1;
        for (; i >= 0; i--) {
            deps[i]?.decRef();
        }
        entry.asset.decRef();

        if (this.debugMode) {
            console.log(`[ResAutoTracker] 释放 [持有者]${this.ownerLabel(owner)} [资源]${entry.asset.name}`);
        }
    }
}

export const resAutoTracker = new ResAutoTracker();
