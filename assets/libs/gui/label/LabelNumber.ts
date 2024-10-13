/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-11 10:27:04
 */
import {Label, _decorator, error} from "cc";

const {ccclass, property, menu} = _decorator;

/** 只能显示数字的标签组件 */
@ccclass("LabelNumber")
@menu('OopsFramework/Label/LabelNumber （只显示数字的标签）')
export default class LabelNumber extends Label {
    @property({tooltip: "数字"})
    _num: number = 0;
    @property({tooltip: "数字"})
    get num(): number {
        return this._num;
    }

    set num(value: number) {
        this._num = value;
        this.updateLabel();
    }

    @property({tooltip: "货币符号"})
    symbol: string = "";

    start() {
        this.updateLabel();
    }

    /** 刷新文本 */
    protected updateLabel() {
        this.string = this.num.toString() + this.symbol;
    }
}