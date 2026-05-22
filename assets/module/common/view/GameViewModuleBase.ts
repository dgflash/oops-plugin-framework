/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 */
import type { GameComponent } from '../GameComponent';

/** GameComponent 下 view 子模块基类 */
export abstract class GameViewModule {
    /** 构造函数
     * @param comp 游戏组件
     */
    constructor(protected readonly comp: GameComponent) {}

    /** 组件销毁时回调，子类按需覆盖 */
    destroy(): void {}
}