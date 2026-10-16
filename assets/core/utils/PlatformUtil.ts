import type { __private } from 'cc';
import { native, sys } from 'cc';

/** 平台数据 */
export class PlatformUtil {
    /** 获取当前设备的网络类型, 如果网络类型无法获取，默认将返回 `sys.NetworkType.LAN` */
    static getNetworkType(): __private._pal_system_info_enum_type_network_type__NetworkType {
        return sys.getNetworkType();
    }

    /**
     * 判断当前设备是否可连接网络
     * - 原生平台使用 `sys.getNetworkType()`
     * - H5/小游戏平台使用浏览器 `navigator.onLine`
     * @return true 表示有网络，false 表示无网络
     */
    static isNetworkAvailable(): boolean {
        if (sys.isNative) {
            return sys.getNetworkType() !== sys.NetworkType.NONE;
        }
        return typeof navigator !== 'undefined' && navigator.onLine;
    }

    /**
     * 获取当前设备的电池电量，如果电量无法获取，默认将返回 1
     * @return - 0.0 ~ 1.0
     */
    static getBatteryLevel(): number {
        return sys.getBatteryLevel();
    }

    /** 尝试打开一个 web 页面，并非在所有平台都有效 */
    static openURL(url: string) {
        sys.openURL(url);
    }

    /** 拷贝字符串到剪切板 */
    static async copyText(text: string) {
        if (sys.isNative) {
            native.copyTextToClipboard(text);
        }
        else {
            await navigator.clipboard.writeText(text);
        }
    }
}
