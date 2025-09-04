/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-24 17:14:57
 */

import { LayerPopUp } from "./LayerPopup";
import { UICallbacks, UIParams } from "./LayerUIElement";
import { UIConfig } from "./UIConfig";

/** 模式弹窗数据 */
type DialogParam = {
    /** 弹窗唯一编号 */
    uiid: string;
    /** 窗口配置 */
    config: UIConfig;
    /** 窗口附加参数 */
    params?: any;
    /** 窗口回调 */
    callbacks?: UICallbacks;
}

/*
 * 模式弹窗层，该层的窗口同时只能显示一个，删除以后会自动从队列当中取一个弹窗，直到队列为空
 */
export class LayerDialog extends LayerPopUp {
    /** 窗口调用参数队列 */
    private params: Array<DialogParam> = [];

    add(uiid: string, config: UIConfig, params?: any, callbacks?: UICallbacks) {
        // 控制同一时间只能显示一个模式窗口
        if (this.ui_nodes.size > 0) {
            this.params.push({
                uiid: uiid,
                config: config,
                params: params,
                callbacks: callbacks,
            });
            return;
        }

        this.show(uiid, config, params, callbacks);
    }

    /** 显示模式弹窗 */
    private show(uiid: string, config: UIConfig, params?: any, callbacks?: UICallbacks) {
        let uip = this.ui_cache.get(config.prefab);
        if (uip == null) {
            uip = new UIParams();
            uip.uiid = uiid;
            uip.valid = true;
            uip.config = config;
        }

        uip.params = params || {};
        uip.callbacks = callbacks ?? {};
        this.ui_nodes.set(uip.config.prefab, uip);

        this.load(uip, config.bundle);
    }

    protected onCloseWindow(uip: UIParams) {
        super.onCloseWindow(uip);
        setTimeout(this.next.bind(this), 0);
    }

    protected closeUI() {
        if (this.params.length == 0) {
            this.black.enabled = false;
            this.closeVacancyRemove();
            this.closeMask()
        }
    }

    private next() {
        if (this.params.length > 0) {
            let param = this.params.shift()!;
            this.show(param.uiid, param.config, param.params, param.callbacks);
        }
    }
}