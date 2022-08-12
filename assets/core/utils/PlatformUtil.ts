/*
 * @Date: 2021-08-14 16:17:03
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-12 16:50:15
 */
import { native, sys } from "cc";

/** 平台数据 */
export class PlatformUtil {
    /** 是否为安卓系统 */
    public static isNativeAndroid() {
        if (typeof native == "undefined")
            return false
        if (sys.isNative && sys.platform === sys.Platform.ANDROID)
            return true
        return false
    }

    /** 是否为苹果系统 */
    public static isNativeIOS() {
        if (typeof native == "undefined")
            return false
        if (sys.isNative && sys.os === sys.OS.IOS)
            return true
        return false
    }

    /** 获取平台名 */
    public static getPlateform() {
        if (this.isNativeAndroid())
            return 'android'
        else if (this.isNativeIOS())
            return 'ios'
        else
            return 'h5'
    }

    public static isIOSWebview() {
        //@ts-ignore
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.sdkLoginOut)
            return true
        else
            return false
    }
}
