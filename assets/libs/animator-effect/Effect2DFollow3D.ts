/*
 * @Author: dgflash
 * @Date: 2022-03-31 18:03:50
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-22 14:53:47
 */

import { Camera, Component, Node, Vec3, _decorator } from "cc";
import { oops } from "../../core/Oops";
import { MathUtil } from "../../core/utils/MathUtil";

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

    /** 距离 */
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
    }

    start() {
        var scale = this.zoom();
        this.node.setScale(scale, scale, 1);
    }

    protected lateUpdate(dt: number) {
        var scale = this.zoom();
        scale = MathUtil.lerp(this.node.scale.x, scale, 0.1);
        this.node.setScale(scale, scale, 1);
    }

    private zoom(): number {
        this.camera.convertToUINode(this.node3d.worldPosition, oops.gui.game, this.pos);
        this.nodeUi.setPosition(this.pos);

        // @ts-ignore
        Vec3.transformMat4(this.pos, this.node3d.worldPosition, this.camera._camera!.matView);
        var ratio = this.distance / Math.abs(this.pos.z);
        var value = Math.floor(ratio * 100) / 100;
        return value;
    }
}

