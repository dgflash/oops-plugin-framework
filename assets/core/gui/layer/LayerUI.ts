import { instantiate, Node, Prefab, SafeArea, Widget } from "cc";
import { Collection } from "db://oops-framework/libs/collection/Collection";
import { oops } from "../../Oops";
import { Uiid } from "./LayerEnum";
import { LayerUIElement, UICallbacks, UIParams } from "./LayerUIElement";
import { UIConfig } from "./UIConfig";

/** 界面层对象 */
export class LayerUI extends Node {
    /** 全局窗口打开失败 */
    onOpenFailure: Function = null!;
    /** 显示界面节点集合 */
    protected ui_nodes = new Collection<string, UIParams>();
    /** 被移除的界面缓存数据 */
    protected ui_cache = new Map<string, UIParams>();

    /**
     * UI基础层，允许添加多个预制件节点
     * @param name 该层名
     */
    constructor(name: string) {
        super(name);

        const widget: Widget = this.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;
        widget.alignMode = 2;
        widget.enabled = true;
    }

    /**
     * 添加一个预制件节点到层容器中，该方法将返回一个唯一`uuid`来标识该操作节点
     * @param config     界面配置数据
     * @param params     自定义参数
     * @param callbacks  回调函数对象，可选
     * @returns ture为成功,false为失败
     */
    add(uiid: Uiid, config: UIConfig, params?: any, callbacks?: UICallbacks) {
        if (this.ui_nodes.has(config.prefab)) {
            console.warn(`路径为【${config.prefab}】的预制重复加载`);
            return;
        }

        // 检查缓存中是否存界面
        let uip = this.ui_cache.get(config.prefab);
        if (uip == null) {
            uip = new UIParams();
            uip.uiid = uiid.toString();
            uip.config = config;
        }
        this.ui_nodes.set(config.prefab, uip);

        uip.params = params ?? {};
        uip.callbacks = callbacks ?? {};
        uip.valid = true;

        this.load(uip, config.bundle)
    }

    /**
     * 加载界面资源
     * @param vp         显示参数
     * @param bundle     远程资源包名，如果为空就是默认本地资源包
     */
    protected async load(vp: UIParams, bundle?: string) {
        // 加载界面资源超时提示
        const timerId = setTimeout(this.onLoadingTimeoutGui, oops.config.game.loadingTimeoutGui);

        if (vp && vp.node) {
            await this.showUi(vp);
        }
        else {
            // 优先加载配置的指定资源包中资源，如果没配置则加载默认资源包资源
            bundle = bundle || oops.res.defaultBundleName;
            const res = await oops.res.loadAsync(bundle, vp.config.prefab, Prefab);
            if (res) {
                vp.node = instantiate(res);
                // 是否启动真机安全区域显示
                if (vp.config.safeArea) vp.node.addComponent(SafeArea);

                // 窗口事件委托
                const dc = vp.node.addComponent(LayerUIElement);
                dc.params = vp;
                //@ts-ignore
                dc.onCloseWindow = this.onCloseWindow.bind(this);

                // 显示界面
                await this.showUi(vp);
            }
            else {
                console.warn(`路径为【${vp.config.prefab}】的预制加载失败`);
                this.failure(vp);
            }
        }

        // 关闭界面资源超时提示
        oops.gui.waitClose();
        clearTimeout(timerId);
    }

    /** 加载超时事件*/
    private onLoadingTimeoutGui() {
        oops.gui.waitOpen();
    }

    /** 窗口关闭事件 */
    protected onCloseWindow(vp: UIParams) {
        this.ui_nodes.delete(vp.config.prefab);
    }

    /**
     * 创建界面节点
     * @param uip  视图参数
     */
    protected async showUi(uip: UIParams): Promise<boolean> {
        // 触发窗口添加事件
        const comp = uip.node.getComponent(LayerUIElement)!;
        const r: boolean = await comp.add();
        if (r) {
            uip.node.parent = this;

            // 标记界面为使用状态
            uip.valid = true;
        }
        else {
            console.warn(`路径为【${uip.config.prefab}】的自定义预处理逻辑异常.检查预制上绑定的组件中 onAdded 方法,返回true才能正确完成窗口显示流程`);
            this.failure(uip);
        }
        return r;
    }

    /** 打开窗口失败逻辑 */
    protected failure(uip: UIParams) {
        this.onCloseWindow(uip);
        uip.callbacks && uip.callbacks.onLoadFailure && uip.callbacks.onLoadFailure();
        this.onOpenFailure && this.onOpenFailure();
    }

    /**
     * 根据预制件路径删除，预制件如在队列中也会被删除，如果该预制件存在多个也会一起删除
     * @param prefabPath   预制路径
     * @param isDestroy    移除后是否释放
     */
    remove(prefabPath: string, isDestroy?: boolean): void {
        let release: any = undefined;
        if (isDestroy !== undefined) release = isDestroy;

        // 界面移出舞台
        const vp = this.ui_nodes.get(prefabPath);
        if (vp) {
            // 优先使用参数中控制的释放条件，如果未传递参数则用配置中的释放条件，默认不缓存关闭的界面
            if (release === undefined) {
                release = vp.config.destroy !== undefined ? vp.config.destroy : true;
            }

            // 不释放界面，缓存起来待下次使用
            if (release === false) {
                this.ui_cache.set(vp.config.prefab, vp);
            }

            const childNode = vp.node;
            const comp = childNode.getComponent(LayerUIElement)!;
            comp.remove(release);
        }

        // 验证是否删除后台缓存界面
        if (release === true) this.removeCache(prefabPath);
    }

    /** 删除缓存的界面，当缓存界面被移除舞台时，可通过此方法删除缓存界面 */
    private removeCache(prefabPath: string) {
        let vp = this.ui_cache.get(prefabPath);
        if (vp) {
            this.onCloseWindow(vp);
            this.ui_cache.delete(prefabPath);
            const childNode = vp.node;
            const comp = childNode.getComponent(LayerUIElement)!;
            if (comp) {
                comp.remove(true);
            }
            childNode.destroy();
        }
    }

    /**
     * 根据预制路径获取已打开界面的节点对象
     * @param prefabPath  预制路径
     */
    get(prefabPath: string): Node {
        const vp = this.ui_nodes.get(prefabPath);
        if (vp)
            return vp.node;
        return null!;
    }

    /**
     * 判断当前层是否包含 uuid或预制件路径对应的Node节点
     * @param prefabPath 预制件路径或者UUID
     */
    has(prefabPath: string): boolean {
        return this.ui_nodes.has(prefabPath);
    }

    /**
     * 清除所有节点，队列当中的也删除
     * @param isDestroy  移除后是否释放
     */
    clear(isDestroy: boolean): void {
        // 清除所有显示的界面
        this.ui_nodes.forEach((value: UIParams, key: string) => {
            this.remove(value.config.prefab, isDestroy);
            value.valid = false;
        });
        this.ui_nodes.clear();

        // 清除缓存中的界面
        if (isDestroy) {
            this.ui_cache.forEach((value: UIParams, prefabPath: string) => {
                this.removeCache(prefabPath);
            });
        }
    }
}