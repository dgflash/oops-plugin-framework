/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-24 17:14:57
 */

import { Node } from "cc";
import { UICallbacks, ViewParams } from "./Defines";
import { UIConfig } from "./LayerManager";
import { LayerPopUp } from "./LayerPopup";

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
    /** 当前窗口数据 */
    private current!: ViewParams;

    add(config: UIConfig, params?: any, callbacks?: UICallbacks): string {
        this.black.enabled = true;

        if (this.current && this.current.valid) {
            let uuid = this.getUuid(config.prefab);
            this.params.push({
                config: config,
                params: params,
                callbacks: callbacks,
            });
            return uuid;
        }
        return this.show(config, params, callbacks);
    }

    private show(config: UIConfig, params?: any, callbacks?: UICallbacks): string {
        let prefabPath = config.prefab
        var uuid = this.getUuid(prefabPath);
        var viewParams = this.ui_nodes.get(uuid);
        if (viewParams == null) {
            viewParams = new ViewParams();
            viewParams.uuid = this.getUuid(prefabPath);
            viewParams.prefabPath = prefabPath;
            viewParams.valid = true;
            this.ui_nodes.set(viewParams.uuid, viewParams);
        }

        viewParams.callbacks = callbacks ?? {};
        var onRemove_Source = viewParams.callbacks.onRemoved;
        viewParams.callbacks.onRemoved = (node: Node | null, params: any) => {
            if (onRemove_Source) {
                onRemove_Source(node, params);
            }
            setTimeout(this.next.bind(this), 0);
        };

        viewParams.params = params || {};
        this.current = viewParams;
        this.load(viewParams, config.bundle);

        return uuid;
    }

    protected setBlackDisable() {
        if (this.params.length == 0) this.black.enabled = false;
    }

    private next() {
        if (this.params.length > 0) {
            let param = this.params.shift()!;
            this.show(param.config, param.params, param.callbacks);
        }
    }
}