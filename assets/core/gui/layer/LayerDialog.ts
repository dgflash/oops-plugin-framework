/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-24 17:14:57
 */
import { Node } from "cc";
import { LayerPopUp } from "./LayerPopup";
import { UIParam, UIState } from "./LayerUIElement";
import { UIConfig } from "./UIConfig";

/** 模式弹窗数据 */
type DialogParam = {
    /** 弹窗唯一编号 */
    uiid: string;
    /** 窗口配置 */
    config: UIConfig;
    /** 窗口附加参数 */
    params?: UIParam;
}

/*
 * 模式弹窗层，该层的窗口同时只能显示一个，删除以后会自动从队列当中取一个弹窗，直到队列为空
 */
export class LayerDialog extends LayerPopUp {
    /** 窗口调用参数队列 */
    private params: Array<DialogParam> = [];
    /** 当前打开的界面 */
    private current: Node = null!;

    /** 
     * 添加模式窗口 
     * 1. 同时添加多个模式窗口时，第一个之后的窗口会先队列起来，在第一个关闭后在加载与显示第二个；同时方法返回节点保持只返回当前显示的界面节点
     */
    add(uiid: string, config: UIConfig, params?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            // 控制同一时间只能显示一个模式窗口
            if (this.ui_nodes.size > 0) {
                this.params.push({ uiid: uiid, config: config, params: params });
                resolve(this.current);
            }
            else {
                this.current = await this.showDialog(uiid, config, params);
                resolve(this.current);
            }
        });
    }

    /** 显示模式弹窗 */
    private showDialog(uiid: string, config: UIConfig, param?: UIParam): Promise<Node> {
        return new Promise<Node>(async (resolve, reject) => {
            let state = this.initUIConfig(uiid, config, param);
            let node = await this.load(state);
            resolve(node);
        });
    }

    protected closeUi(state: UIState) {
        super.closeUi(state);
        setTimeout(this.next.bind(this), 0);
    }

    protected closeBlack() {
        if (this.params.length == 0) {
            super.closeBlack();
        }
    }

    private next() {
        if (this.params.length > 0) {
            let param = this.params.shift()!;
            this.showDialog(param.uiid, param.config, param.params);
        }
    }
}