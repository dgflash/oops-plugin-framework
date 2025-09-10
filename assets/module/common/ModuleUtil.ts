import { Node, __private } from "cc";
import { oops } from "../../core/Oops";
import { resLoader } from "../../core/common/loader/ResLoader";
import { gui } from "../../core/gui/Gui";
import { LayerUIElement, UIParam } from "../../core/gui/layer/LayerUIElement";
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
     * @param params   界面参数
     * @returns 界面节点
     */
    static addGui<T extends CCVMParentComp | CCComp>(ent: ecs.Entity, ctor: ECSCtor<T>, params?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            //@ts-ignore
            const key = ctor[gui.internal.GUI_KEY];
            if (key) {
                if (params == null) {
                    params = { preload: true };
                }
                else {
                    params.preload = true;
                }

                let node = await oops.gui.open(key, params);
                const comp = node.getComponent(ctor) as ecs.Comp;
                ent.add(comp);
                oops.gui.show(key);
                resolve(node);
            }
            else {
                console.error(`${key} 界面组件未使用 gui.register 注册`);
            }
        });
    }

    /**
     * 业务实体上移除界面组件
     * @param ent       模块实体
     * @param ctor      界面逻辑组件
     * @param params    界面关闭参数
     */
    static removeGui(ent: ecs.Entity, ctor: CompType<ecs.IComp>) {
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
                comp.onClose = () => {
                    if (comp.state.config.destroy) ent.remove(ctor);
                };
                oops.gui.remove(key);
            }
        }
        else {
            ent.remove(ctor);
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
}