import { Camera, Node, ResolutionPolicy, SafeArea, screen, view, warn } from "cc";
import { oops } from "../../Oops";
import { gui } from "../Gui";
import { LayerDialog } from "./LayerDialog";
import { LayerCustomType, LayerTypeCls, UIConfigMap, Uiid } from "./LayerEnum";
import { LayerGame } from "./LayerGame";
import { LayerHelper } from "./LayerHelper";
import { LayerNotify } from "./LayerNotify";
import { LayerPopUp } from "./LayerPopup";
import { LayerUI } from "./LayerUI";
import { LayerUIElement, UIParam } from "./LayerUIElement";
import { UIConfig } from "./UIConfig";

/** 界面层级管理器 */
export class LayerManager {
    /** 界面根节点 */
    root!: Node;
    /** 界面摄像机 */
    camera!: Camera;
    /** 游戏界面特效层 */
    game!: LayerGame;
    /** 新手引导层 */
    guide!: Node;

    /** 窗口宽高比例 */
    windowAspectRatio: number = 0;
    /** 设计宽高比例 */
    designAspectRatio: number = 0;
    /** 是否开启移动设备安全区域适配 */
    mobileSafeArea: boolean = false;

    /** 消息提示控制器，请使用show方法来显示 */
    private notify!: LayerNotify;
    /** 界面层集合 - 无自定义类型 */
    private uiLayers: Map<string, LayerUI> = new Map();
    /** 界面层组件集合 */
    private clsLayers: Map<string, any> = new Map();

    constructor() {
        this.clsLayers.set(LayerTypeCls.UI, LayerUI);
        this.clsLayers.set(LayerTypeCls.PopUp, LayerPopUp);
        this.clsLayers.set(LayerTypeCls.Dialog, LayerDialog);
        this.clsLayers.set(LayerTypeCls.Notify, LayerNotify);
        this.clsLayers.set(LayerTypeCls.Game, LayerGame);
        this.clsLayers.set(LayerTypeCls.Node, null);
    }

    /**
     * 注册自定义界面层对象
     * @param type  自定义界面层类型
     * @param cls   自定义界面层对象
     */
    registerLayerCls(type: string, cls: any) {
        if (this.clsLayers.has(type)) {
            console.error("已存在自定义界面层类型", type);
            return;
        }
        this.clsLayers.set(type, cls);
    }

    /**
     * 初始化界面层
     * @param root  界面根节点
     */
    private initLayer(root: Node, config: any) {
        if (config == null) {
            console.error("请升级到最新版本框架,界面层级管理修改为数据驱动。参考模板项目中的config.json配置文件");
            return;
        }
        this.root = root;
        this.initScreenAdapter();
        this.camera = this.root.getComponentInChildren(Camera)!;

        // 创建界面层
        for (let i = 0; i < config.length; i++) {
            let data = config[i];
            let layer: Node = null!;
            if (data.type == LayerTypeCls.Node) {
                switch (data.name) {
                    case LayerCustomType.Guide:
                        this.guide = this.create_node(data.name);
                        layer = this.guide;
                        break
                }
            }
            else {
                let cls = this.clsLayers.get(data.type);
                if (cls) {
                    layer = new cls(data.name);
                }
                else {
                    console.error("未识别的界面层类型", data.type);
                }
            }
            root.addChild(layer);

            if (layer instanceof LayerUI)
                this.uiLayers.set(data.name, layer);
            else if (layer instanceof LayerNotify)
                this.notify = layer;
            else if (layer instanceof LayerGame)
                this.game = layer;
        }
    }

    /** 初始化屏幕适配 */
    private initScreenAdapter() {
        const drs = view.getDesignResolutionSize();
        const ws = screen.windowSize;
        this.windowAspectRatio = ws.width / ws.height;
        this.designAspectRatio = drs.width / drs.height;

        let finalW: number = 0;
        let finalH: number = 0;

        if (this.windowAspectRatio > this.designAspectRatio) {
            finalH = drs.height;
            finalW = finalH * ws.width / ws.height;
            oops.log.logView("适配屏幕高度", "【横屏】");
        }
        else {
            finalW = drs.width;
            finalH = finalW * ws.height / ws.width;
            oops.log.logView("适配屏幕宽度", "【竖屏】");
        }
        view.setDesignResolutionSize(finalW, finalH, ResolutionPolicy.UNKNOWN);

        if (this.mobileSafeArea) {
            this.root.addComponent(SafeArea);
            oops.log.logView("开启移动设备安全区域适配");
        }
    }

    /**
     * 初始化所有UI的配置对象
     * @param configs 配置对象
     */
    init(configs: UIConfigMap): void {
        gui.internal.initConfigs(configs);
    }

    /**
     * 设置窗口打开失败回调
     * @param callback  回调方法
     */
    setOpenFailure(callback: Function) {
        this.uiLayers.forEach((layer: LayerUI) => {
            layer.onOpenFailure = callback;
        })
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

    /** 获取界面信息 */
    private getInfo(uiid: Uiid): { key: string; config: UIConfig } {
        let key = "";
        let config: UIConfig = null!;

        // 界面配置
        if (typeof uiid === 'object') {
            key = uiid.bundle + "_" + uiid.prefab;
            config = gui.internal.getConfig(key);
            if (config == null) {
                config = uiid;
                gui.internal.setConfig(key, uiid);
            }
        }
        // 界面对象 - 配合gui.register使用
        else if (uiid instanceof Function) {
            //@ts-ignore
            key = uiid[gui.internal.GUI_KEY];
            config = gui.internal.getConfig(key);
        }
        // 界面唯一标记
        else {
            key = uiid.toString();
            config = gui.internal.getConfig(key);
            if (config == null) {
                console.error(`打开编号为【${uiid}】的界面失败，配置信息不存在`);
            }
        }
        return { key, config };
    }

    /**
     * 同步打开一个窗口
     * @param uiid          窗口唯一编号
     * @param param         窗口参数
     * @example
    var uic: UICallbacks = {
        onAdded: (node: Node, params: any) => {
            var comp = node.getComponent(LoadingViewComp) as ecs.Comp;
        }
        onRemoved:(node: Node | null, params: any) => {
                    
        }
    };
    oops.gui.open(UIID.Loading);
     */
    open(uiid: Uiid, param?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            let info = this.getInfo(uiid);
            let layer = this.uiLayers.get(info.config.layer);
            if (layer) {
                let node = await layer.add(info.key, info.config, param);
                resolve(node);
            }
            else {
                console.error(`打开编号为【${uiid}】的界面失败，界面层不存在`);
            }
        });
    }

    /** 显示指定界面 */
    show(uiid: Uiid) {
        let info = this.getInfo(uiid);
        let layer = this.uiLayers.get(info.config.layer);
        if (layer) {
            layer.show(info.config.prefab);
        }
        else {
            console.error(`打开编号为【${uiid}】的界面失败，界面层不存在`);
        }
    }

    /**
     * 移除指定标识的窗口
     * @param uiid         窗口唯一标识
     * @example
     * oops.gui.remove(UIID.Loading);
     */
    remove(uiid: Uiid) {
        let info = this.getInfo(uiid);
        let layer = this.uiLayers.get(info.config.layer);
        if (layer) {
            layer.remove(info.config.prefab);
        }
        else {
            console.error(`移除编号为【${uiid}】的界面失败，界面层不存在`);
        }
    }

    /**
     * 清理指定界面的缓存
     * @param uiid         窗口唯一标识
     * @example
     * oops.gui.removeCache(UIID.Loading);
     */
    removeCache(uiid: Uiid) {
        let info = this.getInfo(uiid);
        let layer = this.uiLayers.get(info.config.layer);
        if (layer) {
            layer.removeCache(info.config.prefab);
        }
        else {
            console.error(`移除编号为【${uiid}】的界面失败，界面层不存在`);
        }
    }

    /**
     * 通过界面节点移除
     * @param node          窗口节点
     * @example
     * oops.gui.removeByNode(cc.Node);
     */
    removeByNode(node: Node) {
        if (node instanceof Node) {
            let comp = node.getComponent(LayerUIElement);
            if (comp && comp.state) {
                // 释放显示的界面
                if (node.parent) {
                    let uiid = gui.internal.getConfig(comp.state.uiid);
                    this.remove(uiid);
                }
                // 释放缓存中的界面
                else {
                    let layer = this.uiLayers.get(comp.state.config.layer);
                    if (layer) {
                        // @ts-ignore 注：不对外使用
                        layer.removeCache(comp.state.config.prefab);
                    }
                }
            }
            else {
                warn(`当前删除的 Node 不是通过界面管理器添加的`);
                node.destroy();
            }
        }
    }

    /**
     * 场景替换
     * @param removeUiId  移除场景编号
     * @param openUiid    新打开场景编号
     * @param param       新打开场景参数
     */
    replace(removeUiId: Uiid, openUiid: Uiid, param?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            let node = await this.open(openUiid, param);
            this.remove(removeUiId);
            resolve(node);
        });
    }

    /**
     * 缓存中是否存在指定标识的窗口
     * @param uiid 窗口唯一标识
     * @example
     * oops.gui.has(UIID.Loading);
     */
    has(uiid: Uiid): boolean {
        let info = this.getInfo(uiid);
        let result = false;
        let layer = this.uiLayers.get(info.config.layer);
        if (layer) {
            result = layer.has(info.config.prefab);
        }
        else {
            console.error(`验证编号为【${uiid}】的界面失败，界面层不存在`);
        }

        return result;
    }

    /**
     * 缓存中是否存在指定标识的窗口
     * @param uiid 窗口唯一标识
     * @example
     * oops.gui.has(UIID.Loading);
     */
    get(uiid: Uiid): Node {
        let info = this.getInfo(uiid);
        let result: Node = null!;
        let layer = this.uiLayers.get(info.config.layer);
        if (layer) {
            result = layer.get(info.config.prefab);
        }
        else {
            console.error(`获取编号为【${uiid}】的界面失败，界面层不存在`);
        }
        return result;
    }

    /**
     * 清除所有窗口
     * @param isDestroy 移除后是否释放
     * @example
     * oops.gui.clear();
     */
    clear(isDestroy: boolean = true) {
        this.uiLayers.forEach((layer: LayerUI) => {
            layer.clear(isDestroy);
        })
    }

    private create_node(name: string) {
        const node = new Node(name);
        LayerHelper.setFullScreen(node);
        return node;
    }
}