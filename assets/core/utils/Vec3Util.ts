import {Mat4, Vec3} from "cc";
import {MathUtil} from "./MathUtil";

/** 向量工具 */
export class Vec3Util {
    /**
     * X轴
     */
    static get x(): Readonly<Vec3> {
        return new Vec3(1, 0, 0);
    }

    /**
     * Y轴
     */
    static get y(): Readonly<Vec3> {
        return new Vec3(0, 1, 0);
    }

    /**
     * Z轴
     */
    static get z(): Readonly<Vec3> {
        return new Vec3(0, 0, 1);
    }

    /**
     * 左向量
     */
    static get left(): Readonly<Vec3> {
        return new Vec3(-1, 0, 0);
    }

    /**
     * 右向量
     */
    static get right(): Readonly<Vec3> {
        return new Vec3(1, 0, 0);
    }

    /**
     * 上向量
     */
    static get up(): Readonly<Vec3> {
        return new Vec3(0, 1, 0);
    }

    /**
     * 下向量
     */
    static get down(): Readonly<Vec3> {
        return new Vec3(0, -1, 0);
    }

    /**
     * 前向量
     */
    static get forward(): Readonly<Vec3> {
        return new Vec3(0, 0, 1);
    }

    /**
     * 后向量
     */
    static get back(): Readonly<Vec3> {
        return new Vec3(0, 0, -1);
    }

    /**
     * 1向量
     */
    static get one(): Readonly<Vec3> {
        return new Vec3(1, 1, 1);
    }

    /**
     * 0向量
     */
    static get zero(): Readonly<Vec3> {
        return new Vec3(0, 0, 0);
    }

    /**
     * 随时间变化进度值
     * @param start  起始位置
     * @param end    结束位置
     * @param t      进度[0，1]
     */
    static progress(start: Vec3, end: Vec3, t: number): Vec3 {
        const current = new Vec3();
        current.x = MathUtil.progress(start.x, end.x, t);
        current.y = MathUtil.progress(start.y, end.y, t);
        current.z = MathUtil.progress(start.z, end.z, t);
        return current;
    }

    /**
     * 求两个三维向量的和
     * @param pos1  向量1
     * @param pos2  向量2
     */
    static add(pos1: Vec3, pos2: Vec3): Vec3 {
        const outPos: Vec3 = new Vec3();
        Vec3.add(outPos, pos1, pos2);
        return outPos;
    }

    /**
     * 求两个三维向量的差
     * @param pos1  向量1
     * @param pos2  向量2
     */
    static sub(pos1: Vec3, pos2: Vec3): Vec3 {
        const outPos: Vec3 = new Vec3();
        Vec3.subtract(outPos, pos1, pos2);
        return outPos;
    }

    /**
     * 三维向量乘以常量
     * @param pos     向量
     * @param scalar  常量
     */
    static mul(pos: Vec3, scalar: number): Vec3 {
        const outPos: Vec3 = new Vec3();
        Vec3.multiplyScalar(outPos, pos, scalar);
        return outPos;
    }

    /**
     * 三维向量除常量
     * @param pos     向量
     * @param scalar  常量
     */
    static div(pos: Vec3, scalar: number): Vec3 {
        const outPos: Vec3 = new Vec3();

        outPos.x = pos.x / scalar;
        outPos.y = pos.y / scalar;
        outPos.z = pos.z / scalar;

        return outPos;
    }

    /**
     * 判断两个三维向量的值是否相等
     * @param pos1  向量1
     * @param pos2  向量2
     */
    static equals(pos1: Vec3, pos2: Vec3): boolean {
        return pos1.x == pos2.x && pos1.y == pos2.y && pos1.z == pos2.z;
    }

    /**
     * 三维向量的模
     * @param pos  向量
     */
    static magnitude(pos: Vec3): number {
        return pos.length();
    }

    /**
     * 三维向量归一化
     * @param pos  向量
     */
    static normalize(pos: Vec3): Vec3 {
        const outPos: Vec3 = new Vec3(pos.x, pos.y, pos.z);
        return outPos.normalize();
    }

    /**
     * 获得位置1，到位置2的方向
     * @param pos1  向量1
     * @param pos2  向量2
     */
    static direction(pos1: Vec3, pos2: Vec3): Vec3 {
        const outPos: Vec3 = new Vec3();
        Vec3.subtract(outPos, pos2, pos1)
        return outPos.normalize();
    }

    /**
     * 获得两点间的距离
     * @param pos1  向量1
     * @param pos2  向量2
     */
    static distance(pos1: Vec3, pos2: Vec3): number {
        return Vec3.distance(pos1, pos2);
    }

    /**
     * 插值运算
     * @param posStart  开始俏步
     * @param posEnd    结束位置
     * @param t         时间
     */
    static lerp(posStart: Vec3, posEnd: Vec3, t: number): Vec3 {
        return this.bezierOne(t, posStart, posEnd);
    }

    /**
     * 球面插值
     * @param from  起点
     * @param to    终点
     * @param t     时间
     */
    static slerp(from: Vec3, to: Vec3, t: number): Vec3 {
        if (t <= 0) {
            return from;
        } else if (t >= 1) {
            return to;
        }

        var dir: Vec3 = this.rotateTo(from, to, (Vec3.angle(from, to) / Math.PI * 180) * t);
        var lenght: number = to.length() * t + from.length() * (1 - t);

        return (dir.normalize()).multiplyScalar(lenght);
    }

    /**
     * 向量旋转一个角度
     * @param from  起点
     * @param to    终点
     * @param angle 角并
     */
    static rotateTo(from: Vec3, to: Vec3, angle: number): Vec3 {
        //如果两个方向角度为0，则返回目标
        if (Vec3.angle(from, to) == 0) {
            return to;
        }

        const axis: Vec3 = new Vec3();                 // 获得旋转轴
        Vec3.cross(axis, from, to);
        axis.normalize();

        const radian: number = angle * Math.PI / 180; // 获得弧度
        const rotateMatrix: Mat4 = new Mat4();
        rotateMatrix.rotate(radian, axis);

        return new Vec3(
            from.x * rotateMatrix.m00 + from.y * rotateMatrix.m04 + from.z * rotateMatrix.m08,
            from.x * rotateMatrix.m01 + from.y * rotateMatrix.m05 + from.z * rotateMatrix.m09,
            from.x * rotateMatrix.m02 + from.y * rotateMatrix.m06 + from.z * rotateMatrix.m10
        );
    }

    /**
     * 一次贝塞尔即为线性插值函数
     * @param t
     * @param posStart
     * @param posEnd
     * @returns
     */
    static bezierOne(t: number, posStart: Vec3, posEnd: Vec3): Vec3 {
        if (t > 1) {
            t = 1;
        } else if (t < 0) {
            t = 0
        }

        var pStart: Vec3 = posStart.clone();
        var pEnd: Vec3 = posEnd.clone();

        return pStart.multiplyScalar(1 - t).add(pEnd.multiplyScalar(t));
    }

    /**
     * 二次贝塞尔曲线
     * @param t
     * @param posStart
     * @param posCon
     * @param posEnd
     * @returns
     */
    static bezierTwo(t: number, posStart: Vec3, posCon: Vec3, posEnd: Vec3): Vec3 {
        if (t > 1) {
            t = 1;
        } else if (t < 0) {
            t = 0
        }

        const n = (1 - t);
        const tt = t * t;

        const pStart: Vec3 = posStart.clone();
        const pos = new Vec3();

        const pCon: Vec3 = posCon.clone();
        const pEnd: Vec3 = posEnd.clone();

        pos.add(pStart.multiplyScalar(n * n));
        pos.add(pCon.multiplyScalar(2 * n * t));
        pos.add(pEnd.multiplyScalar(tt));

        return pos;
    }

    /**
     * 三次贝塞尔
     * @param t
     * @param posStart
     * @param posCon1
     * @param posCon2
     * @param posEnd
     * @returns
     */
    static bezierThree(t: number, posStart: Vec3, posCon1: Vec3, posCon2: Vec3, posEnd: Vec3): Vec3 {
        if (t > 1) {
            t = 1;
        } else if (t < 0) {
            t = 0
        }

        const n = (1 - t);
        const nn = n * n;
        const nnn = nn * n;
        const tt = t * t;
        const ttt = tt * t;

        const pStart: Vec3 = posStart.clone();
        const pos = posStart.clone();

        const pCon1: Vec3 = posCon1.clone();
        const pCon2: Vec3 = posCon2.clone();
        const pEnd: Vec3 = posEnd.clone();

        pos.add(pStart.multiplyScalar(nnn));
        pos.add(pCon1.multiplyScalar(3 * nn * t));
        pos.add(pCon2.multiplyScalar(3 * n * tt));
        pos.add(pEnd.multiplyScalar(ttt));

        return pos;
    }

    /**
     * 点乘
     * @param dir1 方向量1
     * @param dir2 方向量2
     */
    static dot(dir1: Vec3, dir2: Vec3): number {
        const tempDir1: Vec3 = dir1;
        const tempDir2: Vec3 = dir2;

        return tempDir1.x * tempDir2.x + tempDir1.y * tempDir2.y + tempDir1.z * tempDir2.z;
    }

    /**
     * 叉乘
     * @param dir1 方向量1
     * @param dir2 方向量2
     */
    static cross(dir1: Vec3, dir2: Vec3): Vec3 {
        const i: Vec3 = new Vec3(1, 0, 0);
        const j: Vec3 = new Vec3(0, 1, 0);
        const k: Vec3 = new Vec3(0, 0, 1);

        const tempDir1: Vec3 = new Vec3(dir1.x, dir1.y, dir1.z);
        const tempDir2: Vec3 = new Vec3(dir2.x, dir2.y, dir2.z);

        const iv: Vec3 = i.multiplyScalar(tempDir1.y * tempDir2.z - tempDir2.y * tempDir1.z);
        const jv: Vec3 = j.multiplyScalar(tempDir2.x * tempDir1.z - tempDir1.x * tempDir2.z);
        const kv: Vec3 = k.multiplyScalar(tempDir1.x * tempDir2.y - tempDir2.x * tempDir1.y);

        return iv.add(jv).add(kv);
    }

    /**
     * 获得两个方向向量的角度
     * @param dir1 方向量1
     * @param dir2 方向量2
     */
    static angle(dir1: Vec3, dir2: Vec3): number {
        const dotValue = this.dot(dir1.clone().normalize(), dir2.clone().normalize());
        return Math.acos(dotValue) / Math.PI * 180 * Math.sign(dotValue);
    }

    /**
     * 获得方向a到方向b的角度（带有方向的角度）
     * @param a 角度a
     * @param b 角度b
     */
    static dirAngle(a: Vec3, b: Vec3): number {
        const c: Vec3 = Vec3Util.cross(a, b);
        const angle: number = Vec3Util.angle(a, b);
        // a 到 b 的夹角
        const sign = Math.sign(Vec3Util.dot(c.normalize(), Vec3Util.cross(b.normalize(), a.normalize())));

        return angle * sign;
    }
}