/*
 * @Author: dgflash
 * @Date: 2022-03-31 18:03:50
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-07 10:05:32
 */

import { Camera, Component, Node, Vec3, _decorator } from "cc";
import { oops } from "../../core/Oops";

const { ccclass, property } = _decorator;

/** 2D节点跟随3D节点 */
@ccclass("Effect2DFollow3D")
export class Effect2DFollow3D extends Component {
    /** 3D世界节点 */
    @property({ type: Node })
    node3d: Node = null!;

    /** 2D界面界面 */
    @property({ type: Node })
    nodeUi: Node = null!;

    @property
    distance: number = 10;

    /** 3D摄像机 */
    camera: Camera = null!;

    private pos = new Vec3();

    /**
     * 设3D定位参考点，并更新位置
     * @param node 3D世界节点
     */
    setTarget(node: Node) {
        this.node3d = node;
        this.lateUpdate(0);
    }

    protected lateUpdate(dt: number) {
        this.camera.convertToUINode(this.node3d.worldPosition, oops.gui.game, this.pos);
        this.nodeUi.setPosition(this.pos);

        // @ts-ignore 注：优化为事件触发式，避免重复计算
        Vec3.transformMat4(this.pos, this.node3d.worldPosition, this.camera._camera!.matView);
        const ratio = this.distance / Math.abs(this.pos.z);
        const value = Math.floor(ratio * 100) / 100;
        this.node.setScale(value, value, 1);
    }
}

