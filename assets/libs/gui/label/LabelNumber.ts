/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-11 09:54:30
 */
import { error, Label, _decorator } from "cc";

const { ccclass, property, menu } = _decorator;

/** 只能显示数字的标签组件 */
@ccclass("LabelNumber")
@menu('ui/label/LabelNumber')
export default class LabelNumber extends Label {
    @property
    _num: number = 0;
    @property
    set num(value: number) {
        this._num = value;
        this.updateLabel();
    }
    get num(): number {
        return this._num;
    }

    @property({
        tooltip: "是否显示货币符号"
    })
    _showSym: string = "";
    @property
    set showSym(value: string) {
        if (value) {
            this._showSym = value;
            this.updateLabel();
        }
    }
    get showSym(): string {
        return this._showSym;
    }

    /** 刷新lab */
    protected updateLabel() {
        if (typeof (this._num) != "number") {
            error("[LabelNumber] num不是一个合法数字");
        }
        this.string = this.num.toString();
    }
}