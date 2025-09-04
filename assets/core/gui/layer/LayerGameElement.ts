import { _decorator, Component, Node, NodePool } from "cc";
import { GameElementConfig } from "./UIConfig";

const { ccclass } = _decorator;

/** 游戏元素组件 */
@ccclass('LayerGameElement')
export class LayerGameElement extends Component {
    /** 视图参数 */
    params: GameElementParams = null!;

    protected onDestroy(): void {
        this.params = null!;
    }
}

/** 游戏元素参数 */
export class GameElementParams {
    /** 游戏元素唯一编号 */
    uiid: string = null!;
    /** 游戏元素配置 */
    config: GameElementConfig = null!
    /** 同类游戏元素集合 */
    nodes: Node[] = null!;
    /** 同类游戏元素对象池 */
    pool: NodePool = null!;
}