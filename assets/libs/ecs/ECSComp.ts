/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-05 14:03:54
 */
import { ecs } from "./ECS";
import { ECSEntity } from "./ECSEntity";

/** 
 * 组件抽象类
 * 注：建议组件里面只放数据可能在实际写代码会碰到一些比较麻烦的问题，如果是单纯对组件内的数据操作可以在组件里面写方法
 */
export abstract class ECSComp implements ecs.IComp {
    /** 组件的类型编号，-1表示未给该组件分配编号 */
    static tid: number = -1;

    /** 组件名 */
    static compName: string;

    /** 拥有该组件的实体 */
    ent!: ECSEntity;

    /**
     * 是否可回收组件对象，默认情况下都是可回收的
     * 注：如果该组件对象是由ecs系统外部创建的，则不可回收，需要用户自己手动进行回收
     */
    canRecycle: boolean = true;

    /**
     * 组件被回收时会调用这个接口。可以在这里重置数据，或者解除引用
     * 注：不要偷懒，除非你能确定并保证组件在复用时，里面的数据是先赋值然后再使用
     */
    abstract reset(): void;
}