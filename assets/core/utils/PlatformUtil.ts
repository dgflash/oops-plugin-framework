/*
 * @Date: 2021-08-14 16:17:03
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 14:39:03
 */
import { __private, native, sys } from "cc";

/** 平台数据 */
export class PlatformUtil {
    /** 是否为安卓系统 */
    static isNativeAndroid() {
        if (typeof native == "undefined")
            return false
        return sys.isNative && sys.platform === sys.Platform.ANDROID;

    }

    /** 是否为苹果系统 */
    static isNativeIOS() {
        if (typeof native == "undefined")
            return false
        return sys.isNative && sys.os === sys.OS.IOS;

    }

    /** 获取平台名 */
    static getPlateform() {
        if (this.isNativeAndroid())
            return 'android'
        else if (this.isNativeIOS())
            return 'ios'
        else
            return 'h5'
    }

    // static isIOSWebview() {
    //     //@ts-ignore
    //     if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.sdkLoginOut)
    //         return true
    //     else
    //         return false
    // }

    /** 获取当前设备的网络类型, 如果网络类型无法获取，默认将返回 `sys.NetworkType.LAN` */
    getNetworkType(): __private._pal_system_info_enum_type_network_type__NetworkType {
        return sys.getNetworkType();
    }

    /**
     * 获取当前设备的电池电量，如果电量无法获取，默认将返回 1
     * @return - 0.0 ~ 1.0
     */
    getBatteryLevel(): number {
        return sys.getBatteryLevel();
    }

    /** 尝试打开一个 web 页面，并非在所有平台都有效 */
    openURL(url: string) {
        sys.openURL(url);
    }

    /** 拷贝字符串到剪切板 */
    copyText(text: string) {
        native.copyTextToClipboard(text);
    }
}
