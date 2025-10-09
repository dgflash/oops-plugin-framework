import { assetManager, error, ImageAsset, Sprite, SpriteFrame, Texture2D, _decorator } from 'cc';
import { oops } from '../../core/Oops';
import { VMBase } from './VMBase';
import { VMEnv } from './VMEnv';
import { v3 } from 'cc';
import { Vec3 } from 'cc';

const { ccclass, property, menu, executeInEditMode } = _decorator;

/**
 *  [VM-Sprite]
 *  专门处理 Sprite 相关 的组件
 */
@ccclass
@executeInEditMode
@menu('ModelViewer/VMPosition(坐标VM)')
export default class VMPosition extends VMBase {
    @property({
        tooltip: "监视对象路径"
    })
    watchPath: string = '';

    /** 按照匹配参数顺序保存的 path 数组 （固定） */
    protected watchPathArr: string[] = [];

    /** 按照路径参数顺序保存的 值的数组（固定）*/
    protected templateValueArr: any[] = [];

    onRestore() {
        this.checkLabel();
    }

    onLoad() {
        super.onLoad();
        this.checkLabel();

        if (VMEnv.editor) return;
    }

    start() {
        if (VMEnv.editor) return;

        this.onValueInit();
    }

    /** 初始化获取数据 */
    onValueInit() {
        this.setLabelValue(this.VM.getValue(this.watchPath));
    }

    /** 监听数据发生了变动的情况 */
    onValueChanged(n: any, o: any, pathArr: string[]) {
        this.setLabelValue(n);
    }

    setLabelValue(value: Vec3) {
        this.node.position = value
    }

    private checkLabel() {
        return true;
    }
}
