/*
 * @Author: dgflash
 * @Date: 2022-06-21 12:05:14
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-20 14:04:44
 */
import type { BTNodeJson } from './BTNodeJson';
import type { IControl } from './IControl';

/** 行为树节点 */
export abstract class BTreeNode implements IControl {
    protected _control: IControl | null = null;

    title: string;
    /** 可选唯一标识，用于可视化高亮/定位 */
    id?: string;

    constructor() {
        this.title = this.constructor.name;
    }

    start(blackboard?: object): void { }

    end(blackboard?: object): void { }

    abstract run(blackboard?: object): void;

    setControl(control: IControl): void {
        this._control = control;
    }

    /** 通知控制器当前节点处于 running 状态 */
    running(node: BTreeNode = this): void {
        if (this._control) {
            this._control.running(node);
        }
        else {
            console.error(`节点【${this.title}】的控制器未设置`);
        }
    }

    success(): void {
        if (this._control) {
            this._control.success();
        }
        else {
            console.error(`节点【${this.title}】的控制器未设置`);
        }
    }

    fail(): void {
        if (this._control) {
            this._control.fail();
        }
        else {
            console.error(`节点【${this.title}】的控制器未设置`);
        }
    }

    /** 序列化为 JSON 描述，叶子节点不含 children */
    toJSON(): BTNodeJson {
        const json: BTNodeJson = { type: this.constructor.name };
        if (this.id !== undefined) {
            json.id = this.id;
        }
        return json;
    }

    /** 清理节点资源 */
    destroy(): void {
        this._control = null;
    }
}
