import { UIConfigMap } from "./layer/LayerEnum";
import { UIConfig } from "./layer/UIConfig";

var configs: UIConfigMap = {};

export namespace gui {
    /** 注册界面组件 */
    export function register(key: string, config: UIConfig) {
        return function (ctor: any) {
            //@ts-ignore
            ctor[gui.internal.GUI_KEY] = key;
            internal.setConfig(key, config);
        };
    }

    /** 框架内部使用方法 */
    export namespace internal {
        /** 界面唯一标记变量名 */
        export const GUI_KEY = "OOPS_GUI_KEY";

        /** 获取界面唯一关键字 */
        export function getKey(ctor: any) {
            return ctor[GUI_KEY];
        }

        /** 获取界面组件配置 */
        export function getConfig(key: string) {
            return configs[key];
        }

        /** 获取界面组件配置 */
        export function setConfig(key: string, config: UIConfig) {
            let c = getConfig(key);
            if (c == null) {
                configs[key] = config;
            }
            else {
                console.error(`界面${key}重复注册`);
            }
        }

        /** 初始化界面组件配置 */
        export function initConfigs(uicm: UIConfigMap) {
            for (const key in uicm) {
                configs[key] = uicm[key];
            }
        }
    }
}