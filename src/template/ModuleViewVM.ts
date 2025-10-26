export const TemplateViewMvvm = `import { _decorator } from "cc";
import { gui } from "db://oops-framework/core/gui/Gui";
import { LayerType } from "db://oops-framework/core/gui/layer/LayerEnum";
import { ecs } from "db://oops-framework/libs/ecs/ECS";
import { CCViewVM } from "db://oops-framework/module/common/CCViewVM";

const { ccclass, property } = _decorator;

/** 视图层对象 - 支持 MVVM 框架的数据绑定 */
@ccclass('<%Name%>Comp')
@ecs.register('<%Name%>', false)
@gui.register('<%Name%>', { layer: LayerType.UI, prefab: "界面预制路径" })
export class <%Name%>Comp extends CCViewVM<<%ModuleName%>> {
    data: any = {};

    reset() {

    }
}`