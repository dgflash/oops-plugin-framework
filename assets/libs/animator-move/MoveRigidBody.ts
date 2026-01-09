import { Component, EPSILON, error, RigidBody, Vec3, _decorator } from 'cc';

const { ccclass, property } = _decorator;

/** 旋转角度阈值，超过此值将降低速度比率 */
const ROTATION_ANGLE_THRESHOLD = 10;

/**
 * 物理方式移动
 * 1. 施加线性数度
 * 2. 施加阻尼
 * 3. 施加重力
 * 4. 控制移动速度或速度比率
 */
@ccclass('MoveRigidBody')
export class MoveRigidBody extends Component {
    @property({ tooltip: '阻尼' })
        damping = 0.5;

    @property({ tooltip: '重力' })
        gravity = -10;

    @property
    private _speed = 5;
    @property({ tooltip: '移动速度' })
    get speed(): number {
        return this._speed;
    }
    set speed(value: number) {
        this._speed = value;
        this._curMaxSpeed = value * this.ratio;
    }

    @property
    private _ratio = 1;
    @property({ tooltip: '速度比率' })
    get ratio(): number {
        return this._ratio;
    }
    set ratio(value: number) {
        this._ratio = value;
        this._curMaxSpeed = this.speed * value;
    }

    private _rigidBody: RigidBody = null!;
    private _grounded = true; // 是否着地
    private _curMaxSpeed = 0; // 当前最大速度
    private _prevAngleY = 0; // 之前的Y角度值
    private _stateX = 0;
    private _stateZ = 0;
    
    /** 临时向量，避免每次创建新对象 */
    private _tempVec3_0: Vec3 = new Vec3();
    private _tempVec3_1: Vec3 = new Vec3();

    /** 是否着地 */
    get grounded() {
        return this._grounded;
    }

    private _velocity: Vec3 = new Vec3();
    /** 移动方向 */
    get velocity(): Vec3 {
        return this._velocity;
    }
    set velocity(value: Vec3) {
        this._velocity = value;

        const x = value.x;
        const z = value.z;
        if ((x > 0 && this._stateX < 0) ||
            (x < 0 && this._stateX > 0) ||
            (z > 0 && this._stateZ < 0) ||
            (z < 0 && this._stateZ > 0)) {
            this._rigidBody.clearVelocity(); // 当前跟之前方向不一致则清除速度,避免惯性太大
        }

        this._stateX = x;
        this._stateZ = z;
    }

    protected start() {
        this._rigidBody = this.getComponent(RigidBody)!;
        if (!this._rigidBody) {
            error('[MoveRigidBody] 未找到 RigidBody 组件');
            this.enabled = false;
            return;
        }
        this._prevAngleY = this.node.eulerAngles.y;
        this._curMaxSpeed = this._speed * this._ratio;
    }

    /** 刚体停止移动 */
    stop() {
        this._stateX = 0;
        this._stateZ = 0;
        this._rigidBody.clearVelocity(); // 清除移动速度
    }

    protected update(dt: number) {
        if (!this._rigidBody) {
            return;
        }
        
        // 施加重力
        this.applyGravity();

        // 施加阻尼
        this.applyDamping(dt);

        // 未落地无法移动
        if (!this.grounded) {
            return;
        }

        // 施加移动
        this.applyLinearVelocity(this._tempVec3_0, 1);
    }

    /** 施加重力 */
    private applyGravity() {
        const g = this.gravity;
        const m = this._rigidBody.mass;
        this._tempVec3_1.set(0, m * g, 0);
        this._rigidBody.applyForce(this._tempVec3_1);
    }

    /** 施加阻尼 */
    private applyDamping(dt: number) {
        // 获取线性速度
        this._rigidBody.getLinearVelocity(this._tempVec3_1);

        if (this._tempVec3_1.lengthSqr() > EPSILON) {
            this._tempVec3_1.multiplyScalar(Math.pow(1.0 - this.damping, dt));
            this._rigidBody.setLinearVelocity(this._tempVec3_1);
        }
    }

    /**
     * 施加移动
     * @param {Vec3} dir        方向
     * @param {number} speed    移动速度
     */
    private applyLinearVelocity(dir: Vec3, speed: number) {
        if (this._stateX || this._stateZ) {
            this._tempVec3_0.set(this._stateX, 0, this._stateZ);
            this._tempVec3_0.normalize();
            // 获取线性速度
            this._rigidBody.getLinearVelocity(this._tempVec3_1);

            Vec3.scaleAndAdd(this._tempVec3_1, this._tempVec3_1, dir, speed);

            const ms = this._curMaxSpeed;
            const len = this._tempVec3_1.lengthSqr();
            let ratio = 1;
            if (len > ms) {
                if (Math.abs(this.node.eulerAngles.y - this._prevAngleY) >= ROTATION_ANGLE_THRESHOLD) {
                    ratio = 2;
                }
                this._prevAngleY = this.node.eulerAngles.y;
                this._tempVec3_1.normalize();
                this._tempVec3_1.multiplyScalar(ms / ratio);
            }
            this._rigidBody.setLinearVelocity(this._tempVec3_1);
        }
    }

    /**
     * 组件销毁时清理资源
     */
    protected onDestroy() {
        // 清理速度引用
        if (this._rigidBody && this._rigidBody.isValid) {
            this._rigidBody.clearVelocity();
        }
    }
}
