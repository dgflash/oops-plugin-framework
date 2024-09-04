/*
 * @Author: dgflash
 * @Date: 2022-07-21 17:30:59
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 14:40:28
 */
import { Node } from "cc";

/** 物理分组数据 */
export class GroupItem {
    private readonly _value: number;
    /** 分组值 */
    get value(): number {
        return this._value;
    }

    private readonly _name!: string;
    /** 分组名 */
    get name(): string {
        return this._name;
    }

    /** 碰撞掩码 */
    get mask(): number {
        return 1 << this._value;
    }

    /**
     * 构造函数
     * @param value 分组值
     * @param name  分组名
     */
    constructor(value: number, name: string) {
        this._value = value;
        this._name = name;
    }
}

/***
 * 为了方便使用，将编辑器中的物理分组定义到代码。如果编辑器中有修改，确保同步到这里。
 */
export class PhysicsUtil {
    /** 默认物理分组 */
    static DEFAULT = new GroupItem(0, 'DEFAULT');
    /** 能通过屏幕触摸中发出的射线检查到的游戏对象 */
    static GAME_OBJECT_SELECT = new GroupItem(1, 'GAME_OBJECT_SELECT');
    /** 玩家自己 */
    static GAME_OWNER = new GroupItem(2, 'GAME_OWNER');

    static setNodeLayer(item: GroupItem, node: Node) {
        node.layer = item.mask;
        node.children.forEach(n => {
            n.layer = item.mask;
            PhysicsUtil.setNodeLayer(item, n);
        });
    }
}