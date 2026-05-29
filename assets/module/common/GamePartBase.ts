/** GameComponent 子模块基类（可用于任意宿主对象） */
export abstract class GamePartBase {
    /** 构造函数
     * @param comp 宿主对象（如 GameComponent 或 CCEntity）
     */
    constructor(protected readonly comp: object) {}

    /** 组件销毁时回调，子类按需覆盖 */
    destroy(): void {}
}
