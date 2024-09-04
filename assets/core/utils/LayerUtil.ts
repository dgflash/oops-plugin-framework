/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 12:05:38
 */
import { Node } from "cc";

/** 游戏摄像机层数据 */
export class LayerItem {
    private readonly _value: number;
    get value(): number {
        return this._value;
    }

    private readonly _name!: string;
    get name(): string {
        return this._name;
    }

    get mask(): number {
        return 1 << this._value;
    }

    constructor(value: number, name: string) {
        this._value = value;
        this._name = name;
    }
}

/***
 * 游戏摄像机层管理工具
 */
export class LayerUtil {
    /** 地图对象层 */
    static MAP = new LayerItem(0, 'MAP');
    /** 替身对象层 */
    static AVATAR = new LayerItem(1, 'AVATAR');

    static IGNORE_RAYCAST = new LayerItem(20, 'IGNORE_RAYCAST');
    static GIZMOS = new LayerItem(21, 'GIZMOS');
    /** 编辑器对象层 */
    static EDITOR = new LayerItem(22, 'EDITOR');
    /** 三维对象层 */
    static UI_3D = new LayerItem(23, 'UI_3D');
    static SCENE_GIZMO = new LayerItem(24, 'SCENE_GIZMO');
    /** 二维对象层 */
    static UI_2D = new LayerItem(25, 'UI_2D');
    /** 引擎分析工具层 */
    static PROFILTER = new LayerItem(28, 'PROFILTER');
    /** 默认对象层 */
    static DEFAULT = new LayerItem(30, 'DEFAULT');

    /**
     * 设置节点层
     * @param item 层数据
     * @param node 节点
     */
    static setNodeLayer(item: LayerItem, node: Node): void {
        node.layer = item.mask;
        node.children.forEach(n => {
            n.layer = item.mask;
            LayerUtil.setNodeLayer(item, n);
        });
    }
}

