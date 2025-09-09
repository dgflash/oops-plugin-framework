import { Node, __private } from "cc";
import { oops } from "../../core/Oops";
import { resLoader } from "../../core/common/loader/ResLoader";
import { gui } from "../../core/gui/Gui";
import { Uiid } from "../../core/gui/layer/LayerEnum";
import { LayerUIElement, UICallbacks, UIRemove } from "../../core/gui/layer/LayerUIElement";
import { ViewUtil } from "../../core/utils/ViewUtil";
import { ecs } from "../../libs/ecs/ECS";
import { CompType } from "../../libs/ecs/ECSModel";
import { CCComp } from "./CCComp";
import { CCVMParentComp } from "./CCVMParentComp";

export type ECSCtor<T extends ecs.Comp> = __private.__types_globals__Constructor<T> | __private.__types_globals__AbstractedConstructor<T>;

export class ModuleUtil {
    /**
     * 异步添加视图层组件
     * @param ent      模块实体
     * @param ctor     界面逻辑组件
     * @param uiArgs   界面参数
     * @returns 界面节点
     */
    static addGui<T extends CCVMParentComp | CCComp>(ent: ecs.Entity, ctor: ECSCtor<T>, uiArgs?: any, anim?: UICallbacks): Promise<Node | null> {
        return new Promise<Node | null>((resolve, reject) => {
            const uic: UICallbacks = {
                onAdded: (node: Node, params: any) => {
                    const comp = node.getComponent(ctor) as ecs.Comp;
                    ent.add(comp);
                    if (anim && anim.onAdded) anim.onAdded(node, params);
                    resolve(node);
                },
                onLoadFailure: () => {
                    if (anim && anim.onLoadFailure) anim.onLoadFailure();
                    resolve(null);
                }
            };

            //@ts-ignore
            const key = ctor[gui.internal.GUI_KEY];
            if (key) {
                oops.gui.open(key, uiArgs, uic);
            }
            else {
                console.error(`${key} 界面组件未使用 gui.register 注册`);
            }
        });
    }

    /**
     * 业务实体上移除界面组件
     * @param ent            模块实体
     * @param ctor           界面逻辑组件
     * @param isDestroy      是否释放界面缓存（默认为释放界面缓存）
     * @param onRemoved      窗口关闭完成事件
     */
    static removeGui(ent: ecs.Entity, ctor: CompType<ecs.IComp>, params?: UIRemove) {
        if (params == null) {
            params = { isDestroy: true };
        }
        else {
            if (params.isDestroy == null) params.isDestroy = true;
        }

        //@ts-ignore
        const key = ctor[gui.internal.GUI_KEY];
        if (key) {
            const node = oops.gui.get(key);
            if (node == null) {
                console.error(`${key} 界面重复关闭`);
                return;
            }

            const comp = node.getComponent(LayerUIElement);
            if (comp) {
                comp.onCloseWindowBefore = () => {
                    if (params.isDestroy) ent.remove(ctor);
                    if (params.onRemoved) params.onRemoved();
                };
                oops.gui.remove(key, params.isDestroy);
            }
        }
        else {
            if (params.isDestroy) ent.remove(ctor);
            if (params.onRemoved) params.onRemoved();
        }
    }

    /**
     * 通过资源内存中获取预制上的组件添加到ECS实体中
     * @param ent        模块实体
     * @param ctor       界面逻辑组件
     * @param parent     显示对象父级
     * @param path       显示资源地址
     * @param bundleName 资源包名称
     */
    static addView<T extends CCVMParentComp | CCComp>(ent: ecs.Entity, ctor: ECSCtor<T>, parent: Node, path: string, bundleName: string = resLoader.defaultBundleName) {
        const node = ViewUtil.createPrefabNode(path, bundleName);
        const comp = node.getComponent(ctor)!;
        ent.add(comp);
        node.parent = parent;
    }

    //#region deprecated
    /**
     * 添加界面组件
     * @param ent      模块实体
     * @param ctor     界面逻辑组件
     * @param uiId     界面资源编号
     * @param uiArgs   界面参数
     * @deprecated 使用gui.register注册的界面组件，可使用add方法打开
     */
    static addViewUi<T extends CCVMParentComp | CCComp>(ent: ecs.Entity, ctor: ECSCtor<T>, uiId: Uiid, uiArgs: any = null) {
        const uic: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                const comp = node.getComponent(ctor) as ecs.Comp;
                //@ts-ignore
                if (!ent.has(ctor)) ent.add(comp);
            }
        };
        oops.gui.open(uiId, uiArgs, uic);
    }

    /**
     * 异步添加视图层组件
     * @param ent      模块实体
     * @param ctor     界面逻辑组件
     * @param uiId     界面资源编号
     * @param uiArgs   界面参数
     * @returns 界面节点
     * @deprecated 使用gui.register注册的界面组件，可使用add方法打开
     */
    static addViewUiAsync<T extends CCVMParentComp | CCComp>(ent: ecs.Entity, ctor: ECSCtor<T>, uiId: Uiid, uiArgs: any = null): Promise<Node | null> {
        return new Promise<Node | null>((resolve, reject) => {
            const uic: UICallbacks = {
                onAdded: (node: Node, params: any) => {
                    const comp = node.getComponent(ctor) as ecs.Comp;
                    ent.add(comp);
                    resolve(node);
                },
                onLoadFailure: () => {
                    resolve(null);
                }
            };
            oops.gui.open(uiId, uiArgs, uic);
        });
    }

    /**
     * 业务实体上移除界面组件
     * @param ent            模块实体
     * @param ctor           界面逻辑组件
     * @param uiId           界面资源编号
     * @param isDestroy      是否释放界面缓存（默认为释放界面缓存）
     * @param onRemoved      窗口关闭完成事件
     * @deprecated 使用gui.register注册的界面组件，可使用remove方法移除
     */
    static removeViewUi(ent: ecs.Entity, ctor: CompType<ecs.IComp>, uiId: Uiid, isDestroy: boolean = true, onRemoved?: Function) {
        const node = oops.gui.get(uiId);
        if (!node) {
            if (onRemoved) onRemoved();
            return;
        }

        const comp = node.getComponent(LayerUIElement);
        if (comp) {
            comp.onCloseWindowBefore = () => {
                // 移除ECS显示组件
                if (isDestroy) ent.remove(ctor, isDestroy);
                if (onRemoved) onRemoved();
            };
            oops.gui.remove(uiId, isDestroy);
        }
    }
    //#endregion
}