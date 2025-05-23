
/*
 * @Author: dgflash
 * @Date: 2022-03-25 18:12:10
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-19 14:59:50
 */
import { Component, Node, Vec3, _decorator } from "cc";
import { Timer } from "../../core/common/timer/Timer";
import { Vec3Util } from "../../core/utils/Vec3Util";

const { ccclass, property } = _decorator;

/** 移动到指定目标位置 */
@ccclass('MoveTo')
export class MoveTo extends Component {
    /** 目标位置 */
    target: Vec3 | Node | null = null;
    /** 移动方向 */
    velocity: Vec3 = Vec3Util.zero;
    /** 移动速度（每秒移动的像素距离） */
    speed: number = 0;
    /** 是否计算将 Y 轴带入计算 */
    hasYAxis: boolean = true;

    /** 坐标标（默认本地坐标） */
    ns: number = Node.NodeSpace.LOCAL;
    /** 偏移距离 */
    offset: number = 0;
    /** 偏移向量 */
    offsetVector: Vec3 | null = null;
    /** 移动开始 */
    onStart: Function | null = null;
    /** 移动完成回调 */
    onComplete: Function | null = null;
    /** 距离变化时 */
    onChange: Function | null = null;

    /** 延时触发器 */
    private timer: Timer = new Timer();
    /** 终点备份 */
    private end: Vec3 | null = null;

    protected onLoad(): void {
        this.enabled = false;
    }

    move() {
        this.enabled = true;
    }

    update(dt: number) {
        let end: Vec3;

        if (this.speed <= 0) {
            console.error("移动速度必须要大于零");
            return;
        }

        if (this.target instanceof Node) {
            end = this.ns == Node.NodeSpace.WORLD ? this.target.worldPosition : this.target.position;
        }
        else {
            end = this.target as Vec3;
        }

        // 移动目标节点被释放时
        if (end == null) {
            this.exit();
            return;
        }

        // 目标移动后，重计算移动方向与移动到目标点的速度
        if (this.end == null || !this.end.strictEquals(end)) {
            let target = end.clone();
            if (this.offsetVector) {
                target = target.add(this.offsetVector);
            }

            if (this.hasYAxis == false) target.y = 0;

            // 移动方向与移动数度
            let start = this.ns == Node.NodeSpace.WORLD ? this.node.worldPosition : this.node.position;
            this.velocity = Vec3Util.sub(target, start).normalize();

            // 移动时间与目标偏位置计算
            let distance = Vec3.distance(start, target) - this.offset;

            // 目标位置修改事件
            this.onChange?.call(this);

            if (distance <= 0) {
                this.exit();
                return;
            }
            else {
                this.onStart?.call(this);
                this.timer.step = distance / this.speed;
                this.end = end.clone();
            }
        }

        if (this.speed > 0) {
            let trans = Vec3Util.mul(this.velocity, this.speed * dt);
            if (this.ns == Node.NodeSpace.WORLD)
                this.node.worldPosition = Vec3Util.add(this.node.worldPosition, trans);
            else
                this.node.position = Vec3Util.add(this.node.position, trans);
        }

        // 移动完成事件
        if (this.timer.update(dt)) {
            if (this.offset == 0) {
                if (this.ns == Node.NodeSpace.WORLD)
                    this.node.worldPosition = this.end;
                else
                    this.node.position = this.end;
            }
            this.exit();
        }
    }

    private exit() {
        this.onComplete?.call(this);
        this.enabled = false;

        this.target = null;
        this.velocity = Vec3Util.zero;
        this.speed = 0;
        this.hasYAxis = true;
        this.ns = Node.NodeSpace.LOCAL;
        this.offset = 0;
        this.offsetVector = null;
        this.onStart = null;
        this.onComplete = null;
        this.onChange = null;
        this.timer.reset();
        this.end = null;
    }
}