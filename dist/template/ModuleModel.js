"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateModel = void 0;
exports.TemplateModel = `import { ecs } from "db://oops-framework/libs/ecs/ECS";

/** 数据层对象 */
@ecs.register('<%Name%>')
export class <%Name%>Comp extends ecs.Comp {
    id: number = -1;

    /** 数据层组件移除时，重置所有数据为默认值 */
    reset() {
        this.id = -1;
    }
}`;
