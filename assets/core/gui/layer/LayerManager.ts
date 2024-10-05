import { Camera, Layers, Node, ResolutionPolicy, Widget, macro, screen, view, warn } from "cc";
import { oops } from "../../Oops";
import { UICallbacks } from "./Defines";
import { DelegateComponent } from "./DelegateComponent";
import { LayerDialog } from "./LayerDialog";
import { LayerNotify } from "./LayerNotify";
import { LayerPopUp } from "./LayerPopup";
import { LayerUI } from "./LayerUI";

/** 屏幕适配类型 */
export enum ScreenAdapterType {
    /** 自动适配 */
    Auto,
    /** 横屏适配 */
    Landscape,
    /** 竖屏适配 */
    Portrait
}

/** 界面层类型 */
export enum LayerType {
    /** 二维游戏层 */
    Game = "LayerGame",
    /** 主界面层 */
    UI = "LayerUI",
    /** 弹窗层 */
    PopUp = "LayerPopUp",
    /** 模式窗口层 */
    Dialog = "LayerDialog",
    /** 系统触发模式窗口层 */
    System = "LayerSystem",
    /** 滚动消息提示层 */
    Notify = "LayerNotify",
    /** 新手引导层 */
    Guide = "LayerGuide"
}

/** 
 * 界面配置结构体
 * @example
// 界面唯一标识
export enum UIID {
    Loading = 1,
    Window,
    Netinstable
}

// 打开界面方式的配置数据
export var UIConfigData: { [key: number]: UIConfig } = {
    [UIID.Loading]: { layer: LayerType.UI, prefab: "loading/prefab/loading", bundle: "resources" },
    [UIID.Netinstable]: { layer: LayerType.PopUp, prefab: "common/prefab/netinstable" },
    [UIID.Window]: { layer: LayerType.Dialog, prefab: "common/prefab/window" }
}
 */
export interface UIConfig {
    /** -----公共属性----- */
    /** 远程包名 */
    bundle?: string;
    /** 窗口层级 */
    layer: LayerType;
    /** 预制资源相对路径 */
    prefab: string;
    /** 是否自动施放（默认不自动释放） */
    destroy?: boolean;

    /** -----弹窗属性----- */
    /** 是否触摸非窗口区域关闭（默认关闭） */
    vacancy?: boolean,
    /** 是否打开窗口后显示背景遮罩（默认关闭） */
    mask?: boolean;
}

/** 界面层级管理器 */
export class LayerManager {
    /** 界面根节点 */
    root!: Node;
    /** 界面摄像机 */
    camera!: Camera;
    /** 游戏界面特效层 */
    game!: Node;
    /** 新手引导层 */
    guide!: Node;

    /** 是否自动设置固定宽或高适配 */
    autoFixedWidthOrHeight: boolean = true;

    /** 界面层 */
    private readonly ui!: LayerUI;
    /** 弹窗层 */
    private readonly popup!: LayerPopUp;
    /** 只能弹出一个的弹窗 */
    private readonly dialog!: LayerDialog;
    /** 游戏系统提示弹窗  */
    private readonly system!: LayerDialog;
    /** 消息提示控制器，请使用show方法来显示 */
    private readonly notify!: LayerNotify;
    /** UI配置 */
    private configs: { [key: number]: UIConfig } = {};

    private initScreenAdapter() {
        const drs = view.getDesignResolutionSize();
        const ws = screen.windowSize;
        const windowAspectRatio = ws.width / ws.height;
        const designAspectRatio = drs.width / drs.height;

        // 自动设置固定宽或高适配屏幕
        if (this.autoFixedWidthOrHeight) {
            if (windowAspectRatio > designAspectRatio) {
                view.setResolutionPolicy(ResolutionPolicy.FIXED_HEIGHT);
                view.setOrientation(macro.ORIENTATION_LANDSCAPE);
                oops.log.logView("自动适配屏幕高度", "【横屏】");
            }
            else if (windowAspectRatio < designAspectRatio) {
                view.setResolutionPolicy(ResolutionPolicy.FIXED_WIDTH);
                view.setOrientation(macro.ORIENTATION_PORTRAIT);
                oops.log.logView("自动适配屏幕宽度", "【竖屏】");
            }
        }
        // 手动设置屏幕适配
        else {
            let finalW: number = 0;
            let finalH: number = 0;
            if (windowAspectRatio > designAspectRatio) {
                finalH = drs.height;
                finalW = finalH * ws.width / ws.height;
                oops.log.logView("自动适配屏幕高度", "【横屏】");
            }
            else {
                finalW = drs.width;
                finalH = finalW * ws.height / ws.width;
                oops.log.logView("自动适配屏幕宽度", "【竖屏】");
            }
            view.setDesignResolutionSize(finalW, finalH, ResolutionPolicy.UNKNOWN);
        }
    }

    /**
     * 构造函数
     * @param root  界面根节点
     */
    constructor(root: Node) {
        this.root = root;
        this.initScreenAdapter();
        this.camera = this.root.getComponentInChildren(Camera)!;
        this.game = this.create_node(LayerType.Game);

        this.ui = new LayerUI(LayerType.UI);
        this.popup = new LayerPopUp(LayerType.PopUp);
        this.dialog = new LayerDialog(LayerType.Dialog);
        this.system = new LayerDialog(LayerType.System);
        this.notify = new LayerNotify(LayerType.Notify);
        this.guide = this.create_node(LayerType.Guide);

        root.addChild(this.game);
        root.addChild(this.ui);
        root.addChild(this.popup);
        root.addChild(this.dialog);
        root.addChild(this.system);
        root.addChild(this.notify);
        root.addChild(this.guide);
    }

    /**
     * 初始化所有UI的配置对象
     * @param configs 配置对象
     */
    init(configs: { [key: number]: UIConfig }): void {
        this.configs = configs;
    }

    /**
     * 设置窗口打开失败回调
     * @param callback  回调方法
     */
    setOpenFailure(callback: Function) {
        this.ui.onOpenFailure = this.popup.onOpenFailure = this.dialog.onOpenFailure = this.system.onOpenFailure = callback;
    }

    /**
     * 渐隐飘过提示
     * @param content 文本表示
     * @param useI18n 是否使用多语言
     * @example 
     * oops.gui.toast("提示内容");
     */
    toast(content: string, useI18n: boolean = false) {
        this.notify.toast(content, useI18n)
    }

    /** 打开等待提示 */
    waitOpen() {
        this.notify.waitOpen();
    }

    /** 关闭等待提示 */
    waitClose() {
        this.notify.waitClose();
    }

    /**
     * 设置界面配置
     * @param uiId   要设置的界面id
     * @param config 要设置的配置
     */
    setConfig(uiId: number, config: UIConfig): void {
        this.configs[uiId] = config;
    }

    /**
     * 同步打开一个窗口
     * @param uiId          窗口唯一编号
     * @param uiArgs        窗口参数
     * @param callbacks     回调对象
     * @example
    var uic: UICallbacks = {
        onAdded: (node: Node, params: any) => {
            var comp = node.getComponent(LoadingViewComp) as ecs.Comp;
        }
        onRemoved:(node: Node | null, params: any) => {
                    
        }
    };
    oops.gui.open(UIID.Loading, null, uic);
     */
    open(uiId: number, uiArgs: any = null, callbacks?: UICallbacks): void {
        const config = this.configs[uiId];
        if (config == null) {
            warn(`打开编号为【${uiId}】的界面失败，配置信息不存在`);
            return;
        }

        switch (config.layer) {
            case LayerType.UI:
                this.ui.add(config, uiArgs, callbacks);
                break;
            case LayerType.PopUp:
                this.popup.add(config, uiArgs, callbacks);
                break;
            case LayerType.Dialog:
                this.dialog.add(config, uiArgs, callbacks);
                break;
            case LayerType.System:
                this.system.add(config, uiArgs, callbacks);
                break;
        }
    }

    /**
     * 异步打开一个窗口
     * @param uiId          窗口唯一编号
     * @param uiArgs        窗口参数
     * @example 
     * var node = await oops.gui.openAsync(UIID.Loading);
     */
    async openAsync(uiId: number, uiArgs: any = null): Promise<Node | null> {
        return new Promise<Node | null>((resolve, reject) => {
            const callbacks: UICallbacks = {
                onAdded: (node: Node, params: any) => {
                    resolve(node);
                },
                onLoadFailure: () => {
                    resolve(null);
                }
            };
            this.open(uiId, uiArgs, callbacks);
        });
    }

    /**
     * 场景替换
     * @param removeUiId  移除场景编号
     * @param openUiId    新打开场景编号
     * @param uiArgs      新打开场景参数
     */
    replace(removeUiId: number, openUiId: number, uiArgs: any = null) {
        this.open(openUiId, uiArgs);
        this.remove(removeUiId);
    }

    /**
     * 异步场景替换
     * @param removeUiId  移除场景编号
     * @param openUiId    新打开场景编号
     * @param uiArgs      新打开场景参数
     */
    replaceAsync(removeUiId: number, openUiId: number, uiArgs: any = null): Promise<Node | null> {
        return new Promise<Node | null>(async (resolve, reject) => {
            const node = await this.openAsync(openUiId, uiArgs);
            if (node) {
                this.remove(removeUiId);
                resolve(node);
            }
            else {
                resolve(null);
            }
        });
    }

    /**
     * 缓存中是否存在指定标识的窗口
     * @param uiId 窗口唯一标识
     * @example
     * oops.gui.has(UIID.Loading);
     */
    has(uiId: number): boolean {
        const config = this.configs[uiId];
        if (config == null) {
            warn(`编号为【${uiId}】的界面配置不存在，配置信息不存在`);
            return false;
        }

        var result = false;
        switch (config.layer) {
            case LayerType.UI:
                result = this.ui.has(config.prefab);
                break;
            case LayerType.PopUp:
                result = this.popup.has(config.prefab);
                break;
            case LayerType.Dialog:
                result = this.dialog.has(config.prefab);
                break;
            case LayerType.System:
                result = this.system.has(config.prefab);
                break;
        }

        return result;
    }

    /**
     * 缓存中是否存在指定标识的窗口
     * @param uiId 窗口唯一标识
     * @example
     * oops.gui.has(UIID.Loading);
     */
    get(uiId: number): Node {
        const config = this.configs[uiId];
        if (config == null) {
            warn(`编号为【${uiId}】的界面配置不存在，配置信息不存在`);
            return null!;
        }

        let result: Node = null!;
        switch (config.layer) {
            case LayerType.UI:
                result = this.ui.get(config.prefab);
                break;
            case LayerType.PopUp:
                result = this.popup.get(config.prefab);
                break;
            case LayerType.Dialog:
                result = this.dialog.get(config.prefab);
                break;
            case LayerType.System:
                result = this.system.get(config.prefab);
                break;
        }
        return result;
    }

    /**
     * 移除指定标识的窗口
     * @param uiId         窗口唯一标识
     * @param isDestroy    移除后是否释放
     * @example
     * oops.gui.remove(UIID.Loading);
     */
    remove(uiId: number, isDestroy?: boolean) {
        const config = this.configs[uiId];
        if (config == null) {
            warn(`删除编号为【${uiId}】的界面失败，配置信息不存在`);
            return;
        }

        switch (config.layer) {
            case LayerType.UI:
                this.ui.remove(config.prefab, isDestroy);
                break;
            case LayerType.PopUp:
                this.popup.remove(config.prefab, isDestroy);
                break;
            case LayerType.Dialog:
                this.dialog.remove(config.prefab, isDestroy);
                break;
            case LayerType.System:
                this.system.remove(config.prefab, isDestroy);
                break;
        }
    }

    /**
     * 删除一个通过this框架添加进来的节点
     * @param node          窗口节点
     * @param isDestroy     移除后是否释放资源
     * @example
     * oops.gui.removeByNode(cc.Node);
     */
    removeByNode(node: Node, isDestroy?: boolean) {
        if (node instanceof Node) {
            let comp = node.getComponent(DelegateComponent);
            if (comp && comp.vp) {
                // 释放显示的界面
                if (node.parent) {
                    (node.parent as LayerUI).remove(comp.vp.config.prefab, isDestroy);
                }
                // 释放缓存中的界面
                else if (isDestroy) {
                    switch (comp.vp.config.layer) {
                        case LayerType.UI:
                            // @ts-ignore 注：不对外使用
                            this.ui.removeCache(comp.vp.config.prefab);
                            break;
                        case LayerType.PopUp:
                            // @ts-ignore 注：不对外使用
                            this.popup.removeCache(comp.vp.config.prefab);
                            break;
                        case LayerType.Dialog:
                            // @ts-ignore 注：不对外使用
                            this.dialog.removeCache(comp.vp.config.prefab);
                            break;
                        case LayerType.System:
                            // @ts-ignore 注：不对外使用
                            this.system.removeCache(comp.vp.config.prefab);
                            break;
                    }
                }
            }
            else {
                warn(`当前删除的node不是通过界面管理器添加到舞台上`);
                node.destroy();
            }
        }
    }

    /**
     * 清除所有窗口
     * @param isDestroy 移除后是否释放
     * @example
     * oops.gui.clear();
     */
    clear(isDestroy: boolean = false) {
        this.ui.clear(isDestroy);
        this.popup.clear(isDestroy);
        this.dialog.clear(isDestroy);
        this.system.clear(isDestroy);
    }

    private create_node(name: string) {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        const w: Widget = node.addComponent(Widget);
        w.isAlignLeft = w.isAlignRight = w.isAlignTop = w.isAlignBottom = true;
        w.left = w.right = w.top = w.bottom = 0;
        w.alignMode = 2;
        w.enabled = true;
        return node;
    }
}