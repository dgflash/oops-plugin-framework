import { Asset, assetManager } from 'cc';

/** 检查字符串是否有效 */
export function isValidString(str: any): str is string {
    return typeof str === 'string' && str.trim() !== '';
}

/** 输出警告日志 */
export function warn(method: string, msg: string) {
    console.warn(`[ResLoader] ${method}: ${msg}`);
}

/** 输出错误日志 */
export function error(method: string, msg: string, cause?: Error | string) {
    const message = cause ? `${msg}\n原因: ${cause instanceof Error ? cause.message : cause}` : msg;
    console.error(`[ResLoader] ${method}: ${message}`);
}

/** 创建错误对象 */
export function createError(method: string, msg: string, cause?: Error | string): Error {
    const message = cause ? `${msg}\n原因: ${cause instanceof Error ? cause.message : cause}` : msg;
    return new Error(`[ResLoader] ${method}: ${message}`);
}

/** 释放预制依赖资源（递归释放所有依赖） */
export function releasePrefabDepsRecursively(uuid: string | Asset, visited: Set<string> = new Set()) {
    let asset: Asset | null | undefined;
    if (uuid instanceof Asset) {
        asset = uuid;
    }
    else {
        asset = assetManager.assets.get(uuid);
    }

    if (!asset) return;

    const assetUuid = (asset as any).uuid || '';
    if (assetUuid && visited.has(assetUuid)) return;
    if (assetUuid) visited.add(assetUuid);

    const dependentAssets = (asset as any).dependentAssets;
    if (dependentAssets && dependentAssets.size > 0) {
        dependentAssets.forEach((depAsset: Asset) => {
            releasePrefabDepsRecursively(depAsset, visited);
        });
    }

    asset.decRef();
}