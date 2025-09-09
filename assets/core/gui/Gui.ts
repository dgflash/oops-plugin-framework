import { UIConfigMap } from "./layer/LayerEnum";
import { UIConfig } from "./layer/UIConfig";

var configs: UIConfigMap = {};

export namespace gui {
    /** 注册界面组件 */
    export function register(key: string, config: UIConfig) {
        return function (ctor: any) {
            ctor.oopsGuiKey = key;
            setConfig(key, config);
        };
    }

    /** 获取界面组件配置 */
    export function getConfig(key: string) {
        return configs[key];
    }

    /** 获取界面组件配置 */
    export function setConfig(key: string, config: UIConfig) {
        configs[key] = config;
    }

    /** 获取所有界面组件配置 */
    export function initConfigs(uicm: UIConfigMap) {
        for (const key in uicm) {
            configs[key] = uicm[key];
        }
    }
}