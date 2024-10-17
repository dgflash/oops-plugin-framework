/*
 * @Author: dgflash
 * @Date: 2022-02-10 09:50:41
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:09:55
 */
import { Node, director } from 'cc';

/** 游戏世界管理 */
export class GameManager {
    /** 界面根节点 */
    root!: Node;

    constructor(root: Node) {
        this.root = root;
    }

    /** 设置游戏动画速度 */
    setTimeScale(scale: number) {
        //@ts-ignore
        director.globalGameTimeScale = scale;
    }
    /** 获取游戏动画速度 */
    getTimeScale() {
        //@ts-ignore
        return director.globalGameTimeScale;
    }
}
