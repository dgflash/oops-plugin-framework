import { Node, ResolutionPolicy, SafeArea, screen, view } from 'cc';
import { oops } from '../../Oops';

/**
 * 屏幕适配器
 * 负责处理屏幕分辨率适配、安全区域适配等功能
 */
export class ScreenAdapter {
    /** 窗口宽高比例 */
    windowAspectRatio = 0;
    /** 设计宽高比例 */
    designAspectRatio = 0;
    /** 是否开启移动设备安全区域适配 */
    mobileSafeArea = false;

    /**
     * 初始化屏幕适配
     * @param root 界面根节点
     */
    init(root: Node): void {
        const drs = view.getDesignResolutionSize();
        let ws = screen.windowSize;

        // 如果 windowSize 为 0，使用设计分辨率作为后备
        if (ws.width === 0 || ws.height === 0) {
            ws = drs;
        }

        this.windowAspectRatio = ws.width / ws.height;
        this.designAspectRatio = drs.width / drs.height;

        let finalW = 0;
        let finalH = 0;

        if (this.windowAspectRatio > this.designAspectRatio) {
            finalH = drs.height;
            finalW = finalH * ws.width / ws.height;
            oops.log.logView('适配屏幕高度', '【横屏】');
        }
        else {
            finalW = drs.width;
            finalH = finalW * ws.height / ws.width;
            oops.log.logView('适配屏幕宽度', '【竖屏】');
        }
        view.setDesignResolutionSize(finalW, finalH, ResolutionPolicy.UNKNOWN);

        if (this.mobileSafeArea) {
            root.addComponent(SafeArea);
            oops.log.logView('开启移动设备安全区域适配');
        }
    }

    /**
     * 获取当前窗口宽高比例
     */
    getWindowAspectRatio(): number {
        return this.windowAspectRatio;
    }

    /**
     * 获取设计宽高比例
     */
    getDesignAspectRatio(): number {
        return this.designAspectRatio;
    }

    /**
     * 设置是否开启移动设备安全区域适配
     * @param enabled 是否开启
     */
    setMobileSafeArea(enabled: boolean): void {
        this.mobileSafeArea = enabled;
    }

    /**
     * 判断是否开启移动设备安全区域适配
     */
    isMobileSafeAreaEnabled(): boolean {
        return this.mobileSafeArea;
    }
}
