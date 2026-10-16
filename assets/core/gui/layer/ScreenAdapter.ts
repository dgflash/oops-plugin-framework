import { Node, ResolutionPolicy, SafeArea, Size, director, game, screen, sys, view } from 'cc';
import { oops } from '../../Oops';

/**
 * 尺寸变化后，隔这些毫秒各核对一次画布（见 {@link ScreenAdapter.settle}）。
 * macOS 上退出全屏有半秒多的动画，一路都在发 resize，拉到 1.5 秒才能盖住最后那一下。
 */
const SETTLE_DELAYS = [50, 150, 300, 600, 1000, 1500];

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
     * 项目设置里的原始设计分辨率（如 2560×1440）。
     *
     * {@link fit} 会把 view 上的设计分辨率改写成贴合窗口宽高比的尺寸，原值就读不回来了，
     * 所以第一次适配前先记一份，之后每次重新适配都从它算。
     */
    private baseDesign: Size | null = null;

    /** {@link settle} 排着的定时器；新的尺寸变化进来就整批重排。 */
    private settleTimers: ReturnType<typeof setTimeout>[] = [];

    /**
     * 初始化屏幕适配
     * @param root 界面根节点
     */
    init(root: Node): void {
        this.baseDesign = view.getDesignResolutionSize().clone();
        this.fit();

        // Web 端窗口尺寸会变（全屏 / 退出全屏、拖窗口、手机转屏）。引擎尺寸变了之后只会拿
        // 旧的设计分辨率重套 FIXED_HEIGHT，宽高比一变界面就会被裁掉或错位，所以这里跟着重算。
        // 引擎的 view 在引擎启动时就挂了同一组事件，比这里早，每次都是它先 resize、这里再改设计分辨率。
        if (sys.isBrowser) {
            screen.on('window-resize', this.onScreenChange, this);
            screen.on('orientation-change', this.onScreenChange, this);
            screen.on('fullscreen-change', this.onScreenChange, this);
            this.watchGameFrame();
        }

        if (this.mobileSafeArea) {
            root.addComponent(SafeArea);
            oops.log.logView('开启移动设备安全区域适配');
        }
    }

    /**
     * 按当前窗口重新计算设计分辨率：保证原始设计尺寸的宽、高两个方向都完整可见，
     * 多出来的那一边按窗口宽高比延长。结果与当前一致时不重设，免得白白触发 `design-resolution-changed`。
     */
    fit(): void {
        const drs = this.baseDesign ?? view.getDesignResolutionSize();
        let ws = screen.windowSize;

        // 如果 windowSize 为 0，使用设计分辨率作为后备
        if (ws.width === 0 || ws.height === 0) {
            ws = drs;
        }

        this.windowAspectRatio = ws.width / ws.height;
        this.designAspectRatio = drs.width / drs.height;

        let finalW = 0;
        let finalH = 0;
        const landscape = this.windowAspectRatio > this.designAspectRatio;

        if (landscape) {
            finalH = drs.height;
            finalW = finalH * ws.width / ws.height;
        }
        else {
            finalW = drs.width;
            finalH = finalW * ws.height / ws.width;
        }

        const current = view.getDesignResolutionSize();
        if (Math.abs(current.width - finalW) < 0.5 && Math.abs(current.height - finalH) < 0.5) return;

        oops.log.logView(`${landscape ? '适配屏幕高度' : '适配屏幕宽度'} ${Math.round(finalW)}x${Math.round(finalH)}`, landscape ? '【横屏】' : '【竖屏】');
        view.setDesignResolutionSize(finalW, finalH, ResolutionPolicy.UNKNOWN);
    }

    /**
     * 自己盯着游戏框的实际尺寸，不只靠引擎的 `window-resize`。
     *
     * 引擎只在游戏框 style 宽高字符串变了时才通知（见 {@link settle}）。SubFrame 模式（编辑器 7456 预览）下
     * 游戏框的 style 是预览页定的、拖浏览器窗口时不会变，框的实际大小却跟着窗口变了，引擎一次都收不到：
     * 画布缓冲、渲染窗口一直是旧尺寸，画面被拉伸，点击换算整体错位，点哪儿都点不中。
     * `screen.windowSize` 读的就是游戏框的 client 尺寸，所以盯住它的尺寸变化、交给 {@link settle} 核对补上。
     */
    private watchGameFrame(): void {
        const frame = document.getElementById('GameDiv');
        const onChange = () => this.onScreenChange();
        if (frame && typeof ResizeObserver === 'function') {
            new ResizeObserver(onChange).observe(frame);
        }
        else {
            window.addEventListener('resize', onChange);
        }
    }

    /** 窗口尺寸变了（含进出全屏、转屏）：马上核对一次，再排一串延迟核对。 */
    private onScreenChange(): void {
        this.settle();
        this.settleTimers.forEach(t => clearTimeout(t));
        this.settleTimers = SETTLE_DELAYS.map(ms => setTimeout(() => this.settle(), ms));
    }

    /**
     * 核对引擎画布是否跟上了窗口的最终尺寸，没跟上就让引擎按最终尺寸再适配一次。
     *
     * 引擎只在「游戏框的 style 宽高字符串变了」时才发 `window-resize`（见引擎 web 版 screen-adapter 的
     * `_updateContainer`），而进出全屏的过程中尺寸会连着变好几次（退出全屏实测 599 → 764 → 780）。
     * 要是中途量到的那个尺寸成了最后一次适配，之后框的实际大小又变了、style 字符串却没变，
     * 引擎就再也不会收到通知：画布缓冲、渲染窗口停在中途尺寸，画面被拉伸或只画在画布的一角（比例不对），
     * 画出来的按钮和触摸换算对不上（点哪儿都不对）。这里就是补上那一次。
     *
     * 两样都要核：画布元素的缓冲尺寸（`game.canvas`）和引擎的渲染窗口（`director.root.mainWindow`），
     * 实测两种卡法都有 —— 只有渲染窗口没跟上时，画布元素本身的尺寸是对的。
     */
    private settle(): void {
        const ws = screen.windowSize;
        if (!(ws.width > 0 && ws.height > 0)) return;

        const canvas = game.canvas;
        const win = director.root?.mainWindow;
        const sizes: [string, number, number][] = [];
        if (canvas) sizes.push(['画布', canvas.width, canvas.height]);
        if (win) sizes.push(['渲染窗口', win.width, win.height]);
        const stale = sizes.find(([, w, h]) => Math.abs(w - ws.width) > 1 || Math.abs(h - ws.height) > 1);

        if (stale) {
            oops.log.logView(`${stale[0]} ${stale[1]}x${stale[2]} 没跟上窗口 ${Math.round(ws.width)}x${Math.round(ws.height)}，重新适配`, '【屏幕】');
            // 引擎收到 window-resize 时走的就是这个方法（resize 渲染窗口 + 重套适配策略 + 发 canvas-resize），
            // 它是私有的，拿不到时退回补发一次 DOM resize，让引擎自己再量一遍
            const adapt = (view as unknown as { _updateAdaptResult?: (w: number, h: number) => void })._updateAdaptResult;
            if (typeof adapt === 'function') adapt.call(view, ws.width, ws.height);
            else window.dispatchEvent(new Event('resize'));
        }
        this.fit();
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
