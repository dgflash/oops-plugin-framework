import { resLoader } from '../../core/common/loader/ResLoader';
import { GameComponentCtor } from '../../types/Types';

/**
 * 游戏装饰器命名空间
 */
export namespace prefab {
    /**
     * Prefab 装饰器 - 用于标记组件的预制体路径
     * @param path 预制体路径
     * @param bundleName 资源包名称（可选，默认使用 resLoader.defaultBundleName）
     * @example
     * ```typescript
     * @ccclass('V_Backpack_Prop')
     * @ecs.register('V_Backpack_Prop', false)
     * @prefab.register('gui/backpack/prefab/V_Backpack_Prop')
     * export class V_Backpack_Prop extends CCView<Backpack> {
     *     // ...
     * }
     *
     * // 使用时
     * await entity.addPrefab(V_Backpack_Prop, parentNode);
     * ```
     */
    export function register(path: string, bundleName?: string): (ctor: GameComponentCtor) => void {
        return function (ctor: GameComponentCtor): void {
            const bundle = bundleName || resLoader.defaultBundleName;
            (ctor as any).GAME_PREFAB_PATH = path;
            (ctor as any).GAME_PREFAB_BUNDLE = bundle;
        };
    }
}
