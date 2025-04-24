/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-24 17:14:57
 */

import { UICallbacks, ViewParams } from "./Defines";
import { LayerPopUp } from "./LayerPopup";
import { UIConfig } from "./UIConfig";

/** 模式弹窗数据 */
type DialogParam = {
    config: UIConfig;
    params?: any;
    callbacks?: UICallbacks;
}

/*
 * 模式弹窗层，该层的窗口同时只能显示一个，删除以后会自动从队列当中取一个弹窗，直到队列为空
 */
export class LayerDialog extends LayerPopUp {
    /** 窗口调用参数队列 */
    private params: Array<DialogParam> = [];

    add(uiid: number, config: UIConfig, params?: any, callbacks?: UICallbacks) {
        // 控制同一时间只能显示一个模式窗口
        if (this.ui_nodes.size > 0) {
            this.params.push({
                config: config,
                params: params,
                callbacks: callbacks,
            });
            return;
        }

        this.show(uiid, config, params, callbacks);
    }

    /** 显示模式弹窗 */
    private show(uiid: number, config: UIConfig, params?: any, callbacks?: UICallbacks) {
        let vp = this.ui_cache.get(config.prefab);
        if (vp == null) {
            vp = new ViewParams();
            vp.uiid = uiid;
            vp.valid = true;
            vp.config = config;
        }

        vp.params = params || {};
        vp.callbacks = callbacks ?? {};
        this.ui_nodes.set(vp.config.prefab, vp);

        this.load(vp, config.bundle);
    }

    protected onCloseWindow(vp: ViewParams) {
        super.onCloseWindow(vp);
        setTimeout(() => {
            this.next(vp);
        }, 0);
    }

    protected setBlackDisable() {
        if (this.params.length == 0) {
            this.black.enabled = false;
            this.closeVacancyRemove();
            this.closeMask()
        }
    }

    private next(vp: ViewParams) {
        if (this.params.length > 0) {
            let param = this.params.shift()!;
            this.show(vp.uiid, param.config, param.params, param.callbacks);
        }
    }
}