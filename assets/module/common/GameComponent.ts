/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 * @LastEditTime: 2022-12-13 11:36:00
 */
import type { Asset, EventKeyboard, EventTouch, Sprite, __private } from 'cc';
import { Button, Component, EventHandler, Input, Node, Prefab, SpriteFrame, _decorator, input, instantiate, isValid } from 'cc';
import { oops } from '../../core/Oops';
import type { AudioEffect } from '../../core/common/audio/AudioEffect';
import type { IAudioParams } from '../../core/common/audio/IAudio';
import { EventDispatcher } from '../../core/common/event/EventDispatcher';
import type { ListenerFunc, ListenerFuncTyped } from '../../core/common/event/EventMessage';
import { EventMessage } from '../../core/common/event/EventMessage';
import type { AssetType, CompleteCallback, Paths, ProgressCallback } from '../../core/common/loader/ResLoader';
import { resLoader } from '../../core/common/loader/ResLoader';
import { ViewUtil } from '../../core/utils/ViewUtil';
import { resRef } from '../../core/common/loader/ResRefManager';

const { ccclass } = _decorator;

/**
 * 游戏显示对象组件模板
 *
 * 特性：
 * 1. 自动管理资源引用计数 - 多组件共享资源时不会错误释放
 * 2. 组件销毁时自动释放资源引用 - 开发者无需手动管理
 * 3. 全局资源追踪 - 可查看任意资源的引用者和引用计数
 *
 * 使用示例：
 * ```typescript
 * // 加载资源（自动注册引用）
 * const spriteFrame = await this.load('textures/avatar', SpriteFrame);
 *
 * // 组件销毁时自动释放引用（无需手动调用）
 * // 只有当所有引用者都销毁时，资源才会被真正释放
 *
 * // 调试：查看资源引用情况
 * GameComponent.printGlobalResStatus();
 * GameComponent.setResDebugMode(true); // 开启详细日志
 * ```
 */
@ccclass('GameComponent')
export class GameComponent extends Component {
    //#region 全局事件管理
    private _event: EventDispatcher | null = null;
    /** 全局事件管理器 */
    private get event(): EventDispatcher {
        if (this._event == null) this._event = new EventDispatcher();
        return this._event;
    }

    /** 标记是否已注册键盘事件 */
    private _keyboardEnabled = false;
    /** 标记是否已注册按钮事件 */
    private _buttonEnabled = false;

    //#region 强类型事件方法（提供给 Agent 自动生成用）

    /**
     * 注册全局事件（强类型）
     * @param event       事件名（枚举）
     * @param listener    处理事件的侦听器函数
     * @param object      侦听函数绑定的this对象
     */
    watch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.on(event as string, listener as ListenerFunc, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除（强类型）
     * @param event     事件名（枚举）
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的this对象
     */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.once(event as string, listener as ListenerFunc, object);
    }

    /**
     * 移除全局事件（强类型）
     * @param event      事件名（枚举）
     * @param listener   处理事件的侦听器函数（可选）
     * @param object     侦听函数绑定的this对象（可选）
     */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object?: any): void {
        this.event.off(event as string, listener as ListenerFunc, object);
    }

    /**
     * 触发强类型全局事件
     * @param event      事件名（枚举）
     * @param data       事件数据
     */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data?: OopsFramework.TypedEventMap[K]): void {
        this.event.emit(event, data);
    }

    /**
     * 触发强类型异步全局事件（严格类型检查）
     * @param event      事件名（枚举）
     * @param data       事件数据（必须完全匹配类型定义）
     */
    emitAsync<K extends keyof OopsFramework.TypedEventMap>(event: K, data: OopsFramework.TypedEventMap[K]): Promise<void> {
        return this.event.emitAsync(event, data);
    }

    //#endregion

    //#region 弱类型事件方法
    /**
     * 注册全局事件
     * @param event       事件名
     * @param listener    处理事件的侦听器函数
     * @param object      侦听函数绑定的this对象
     */
    on(event: string, listener: ListenerFunc, object: any): void {
        this.event.on(event, listener, object);
    }

    /**
     * 监听一次事件，事件响应后，该监听自动移除
     * @param event     事件名
     * @param listener  事件触发回调方法
     * @param object    侦听函数绑定的this对象
     */
    once(event: string, listener: ListenerFunc, object: any): void {
        this.event.once(event, listener, object);
    }

    /**
     * 移除全局事件
     * @param event      事件名
     * @param listener   处理事件的侦听器函数（可选）
     * @param object     侦听函数绑定的this对象（可选）
     */
    off(event: string, listener?: ListenerFunc, object?: object): void {
        this.event.off(event, listener, object);
    }

    /**
     * 触发全局事件
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEvent(event: string, ...args: any[]): void {
        this.event.dispatchEvent(event, ...args);
    }

    /**
     * 触发全局事件,支持同步与异步处理
     * @param event      事件名
     * @param args       事件参数
     */
    dispatchEventAsync(event: string, ...args: any[]): Promise<void> {
        return this.event.dispatchEventAsync(event, ...args);
    }
    //#endregion

    //#endregion

    //#region 预制节点管理

    /** 摊平的节点集合（所有节点不能重名） */
    nodes: Map<string, Node> = null!;

    /** 通过节点名获取预制上的节点，整个预制不能有重名节点 */
    getNode(name: string): Node | undefined {
        if (this.nodes) {
            return this.nodes.get(name);
        }
        return undefined;
    }

    /** 平摊所有节点存到Map<string, Node>中通过get(name: string)方法获取 */
    nodeTreeInfoLite() {
        this.nodes = new Map();
        ViewUtil.nodeTreeInfoLite(this.node, this.nodes);
    }

    /**
     * 从资源缓存中找到预制资源名并创建一个显示对象
     * @param path 资源路径
     * @param bundleName 资源包名
     * @returns 预制节点，加载失败返回 null
     */
    async createPrefabNode(path: string, bundleName: string = oops.res.defaultBundleName): Promise<Node | null> {
        const prefab = await this.load(bundleName, path, Prefab);
        if (!prefab) {
            console.warn('[OopsFramework]', `预制体加载失败: ${path}`);
            return null;
        }
        return instantiate(prefab);
    }
    //#endregion

    //#region 资源加载管理
    /**
     * 获取资源
     * @param path          资源路径
     * @param type          资源类型
     * @param bundleName    远程资源包名
     */
    getRes<T extends Asset>(path: string, type?: __private.__types_globals__Constructor<T> | null, bundleName?: string): T | null {
        return oops.res.get(path, type, bundleName);
    }

    /**
     * 加载一个资源（自动管理引用计数）
     * @param bundleName    远程包名
     * @param paths         资源路径
     * @param type          资源类型
     * @param onProgress    加载进度回调
     * @remarks
     * - 资源引用会自动注册到全局管理器
     * - 组件销毁时会自动减少引用计数
     * - 只有引用计数为0时才会真正释放资源
     */
    async load<T extends Asset>(bundleName: string, paths: Paths | AssetType<T>, type?: AssetType<T>): Promise<T> {
        let realBundle: string;
        let realPath: string;

        if (typeof paths === 'string') {
            realBundle = bundleName;
            realPath = paths;
        }
        else {
            realBundle = oops.res.defaultBundleName;
            realPath = bundleName;
        }

        resRef.addRef(realBundle, realPath, this);

        try {
            const result = await oops.res.load(bundleName, paths, type);
            if (!result) {
                resRef.removeRef(realBundle, realPath, this);
            }
            return result;
        }
        catch (error) {
            resRef.removeRef(realBundle, realPath, this);
            throw error;
        }
    }

    /**
     * 加载指定资源包中的多个任意类型资源（回调模式）
     * @param bundleName    远程包名或资源路径数组
     * @param paths         资源路径数组或进度回调
     * @param onProgress    加载进度回调
     * @param onComplete    加载完成回调
     */
    loadAny(bundleName: string | string[], paths: string[] | ProgressCallback, onProgress?: ProgressCallback | CompleteCallback, onComplete?: CompleteCallback): void {
        const originalComplete = onComplete as ((err: Error | null, data: Asset[]) => void) | undefined;
        const pathsToTrack: { bundle: string; path: string }[] = [];

        if (typeof bundleName === 'string' && Array.isArray(paths)) {
            paths.forEach(p => {
                resRef.addRef(bundleName, p, this);
                pathsToTrack.push({ bundle: bundleName, path: p });
            });
        }
        else if (Array.isArray(bundleName)) {
            bundleName.forEach(p => {
                resRef.addRef(resLoader.defaultBundleName, p, this);
                pathsToTrack.push({ bundle: resLoader.defaultBundleName, path: p });
            });
        }
        else if (typeof bundleName === 'string' && typeof paths === 'function') {
            resRef.addRef(resLoader.defaultBundleName, bundleName, this);
            pathsToTrack.push({ bundle: resLoader.defaultBundleName, path: bundleName });
        }

        const wrappedComplete = (err: Error | null, data: Asset[]) => {
            if (err || !data) {
                pathsToTrack.forEach(({ bundle, path }) => {
                    resRef.removeRef(bundle, path, this);
                });
            }
            originalComplete?.(err, data);
        };

        oops.res.loadAny(bundleName, paths, onProgress, wrappedComplete);
    }

    /**
     * 加载文件夹中的资源（回调模式）
     * @param bundleName    远程包名
     * @param dir           文件夹名
     * @param type          资源类型
     * @param onProgress    加载进度回调
     * @param onComplete    加载完成回调
     */
    loadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(bundleName: string, dir: string, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(bundleName: string, dir: string, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(bundleName: string, dir: string, type: AssetType<T>, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, type: AssetType<T>, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, onProgress: ProgressCallback, onComplete: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(dir: string, type: AssetType<T>, onComplete?: CompleteCallback): void;
    loadDir<T extends Asset>(
        bundleName: string,
        dir?: string | AssetType<T> | ProgressCallback | CompleteCallback,
        type?: AssetType<T> | ProgressCallback | CompleteCallback,
        onProgress?: ProgressCallback | CompleteCallback,
        onComplete?: CompleteCallback,
    ): void {
        let realDir: string;
        let realBundle: string;
        if (typeof dir === 'string') {
            realDir = dir;
            realBundle = bundleName;
        }
        else {
            realDir = bundleName;
            realBundle = oops.res.defaultBundleName;
        }

        resRef.addRef(realBundle, realDir, this);

        const originalComplete = onComplete as ((err: Error | null, data: T[]) => void) | undefined;
        const wrappedComplete = (err: Error | null, data: T[]) => {
            if (err || !data) {
                resRef.removeRef(realBundle, realDir, this);
            }
            originalComplete?.(err, data);
        };

        oops.res.loadDir(bundleName, dir, type, onProgress, wrappedComplete);
    }

    /**
     * 手动释放指定资源引用
     * @param path          资源路径
     * @param bundleName    资源包名
     * @remarks
     * - 只减少当前组件对该资源的引用计数
     * - 只有引用计数为0时才会真正释放资源
     * - 其他组件的引用不受影响
     */
    releaseRes(path: string, bundleName: string = resLoader.defaultBundleName) {
        resRef.removeRef(bundleName, path, this);
    }

    /**
     * 释放当前组件所有资源引用
     * @remarks
     * - 自动减少所有资源的引用计数
     * - 只有引用计数为0的资源才会被真正释放
     * - 共享资源不会被错误释放
     */
    release() {
        const released = resRef.releaseAllByComponent(this);
        if (released.length > 0) {
            console.log(`[GameComponent] ${this.node?.name} 释放了 ${released.length} 个资源:`, released);
        }
    }

    /**
     * 释放所有文件夹资源引用
     * @deprecated 文件夹资源现在也通过全局引用计数管理，直接调用 release() 即可
     */
    releaseDir() {
        console.warn('[GameComponent] releaseDir() 已废弃，请直接使用 release()');
    }

    /**
     * 获取资源的全局引用计数
     * @param path          资源路径
     * @param bundleName    资源包名
     * @returns 全局引用计数
     */
    getResRefCount(path: string, bundleName: string = resLoader.defaultBundleName): number {
        return resRef.getRefCount(bundleName, path);
    }

    /**
     * 获取资源的所有引用者
     * @param path          资源路径
     * @param bundleName    资源包名
     * @returns 引用者列表
     */
    getResReferrers(path: string, bundleName: string = resLoader.defaultBundleName): string[] {
        return resRef.getReferrers(bundleName, path);
    }

    /**
     * 打印当前组件的资源引用情况
     */
    printResUsage() {
        resRef.printComponentStatus(this);
    }

    /**
     * 打印全局资源引用状态（调试用）
     */
    static printGlobalResStatus() {
        resRef.printStatus();
    }

    /**
     * 开启/关闭全局资源调试模式
     * @param enabled 是否开启
     */
    static setResDebugMode(enabled: boolean) {
        resRef.enableDebug(enabled);
    }

    /**
     * 设置图片资源
     * @param target  目标精灵对象
     * @param path    图片资源地址
     * @param bundle  资源包名
     * @returns 是否设置成功
     * @remarks 资源引用计数由 load 方法自动管理，加载失败时会自动回滚
     */
    async setSprite(target: Sprite, path: string, bundle: string = resLoader.defaultBundleName): Promise<boolean> {
        const spriteFrame = await this.load(bundle, path, SpriteFrame);
        if (!spriteFrame) {
            return false;
        }
        if (!isValid(target)) {
            this.releaseRes(path, bundle);
            return false;
        }
        target.spriteFrame = spriteFrame;
        return true;
    }
    //#endregion

    //#region 音频播放管理
    /**
     * 播放背景音乐（不受自动释放资源管理）
     * @param url           资源地址
     * @param params        背景音乐资源播放参数
     */
    playMusic(url: string, params?: IAudioParams) {
        oops.audio.music.loadAndPlay(url, params);
    }

    /**
     * 播放音效
     * @param url           资源地址
     * @param params        音效播放参数
     * @returns 音效实例，播放失败返回 null
     * @remarks 注意：音效资源由 AudioEffectPool 自动管理，不需要在此组件中记录
     */
    playEffect(url: string, params?: IAudioParams): Promise<AudioEffect | null> {
        return new Promise((resolve) => {
            if (params == null) {
                params = { bundle: resLoader.defaultBundleName };
            }
            else if (params.bundle == null) {
                params.bundle = resLoader.defaultBundleName;
            }

            oops.audio.playEffect(url, params).then((ae) => {
                resolve(ae ?? null);
            });
        });
    }
    //#endregion

    //#region 游戏逻辑事件
    /**
     * 批量设置当前界面按钮事件
     * @param bindRootEvent  是否对预制根节点绑定触摸事件
     * @example
     * 注：按钮节点Label1、Label2必须绑定UIButton等类型的按钮组件才会生效，方法名必须与节点名一致
     * this.setButton();
     *
     * Label1(event: EventTouch) { console.log(event.target.name); }
     * Label2(event: EventTouch) { console.log(event.target.name); }
     */
    protected setButton(bindRootEvent = true) {
        this._buttonEnabled = true;

        // 自定义按钮批量绑定触摸事件
        if (bindRootEvent) {
            this.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                const self: any = this;
                const func = self[event.target.name];
                if (func) {
                    func.call(this, event);
                }
                // 不触发界面根节点触摸事件、不触发长按钮组件的触摸事件
                // else if (event.target != this.node && event.target.getComponent(ButtonTouchLong) == null) {
                //     console.warn(`名为【${event.target.name}】的按钮事件方法不存在`);
                // }
            }, this);
        }

        // Cocos Creator Button组件批量绑定触摸事件（使用UIButton支持放连点功能）
        const regex = /<([^>]+)>/;
        const match = this.name.match(regex);
        if (!match || !match[1]) {
            console.warn('[OopsFramework]', `组件名 "${this.name}" 不符合 "<组件名>" 格式，跳过按钮事件绑定`);
            return;
        }
        const componentName = match[1];
        const buttons = this.node.getComponentsInChildren<Button>(Button);
        buttons.forEach((b: Button) => {
            const node = b.node;
            const self: any = this;
            const func = self[node.name];
            if (func) {
                const event = new EventHandler();
                event.target = this.node;
                event.handler = b.node.name;
                event.component = componentName;
                b.clickEvents.push(event);
            }
            // else {
            //     console.warn(`名为【${node.name}】的按钮事件方法不存在`);
            // }
        });
    }

    /**
     * 批量设置全局事件
     * @example
     *  this.setEvent("onGlobal");
     *  this.dispatchEvent("onGlobal", "全局事件");
     *
     *  onGlobal(event: string, args: any) { console.log(args) };
     */
    protected setEvent(...args: string[]) {
        const self: any = this;
        for (const name of args) {
            const func = self[name];
            if (func)
                this.on(name, func, this);
            else
                console.error(`名为【${name}】的全局事方法不存在`);
        }
    }

    /**
     * 键盘事件开关
     * @param on 打开键盘事件为true
     */
    setKeyboard(on: boolean) {
        if (on) {
            this._keyboardEnabled = true;
            input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
            input.on(Input.EventType.KEY_PRESSING, this.onKeyPressing, this);
        }
        else {
            this._keyboardEnabled = false;
            input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
            input.off(Input.EventType.KEY_PRESSING, this.onKeyPressing, this);
        }
    }

    /** 键按下 */
    protected onKeyDown(event: EventKeyboard) { }

    /** 键放开 */
    protected onKeyUp(event: EventKeyboard) { }

    /** 键长按 */
    protected onKeyPressing(event: EventKeyboard) { }

    /** 监听游戏从后台进入事件 */
    protected setGameShow() {
        this.on(EventMessage.GAME_SHOW, this.onGameShow, this);
    }

    /** 监听游戏切到后台事件 */
    protected setGameHide() {
        this.on(EventMessage.GAME_HIDE, this.onGameHide, this);
    }

    /** 监听游戏画笔尺寸变化事件 */
    protected setGameResize() {
        this.on(EventMessage.GAME_RESIZE, this.onGameResize, this);
    }

    /** 监听游戏全屏事件 */
    protected setGameFullScreen() {
        this.on(EventMessage.GAME_FULL_SCREEN, this.onGameFullScreen, this);
    }

    /** 监听游戏旋转屏幕事件 */
    protected setGameOrientation() {
        this.on(EventMessage.GAME_ORIENTATION, this.onGameOrientation, this);
    }

    /** 游戏从后台进入事件回调 */
    protected onGameShow(): void { }

    /** 游戏切到后台事件回调 */
    protected onGameHide(): void { }

    /** 游戏画笔尺寸变化事件回调 */
    protected onGameResize(): void { }

    /** 游戏全屏事件回调 */
    protected onGameFullScreen(): void { }

    /** 游戏旋转屏幕事件回调 */
    protected onGameOrientation(): void { }
    //#endregion

    /** 移除自己 */
    remove() {
        oops.gui.removeByNode(this.node);
    }

    protected onDestroy() {
        if (this._keyboardEnabled) {
            input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
            input.off(Input.EventType.KEY_PRESSING, this.onKeyPressing, this);
            this._keyboardEnabled = false;
        }

        if (this._buttonEnabled) {
            this.node.off(Node.EventType.TOUCH_END);
            this._buttonEnabled = false;
        }

        if (this._event) {
            this._event.clear();
            this._event = null;
        }

        if (this.nodes) {
            this.nodes.clear();
            this.nodes = null!;
        }

        this.release();
    }
}
