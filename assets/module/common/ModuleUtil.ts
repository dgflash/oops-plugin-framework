import { Node, __private } from "cc";
import { oops } from "../../core/Oops";
import { UICallbacks } from "../../core/gui/layer/Defines";
import { ecs } from "../../libs/ecs/ECS";
import { CCComp } from "./CCComp";
import { CCVMParentComp } from "./CCVMParentComp";
import { CompType } from "../../libs/ecs/ECSModel";

export class ModuleUtil {
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

    public static removeView(ent: ecs.Entity, ctor: CompType<ecs.IComp>, uiId: number, isDestroy: boolean = true) {
        ent.remove(ctor);
        oops.gui.remove(uiId, isDestroy);
    }
}