import { Node, __private } from "cc";
import { oops } from "../../core/Oops";
import { UICallbacks } from "../../core/gui/layer/Defines";
import { ecs } from "../../libs/ecs/ECS";
import { CompType } from "../../libs/ecs/ECSModel";
import { CCComp } from "./CCComp";
import { CCVMParentComp } from "./CCVMParentComp";

export class ModuleUtil {
    /**
     * 添加界面组件
     * @param ent      模块实体
     * @param ctor     界面逻辑组件
     * @param uiId     界面资源编号
     * @param uiArgs   界面参数
     */
    public static addView<T extends CCVMParentComp | CCComp>(
        ent: ecs.Entity,
        ctor: __private._types_globals__Constructor<T> | __private._types_globals__AbstractedConstructor<T>,
        uiId: number,
        uiArgs: any = null) {
        var uic: UICallbacks = {
            onAdded: (node: Node, params: any) => {
                var comp = node.getComponent(ctor) as ecs.Comp;
                ent.add(comp);
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
     */
    public static addViewAsync<T extends CCVMParentComp | CCComp>(
        ent: ecs.Entity,
        ctor: __private._types_globals__Constructor<T> | __private._types_globals__AbstractedConstructor<T>,
        uiId: number,
        uiArgs: any = null): Promise<Node | null> {
        return new Promise<Node | null>((resolve, reject) => {
            var uic: UICallbacks = {
                onAdded: (node: Node, params: any) => {
                    var comp = node.getComponent(ctor) as ecs.Comp;
                    ent.add(comp);
                    resolve(node);
                }
            };
            oops.gui.open(uiId, uiArgs, uic);
        });
    }

    /**
     * 业务实体上移除界面组件
     * @param ent        模块实体
     * @param ctor       界面逻辑组件
     * @param uiId       界面资源编号
     * @param isDestroy  是否释放界面缓存
     */
    public static removeView(ent: ecs.Entity, ctor: CompType<ecs.IComp>, uiId: number, isDestroy?: boolean) {
        ent.remove(ctor);
        oops.gui.remove(uiId, isDestroy);
    }
}