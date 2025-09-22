"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateView = void 0;
exports.TemplateView = `import { _decorator } from "cc";
import { ecs } from "db://oops-framework/libs/ecs/ECS";
import { CCView } from "db://oops-framework/module/common/CCView";

const { ccclass, property } = _decorator;

/** 视图层对象 */
@ccclass('<%Name%>Comp')
@ecs.register('<%Name%>', false)
export class <%Name%>Comp extends CCView<<%ModuleName%>> {
    

    reset() {
     
    }
}`;
