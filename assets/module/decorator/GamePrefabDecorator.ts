/**
 * 游戏装饰器命名空间
 */
export namespace prefab {
    /**
     * Prefab 装饰器 - 用于标记组件的预制体路径
     * @param path 预制体路径
     * @param bundleName 资源包名称（可选，省略则在加载时回落到 resLoader.defaultBundleName）
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
    export function register(path: string, bundleName?: string): (ctor: OopsFramework.GameComponentCtor) => void {
        return function (ctor: OopsFramework.GameComponentCtor): void {
            const c = ctor as any;
            c.GAME_PREFAB_PATH = path;
            // 省略 bundleName 时留 undefined，**不要**在这里回落到 resLoader.defaultBundleName：
            // 装饰器是在模块求值（脚本包加载）时执行的，比任何启动钩子都早，那时候项目还没来得及
            // 改默认包名，快照下来的永远是框架初值 'resources'，于是「省略包名」这个用法
            // 在默认包不是 resources 的项目里必然报 “Bundle resources doesn't contain xxx”。
            // 留空交给下游 createPrefabNode / createPrefabNodeAsync 的默认参数在**调用时**求值。
            c.GAME_PREFAB_BUNDLE = bundleName;
        };
    }
}
