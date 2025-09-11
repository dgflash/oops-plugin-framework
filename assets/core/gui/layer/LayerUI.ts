import { instantiate, Node, Prefab, SafeArea } from "cc";
import { Collection } from "db://oops-framework/libs/collection/Collection";
import { resLoader } from "../../common/loader/ResLoader";
import { oops } from "../../Oops";
import { Uiid } from "./LayerEnum";
import { LayerHelper } from "./LayerHelper";
import { LayerUIElement, UIParam, UIState } from "./LayerUIElement";
import { UIConfig } from "./UIConfig";

/** 界面层对象 */
export class LayerUI extends Node {
    /** 全局窗口打开失败事件 */
    onOpenFailure: Function = null!;
    /** 显示界面节点集合 */
    protected ui_nodes = new Collection<string, UIState>();
    /** 被移除的界面缓存数据 */
    protected ui_cache = new Map<string, UIState>();

    /**
     * UI基础层，允许添加多个预制件节点
     * @param name 该层名
     */
    constructor(name: string) {
        super(name);
        LayerHelper.setFullScreen(this);
    }

    /**
     * 添加一个预制件节点到层容器中，该方法将返回一个唯一`uuid`来标识该操作节点
     * @param uiid       窗口唯一标识
     * @param config     界面配置数据
     * @param params     自定义参数
     * @returns ture为成功,false为失败
     */
    add(uiid: Uiid, config: UIConfig, params?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            if (this.ui_nodes.has(config.prefab)) {
                console.warn(`路径为【${config.prefab}】的预制重复加载`);
                return;
            }

            // 检查缓存中是否存界面
            let state = this.initUIConfig(uiid, config, params);
            await this.load(state);
            resolve(state.node);
        });
    }

    /** 初始化界面配置初始值 */
    protected initUIConfig(uiid: Uiid, config: UIConfig, params?: UIParam) {
        let state = this.ui_cache.get(config.prefab);
        if (state == null) {
            if (config.bundle == null) config.bundle = resLoader.defaultBundleName;
            if (config.destroy == null) config.destroy = true;
            if (config.vacancy == null) config.vacancy = false;
            if (config.mask == null) config.mask = false;
            if (config.safeArea == null) config.safeArea = false;

            state = new UIState();
            state.uiid = uiid.toString();
            state.config = config;
        }
        state.params = params ?? {};
        state.valid = true;
        this.ui_nodes.set(config.prefab, state);
        return state;
    }

    /**
     * 加载界面资源
     * @param state        显示参数
     * @param bundle     远程资源包名，如果为空就是默认本地资源包
     */
    protected async load(state: UIState): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            // 加载界面资源超时提示
            let timerId = setTimeout(this.onLoadingTimeoutGui, oops.config.game.loadingTimeoutGui);
            if (state.node == null) {
                // 优先加载配置的指定资源包中资源，如果没配置则加载默认资源包资源
                const res = await resLoader.loadAsync(state.config.bundle!, state.config.prefab, Prefab);
                if (res) {
                    state.node = instantiate(res);

                    // 是否启动真机安全区域显示
                    if (state.config.safeArea) state.node.addComponent(SafeArea);

                    // 窗口事件委托
                    const comp = state.node.addComponent(LayerUIElement);
                    comp.state = state;
                }
                else {
                    console.warn(`路径为【${state.config.prefab}】的预制加载失败`);
                    this.failure(state);
                }
            }

            // 关闭界面资源超时提示
            oops.gui.waitClose();
            clearTimeout(timerId);

            await this.uiInit(state);

            resolve(state.node);
        });
    }

    /**
     * 创建界面节点
     * @param state  视图参数
     */
    protected uiInit(state: UIState): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            const comp = state.node.getComponent(LayerUIElement)!;
            const r: boolean = await comp.add();
            if (r) {
                state.valid = true;                         // 标记界面为使用状态
                if (!state.params.preload) {
                    state.params.preload = false;
                    state.node.parent = this;
                }
            }
            else {
                console.warn(`路径为【${state.config.prefab}】的自定义预处理逻辑异常.检查预制上绑定的组件中 onAdded 方法,返回true才能正确完成窗口显示流程`);
                this.failure(state);
            }
            resolve(r);
        });
    }

    /** 加载超时事件*/
    private onLoadingTimeoutGui() {
        oops.gui.waitOpen();
    }

    /** 窗口关闭事件 */
    protected closeUi(state: UIState) {
        this.ui_nodes.delete(state.config.prefab);
    }

    /** 打开窗口失败逻辑 */
    protected failure(state: UIState) {
        this.closeUi(state);
        this.onOpenFailure && this.onOpenFailure();
    }

    /**
     * 根据预制件路径删除，预制件如在队列中也会被删除，如果该预制件存在多个也会一起删除
     * @param prefabPath   预制路径
     */
    remove(prefabPath: string): void {
        let release: boolean = true;

        // 界面移出舞台
        const state = this.ui_nodes.get(prefabPath);
        if (state) {
            // 优先使用参数中控制的释放条件，如果未传递参数则用配置中的释放条件，默认不缓存关闭的界面
            release = state.config.destroy !== undefined ? state.config.destroy : true;

            // 不释放界面，缓存起来待下次使用
            if (release === false) {
                this.ui_cache.set(state.config.prefab, state);
            }

            const node = state.node;
            const comp = node.getComponent(LayerUIElement)!;
            comp.remove(release);
        }

        // 清理界面缓存
        const cache = this.ui_cache.get(prefabPath);
        if (cache) {
            // 验证是否删除后台缓存界面
            if (release) this.removeCache(prefabPath);
        }
    }

    /** 删除缓存的界面，当缓存界面被移除舞台时，可通过此方法删除缓存界面 */
    private removeCache(prefabPath: string) {
        let vp = this.ui_cache.get(prefabPath);
        if (vp) {
            this.closeUi(vp);
            this.ui_cache.delete(prefabPath);
            const node = vp.node;
            const comp = node.getComponent(LayerUIElement)!;
            comp.remove(true);
            node.destroy();
        }
    }

    /** 显示界面 */
    show(prefabPath: string) {
        const vp = this.ui_nodes.get(prefabPath);
        if (vp) vp.node.parent = this;
    }

    /**
     * 根据预制路径获取已打开界面的节点对象
     * @param prefabPath  预制路径
     */
    get(prefabPath: string): Node {
        const vp = this.ui_nodes.get(prefabPath);
        if (vp) return vp.node;
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
        const length = this.ui_nodes.array.length - 1;
        for (let i = length; i >= 0; i--) {
            const uip = this.ui_nodes.array[i];
            this.remove(uip.config.prefab);
        }
        this.ui_nodes.clear();

        // 清除缓存中的界面
        if (isDestroy) {
            this.ui_cache.forEach((value: UIState, prefabPath: string) => {
                this.removeCache(prefabPath);
            });
        }
    }
}