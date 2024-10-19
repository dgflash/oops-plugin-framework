export const TemplateBll = `import { ecs } from "db://oops-framework/libs/ecs/ECS";

/** 业务输入参数 */
@ecs.register('<%Name%>')
export class <%Name%>Comp extends ecs.Comp {
    /** 业务层组件移除时，重置所有数据为默认值 */
    reset() {
        
    }
}

/** 业务逻辑处理对象 */
@ecs.register('<%ModuleName%>')
export class <%Name%>System extends ecs.ComblockSystem implements ecs.IEntityEnterSystem {
    filter(): ecs.IMatcher {
        return ecs.allOf(<%Name%>Comp);
    }

    entityEnter(e: ecs.Entity): void {
        // 注：自定义业务逻辑

        e.remove(<%Name%>Comp);
    }
}`;