import { Node, Vec3 } from "cc";

/** 
 * 界面配置结构体
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037986&doc_id=2873565
 * @example
// 界面唯一标识
export enum UIID {
    Loading = 1,
    Window,
    Netinstable
}

// 打开界面方式1
export var UIConfigData: { [key: number]: UIConfig } = {
    [UIID.Loading]: { layer: LayerType.UI, prefab: "loading/prefab/loading", bundle: "resources" },
    [UIID.Netinstable]: { layer: LayerType.PopUp, prefab: "common/prefab/netinstable" },
    [UIID.Window]: { layer: LayerType.Dialog, prefab: "common/prefab/window" }
}

// 打开界面方式2
export class InitializeUIConfig {
    static Loading = { layer: LayerType.UI, prefab: "gui/loading/loading" }
}
 */
export interface UIConfig {
    /** -----公共属性----- */
    /** 远程包名 */
    bundle?: string;
    /** 窗口层级 */
    layer: string;
    /** 预制资源相对路径 */
    prefab: string;
    /** 是否自动施放（默认自动释放） */
    destroy?: boolean;

    /** -----弹窗属性----- */
    /** 是否触摸非窗口区域关闭（默认关闭） */
    vacancy?: boolean,
    /** 是否打开窗口后显示背景遮罩（默认关闭） */
    mask?: boolean;
    /** 是否启动真机安全区域显示（默认关闭） */
    safeArea?: boolean;
    /** 界面弹出时的节点排序索引 */
    siblingIndex?: number;
}

/** 游戏元素配置 */
export interface GameElementConfig {
    /** 预制资源相对路径 */
    prefab?: string;
    /** 游戏元素副节点 */
    parent?: Node;
    /** 游戏元素位置 */
    position?: Vec3;
    /** 游戏元素旋转 */
    eulerAngles?: Vec3;
    /** 游戏元素缩放 */
    scale?: Vec3;
    /** 远程包名 */
    bundle?: string;
    /** 节点排序索引 */
    siblingIndex?: number;
}
