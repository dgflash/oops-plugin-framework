import { Component, error, Node, Vec3, _decorator } from 'cc';
import { Timer } from '../../core/common/timer/Timer';

const { ccclass } = _decorator;

/** 移动到指定目标位置 */
@ccclass('MoveTo')
export class MoveTo extends Component {
    /** 目标位置 */
    target: Vec3 | Node | null = null;
    /** 移动方向 */
    velocity: Vec3 = new Vec3();
    /** 移动速度（每秒移动的像素距离） */
    speed = 0;
    /** 是否计算将 Y 轴带入计算 */
    hasYAxis = true;

    /** 坐标标（默认本地坐标） */
    ns: number = Node.NodeSpace.LOCAL;
    /** 偏移距离 */
    offset = 0;
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
    /** 复用向量——避免每帧分配 Vec3 对象 */
    private _temp: Vec3 = new Vec3();

    protected onLoad(): void {
        this.enabled = false;
    }

    move() {
        this.enabled = true;
    }

    protected update(dt: number) {
        let end: Vec3 | null = null;

        if (this.speed <= 0) {
            error('[MoveTo] 移动速度必须要大于零');
            this.exit();
            return;
        }

        if (this.target instanceof Node) {
            if (!this.target.isValid) {
                this.exit();
                return;
            }
            end = this.ns === Node.NodeSpace.WORLD ? this.target.worldPosition : this.target.position;
        }
        else {
            end = this.target as Vec3;
        }

        // 移动目标节点被释放时
        if (end === null) {
            this.exit();
            return;
        }

        // 目标移动后，重计算移动方向与移动到目标点的速度
        if (this.end === null || !this.end.strictEquals(end)) {
            let target = end.clone();
            if (this.offsetVector) {
                target = target.add(this.offsetVector);
            }

            if (this.hasYAxis === false) {
                target.y = 0;
            }

            // 移动方向与移动速度（直接写入 velocity，避免 new Vec3）
            const start = this.ns === Node.NodeSpace.WORLD ? this.node.worldPosition : this.node.position;
            Vec3.subtract(this.velocity, target, start);
            this.velocity.normalize();

            // 移动时间与目标偏位置计算
            const distance = Vec3.distance(start, target) - this.offset;

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
            // _temp = velocity * speed * dt（写入预分配向量，零分配）
            Vec3.multiplyScalar(this._temp, this.velocity, this.speed * dt);
            const curPos = this.ns === Node.NodeSpace.WORLD
                ? this.node.worldPosition
                : this.node.position;
            this._temp.x += curPos.x;
            this._temp.y += curPos.y;
            this._temp.z += curPos.z;
            if (this.ns === Node.NodeSpace.WORLD) {
                this.node.worldPosition = this._temp;
            }
            else {
                this.node.position = this._temp;
            }
        }

        // 移动完成事件
        if (this.timer.update(dt)) {
            if (this.offset === 0 && this.end) {
                if (this.ns === Node.NodeSpace.WORLD) {
                    this.node.worldPosition = this.end;
                }
                else {
                    this.node.position = this.end;
                }
            }
            this.exit();
        }
    }

    private exit() {
        if (this.onComplete) {
            this.onComplete.call(this);
        }
        this.enabled = false;

        this.target = null;
        this.velocity.set(0, 0, 0);
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

    /**
     * 组件销毁时清理资源
     */
    protected onDestroy() {
        // 清理所有回调引用，防止内存泄漏
        this.target = null;
        this.onStart = null;
        this.onComplete = null;
        this.onChange = null;
        this.offsetVector = null;
        this.end = null;
        this.timer.reset();
    }
}