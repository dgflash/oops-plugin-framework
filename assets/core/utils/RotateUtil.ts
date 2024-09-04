/*
 * @Author: dgflash
 * @Date: 2022-07-26 15:29:57
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:08:28
 */
import { Node, Quat, toRadian, Vec3 } from "cc";
import { Vec3Util } from "./Vec3Util";

/** 旋转工具 */
export class RotateUtil {
    /**
     * 自由旋转
     * @param target     旋转目标
     * @param axis       围绕旋转的轴
     * @param rad        旋转弧度
     */
    static rotateAround(target: Node, axis: Vec3, rad: number) {
        const quat = new Quat();
        Quat.rotateAround(quat, target.getRotation(), axis.normalize(), rad);
        target.setRotation(quat);
    }

    /**
     * 参考瞄准目标,使当前物体围绕瞄准目标旋转
     * 1、先通过弧度计算旋转四元数
     * 2、通过旋转中心点或当前目标点向量相减计算出移动方向
     * 3、计算起始向量旋转后的向量
     * 4、计算旋转后的坐标点
     * @param lookAt        瞄准目标
     * @param target        旋转目标
     * @param axis          围绕旋转的轴(例：Vec3.UP为Y轴)
     * @param rad           旋转弧度(例：delta.x * 1e-2)
     */
    static rotateAroundTarget(lookAt: Node, target: Node, axis: Vec3, rad: number) {
        // 计算坐标
        const point_lookAt = lookAt.worldPosition;               // 锚点坐标
        const point_target = target.worldPosition;               // 目标坐标
        const quat = new Quat();
        const vec3 = new Vec3();

        // 算出坐标点的旋转四元数
        Quat.fromAxisAngle(quat, axis, rad);
        // 计算旋转点和现有点的向量
        Vec3.subtract(vec3, point_target, point_lookAt);
        // 计算将向量做旋转操作后的向量
        Vec3.transformQuat(vec3, vec3, quat);
        // 计算目标旋转后的点
        Vec3.add(vec3, point_lookAt, vec3);
        target.setWorldPosition(vec3);

        // 计算目标朝向瞄准点
        Quat.rotateAround(quat, target.worldRotation, axis, rad);
        Quat.normalize(quat, quat);
        target.setWorldRotation(quat);
    }

    /**
     * 获取心半径边上的位置
     * @param center    圆心
     * @param radius    半径
     * @param angle     角度
     */
    static circularEdgePosition(center: Vec3, radius: number, angle: number): Vec3 {
        const edge = Vec3Util.z.multiplyScalar(radius);                  // 距离圆心Z抽的距离
        const dir = Vec3Util.sub(edge, center);                          // 初始圆心与目标位置的方向
        const vec3 = new Vec3();
        const quat = new Quat();

        // 算出坐标点的旋转四元数
        Quat.fromAxisAngle(quat, Vec3.UP, toRadian(angle));
        // 计算将向量做旋转操作后的向量
        Vec3.transformQuat(vec3, dir, quat);
        // 计算目标旋转后的点
        Vec3.add(vec3, center, vec3);

        return vec3;
    }
}