import { Asset, assetManager } from 'cc';

/**
 * 资源调试工具类
 * 用于打印和分析资源加载情况
 */
export class ResDebug {
    /**
     * 打印缓存中所有资源信息
     */
    static dump() {
        const builtinBundles = new Set(['internal', 'main', '未分类资源']);
        const uuidToInfo: { [uuid: string]: { bundle: string, path: string } } = {};

        // 从 bundle 配置中收集 uuid 映射
        assetManager.bundles.forEach((bundle) => {
            if (builtinBundles.has(bundle.name)) return;
            const config = (bundle as any)._config;
            if (!config) return;

            if (Array.isArray(config.uuids)) {
                config.uuids.forEach((uuid: string) => { uuidToInfo[uuid] = { bundle: bundle.name, path: '' }; });
            }
            if (config.paths) {
                for (const path in config.paths) {
                    const arr = config.paths[path];
                    if (Array.isArray(arr)) {
                        arr.forEach((info: any) => {
                            if (info?.uuid) uuidToInfo[info.uuid] = { bundle: bundle.name, path: info.path || path || '' };
                        });
                    }
                }
            }
            if (config.scenes) {
                for (const scene in config.scenes) {
                    const info = config.scenes[scene];
                    if (info?.uuid) uuidToInfo[info.uuid] = { bundle: bundle.name, path: info.path || scene || '' };
                }
            }
            // 处理依赖资源
            if (config.dependAssets) {
                for (const uuid in config.dependAssets) {
                    if (!uuidToInfo[uuid]) {
                        uuidToInfo[uuid] = { bundle: bundle.name, path: '' };
                    }
                }
            }
        });

        // 兜底：用 getAssetInfo 反向查找仍未映射的资源
        assetManager.assets.forEach((value: Asset, key: string) => {
            if (value.refCount <= 0 || uuidToInfo[key]) return;
            assetManager.bundles.forEach((bundle) => {
                if (builtinBundles.has(bundle.name)) return;
                const info = bundle.getAssetInfo(key);
                if (info) uuidToInfo[key] = { bundle: bundle.name, path: (info as any).path || '' };
            });
        });

        // 按 bundle 分组 - 包括所有有引用的资源
        const bundleGroups: { [bundleName: string]: { uuid: string, path: string, refCount: number, asset: Asset }[] } = {};
        
        // 先处理已映射的资源
        assetManager.assets.forEach((value: Asset, key: string) => {
            if (value.refCount <= 0) return;
            const info = uuidToInfo[key];
            if (info) {
                (bundleGroups[info.bundle] ||= []).push({ uuid: key, refCount: value.refCount, path: info.path, asset: value });
            }
        });

        // 处理未映射但有引用的资源（放入 unknown 分组）
        const unknownAssets: { uuid: string, path: string, refCount: number, asset: Asset }[] = [];
        assetManager.assets.forEach((value: Asset, key: string) => {
            if (value.refCount <= 0) return;
            if (!uuidToInfo[key]) {
                unknownAssets.push({ uuid: key, refCount: value.refCount, path: '', asset: value });
            }
        });

        // 将未分类资源归入 bundleGroups
        if (unknownAssets.length > 0) {
            bundleGroups['未分类资源'] = unknownAssets;
        }

        // 打印结果（过滤掉 builtinBundles）
        for (const bundleName in bundleGroups) {
            if (builtinBundles.has(bundleName)) continue;
            const items = bundleGroups[bundleName];
            console.group(`[ResLoader] Bundle: ${bundleName} (${items.length})`);
            console.log(`[ResLoader] ----- ${bundleName} -----`);
            console.log(items);
            console.groupEnd();
        }

        console.log(`[ResLoader] 当前资源总数: ${assetManager.assets.count}`);
    }

    /**
     * 获取资源统计信息
     */
    static getStats(): { totalAssets: number, totalBundles: number, bundleStats: { [name: string]: number } } {
        const bundleStats: { [name: string]: number } = {};
        let totalAssets = 0;

        assetManager.bundles.forEach((bundle) => {
            const count = bundle.getDirWithPath('').length;
            bundleStats[bundle.name] = count;
        });

        assetManager.assets.forEach((asset: Asset) => {
            if (asset.refCount > 0) totalAssets++;
        });

        return {
            totalAssets,
            totalBundles: (assetManager.bundles as any).size || 0,
            bundleStats
        };
    }
}