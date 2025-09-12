import { __private, Node } from "cc";
import { resLoader } from "../../core/common/loader/ResLoader";
import { gui } from "../../core/gui/Gui";
import { LayerUIElement, UIParam } from "../../core/gui/layer/LayerUIElement";
import { oops } from "../../core/Oops";
import { ViewUtil } from "../../core/utils/ViewUtil";
import { ecs } from "../../libs/ecs/ECS";
import { CompType } from "../../libs/ecs/ECSModel";
import { CCComp } from "./CCComp";
import { CCVMParentComp } from "./CCVMParentComp";

export type ECSCtor<T extends ecs.Comp> = __private.__types_globals__Constructor<T> | __private.__types_globals__AbstractedConstructor<T>;

/** ECS 游戏模块实体 */
export class CCEntity extends ecs.Entity {
    /**
     * 通过资源内存中获取预制上的组件添加到ECS实体中
     * @param ctor       界面逻辑组件
     * @param parent     显示对象父级
     * @param path       显示资源地址
     * @param bundleName 资源包名称
     */
    addPrefab<T extends CCVMParentComp | CCComp>(ctor: ECSCtor<T>, parent: Node, path: string, bundleName: string = resLoader.defaultBundleName) {
        const node = ViewUtil.createPrefabNode(path, bundleName);
        const comp = node.getComponent(ctor)!;
        this.add(comp);
        node.parent = parent;
    }

    /**
     * 添加视图层组件
     * @param ctor     界面逻辑组件
     * @param params   界面参数
     * @returns 界面节点
     */
    addUi<T extends CCVMParentComp | CCComp>(ctor: ECSCtor<T>, params?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            const key = gui.internal.getKey(ctor);
            if (key) {
                if (params == null) {
                    params = { preload: true };
                }
                else {
                    params.preload = true;
                }

                const node = await oops.gui.open(key, params);
                const comp = node.getComponent(ctor) as ecs.Comp;
                this.add(comp);
                oops.gui.show(key);
                resolve(node);
            }
            else {
                console.error(`${key} 界面组件未使用 gui.register 注册`);
            }
        });
    }

    /**
     * 移除视图层组件
     * @param ctor      界面逻辑组件
     */
    removeUi(ctor: CompType<ecs.IComp>) {
        const key = gui.internal.getKey(ctor);
        if (key) {
            const node = oops.gui.get(key);
            if (node == null) {
                console.error(`${key} 界面重复关闭`);
                return;
            }

            const comp = node.getComponent(LayerUIElement);
            if (comp) {
                // 处理界面关闭动画播放完成后，移除ECS组件，避免使用到组件实体数据还在动画播放时在使用导致的空对象问题
                comp.onClose = this.remove.bind(this, ctor);
                oops.gui.remove(key);
            }
        }
        else {
            this.remove(ctor);
        }
    }
}