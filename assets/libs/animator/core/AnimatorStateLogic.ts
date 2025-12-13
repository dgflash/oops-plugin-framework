/**
 * 状态逻辑基类
 */
export class AnimatorStateLogic {
    /**
     * 进入状态时调用
     * @virtual
     */
    onEntry() {
    }

    /**
     * 每次状态机逻辑更新时调用
     * @virtual
     */
    onUpdate() {
    }

    /**
     * 离开状态时调用
     * @virtual
     */
    onExit() {
    }
}
