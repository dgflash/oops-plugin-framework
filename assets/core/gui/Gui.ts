import type { GameComponentCtor, UICtor } from '../../types/Module';
import type { UIConfigMap } from './layer/LayerEnum';
import type { UIConfig } from './layer/UIConfig';

const configs: UIConfigMap = {};

export namespace gui {
    /** 注册界面组件 */
    export function register(key: string, config: UIConfig): (ctor: GameComponentCtor) => void {
        return function (ctor: GameComponentCtor): void {
            (ctor as any)[gui.internal.GUI_KEY] = key;
            internal.setConfig(key, config);
        };
    }

    /** 框架内部使用方法 */
    export namespace internal {
        /** 界面唯一标记变量名 */
        export const GUI_KEY = 'OOPS_GUI_KEY';

        /** 获取界面唯一关键字 */
        export function getKey(ctor: UICtor): string {
            return (ctor as any)[GUI_KEY];
        }

        /** 获取界面组件配置 */
        export function getConfig(key: string): UIConfig {
            return configs[key];
        }

        /** 设置界面组件配置 */
        export function setConfig(key: string, config: UIConfig): void {
            if (configs[key] != null) {
                console.error(`界面${key}重复注册`);
                return;
            }
            configs[key] = config;
        }

        /** 初始化界面组件配置 */
        export function initConfigs(uicm: UIConfigMap): void {
            for (const key in uicm) {
                configs[key] = uicm[key];
            }
        }
    }
}
