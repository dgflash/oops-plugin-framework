/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 14:04:44
 */
import { IControl } from './IControl';

/** 行为树节点 */
export abstract class BTreeNode implements IControl {
    protected _control!: IControl;

    title: string;

    constructor() {
        this.title = this.constructor.name;
    }

    start(blackboard?: any) {

    }

    end(blackboard?: any) {

    }

    abstract run(blackboard?: any): void;

    setControl(control: IControl) {
        this._control = control;
    }

    running(blackboard?: any) {
        this._control.running(this);
    }

    success() {
        this._control.success();
    }

    fail() {
        this._control.fail();
    }
}