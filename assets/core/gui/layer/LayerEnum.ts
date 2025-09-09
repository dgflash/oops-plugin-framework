import { UIConfig } from "./UIConfig";

/** 界面编号 */
export type Uiid = number | string | UIConfig | Function;
/** 界面配置集合 */
export type UIConfigMap = { [key: string]: UIConfig }

/** 屏幕适配类型 */
export enum ScreenAdapterType {
    /** 自动适配 */
    Auto,
    /** 横屏适配 */
    Landscape,
    /** 竖屏适配 */
    Portrait
}

/** 自定义层类型 */
export enum LayerCustomType {
    /** 二维游戏层 */
    Game = "LayerGame",
    /** 消息提示层 */
    Notify = "LayerNotify",
    /** 新手引导层 */
    Guide = "LayerGuide"
}

/** 界面层类型 */
export enum LayerType {
    /** 主界面层 */
    UI = "LayerUI",
    /** 弹窗层 */
    PopUp = "LayerPopUp",
    /** 模式窗口层 */
    Dialog = "LayerDialog",
    /** 系统触发模式窗口层 */
    System = "LayerSystem",
}

/** 界面层组件类型 */
export enum LayerTypeCls {
    /** 主界面层 */
    UI = "UI",
    /** 弹窗层 */
    PopUp = "PopUp",
    /** 模式窗口层 */
    Dialog = "Dialog",
    /** 消息提示层 */
    Notify = "Notify",
    /** 游戏层 */
    Game = "Game",
    /** 自定义节点层 */
    Node = "Node"
}