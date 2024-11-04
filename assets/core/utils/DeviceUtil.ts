import { sys } from "cc";

/** 设备工具 */
export class DeviceUtil {
    /** 返回手机屏幕安全区域，如果不是异形屏将默认返回设计分辨率尺寸。目前只支持安卓、iOS 原生平台和微信小游戏平台 */
    static getSafeAreaRect() {
        return sys.getSafeAreaRect();
    }

    /** 当前平台 */
    static get platform() { return sys.platform; }

    /** 当前操作系统 */
    static get os() { return sys.os; }

    /** 是否为原生环境 */
    static get isNative() { return sys.isNative; }

    /** 是否为浏览器环境 */
    static get isBrowser() { return sys.isBrowser; }

    /** 是否为手机 */
    static get isMobile() { return sys.isMobile; }

    /** 是否为安卓手机 */
    static get isAndroid() { return sys.platform === sys.Platform.ANDROID; }

    /** 是否为苹果手机 */
    static get isIPhone() { return sys.platform === sys.Platform.IOS; }

    /** 是否为手机浏览器 */
    static get isMobileBrowser() { return sys.platform === sys.Platform.MOBILE_BROWSER; }

    /** 是否为桌面浏览器 */
    static get isDesktopBrowser() { return sys.platform === sys.Platform.DESKTOP_BROWSER; }

    /** 是否为微信小游戏 */
    static get isWeChat() { return sys.platform === sys.Platform.WECHAT_GAME; }

    /** 是否为字节小游戏 */
    static get isByteDance() { return sys.platform === sys.Platform.BYTEDANCE_MINI_GAME; }

    /** 是否为百度小游戏 */
    static get isBaidu() { return sys.platform === sys.Platform.BAIDU_MINI_GAME; }

    /** 是否为 vivo 小游戏 */
    static get isVivo() { return sys.platform === sys.Platform.VIVO_MINI_GAME; }

    /** 是否为 OPPO 小游戏 */
    static get isOPPO() { return sys.platform === sys.Platform.OPPO_MINI_GAME; }

    /** 是否为小米小游戏 */
    static get isXiaomi() { return sys.platform === sys.Platform.XIAOMI_QUICK_GAME; }

    /** 是否为华为小游戏 */
    static get isHuawei() { return sys.platform === sys.Platform.HUAWEI_QUICK_GAME; }

    /** 是否为支付宝小游戏 */
    static get isAlipay() { return sys.platform === sys.Platform.ALIPAY_MINI_GAME; }

    /** 是否为开源鸿蒙小游戏 */
    static get isOpenHarmony() { return sys.platform === sys.Platform.OPENHARMONY; }
}
