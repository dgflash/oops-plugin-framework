/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 * @LastEditTime: 2022-12-13 11:36:00
 */
import type { Asset, EventKeyboard, Node, Sprite, __private } from 'cc';
import { Component, _decorator } from 'cc';
import type { AudioEffect } from '../../core/common/audio/AudioEffect';
import type { IAudioParams } from '../../core/common/audio/IAudio';
import type { ListenerFunc, ListenerFuncTyped } from '../../core/common/event/EventMessage';
import { resAutoTracker } from '../../core/common/loader/ResAutoTracker';
import type { AssetType, CompleteCallback, Paths, ProgressCallback } from '../../core/common/loader/ResLoader';
import { resLoader } from '../../core/common/loader/ResLoader';
import { oops } from '../../core/Oops';
import type { GameAudioModule } from './view/GameAudioModule';
import type { GameButtonModule } from './view/GameButtonModule';
import type { GameEventModule } from './view/GameEventModule';
import type { GameKeyboardModule } from './view/GameKeyboardModule';
import type { GameNodeModule } from './view/GameNodeModule';
import type { GameResModule } from './view/GameResModule';
import { GameViewModuleRegistry, ViewModuleKey } from './view/GameViewModuleRegistry';

const { ccclass } = _decorator;

/**
 * 游戏显示对象组件模板
 *
 * 特性：
 * 1. 基于引擎 Asset.addRef/decRef + 递归依赖保护，与其它持有者共享时不误释放
 * 2. 组件销毁时自动 release 本产品登记的资源条目
 * 3. ResAutoTracker 全局调试视图（持有者 / 条目数）
 *
 * 使用示例：
 * ```typescript
 * const spriteFrame = await this.res.load('common', 'textures/avatar', SpriteFrame);
 * this.nodes.nodeTreeInfoLite();
 * this.event.on('MyEvent', this.onMyEvent, this);
 * this.event.setEvent('onGlobal');
 * this.button.setButton();
 * this.keyboard.setKeyboard(true, { onKeyDown: (e) => {} });
 * this.event.setGameShow(() => {});
 *
 * GameComponent.printGlobalResStatus();
 * GameComponent.setResDebugMode(true);
 * ```
 */
@ccclass('GameComponent')
export class GameComponent extends Component {
    private _viewRegistry: GameViewModuleRegistry | null = null;

    private get viewRegistry(): GameViewModuleRegistry {
        return (this._viewRegistry ??= new GameViewModuleRegistry(this));
    }

    /** 获取事件模块 */
    get event(): GameEventModule {
        return this.viewRegistry.get(ViewModuleKey.Event);
    }

    /** 获取节点模块 */
    get nodes(): GameNodeModule {
        return this.viewRegistry.get(ViewModuleKey.Nodes);
    }

    /** 获取资源模块 */
    get res(): GameResModule {
        return this.viewRegistry.get(ViewModuleKey.Res);
    }

    /** 获取音频模块 */
    get audio(): GameAudioModule {
        return this.viewRegistry.get(ViewModuleKey.Audio);
    }

    /** 获取按钮模块 */
    get button(): GameButtonModule {
        return this.viewRegistry.get(ViewModuleKey.Button);
    }

    /** 获取键盘模块 */
    get keyboard(): GameKeyboardModule {
        return this.viewRegistry.get(ViewModuleKey.Keyboard);
    }

    /** 移除当前节点 */
    remove() {
        oops.gui.removeByNode(this.node);
    }

    /** 组件销毁时调用 */
    protected onDestroy() {
        this._viewRegistry?.destroy();
    }

    /** 打印全局资源状态 */
    static printGlobalResStatus() {
        resAutoTracker.printStatus();
    }

    /** 设置资源调试模式 */
    static setResDebugMode(enabled: boolean) {
        resAutoTracker.enableDebug(enabled);
    }

    //#region ========== 兼容旧版本 API ==========

    //#region 全局事件管理（兼容旧版本）
    /** @deprecated 请使用 this.event.watch() */
    watch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.watch(event, listener, object);
    }

    /** @deprecated 请使用 this.event.watchOnce() */
    watchOnce<K extends keyof OopsFramework.TypedEventMap>(event: K, listener: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object: any): void {
        this.event.watchOnce(event, listener, object);
    }

    /** @deprecated 请使用 this.event.unwatch() */
    unwatch<K extends keyof OopsFramework.TypedEventMap>(event: K, listener?: ListenerFuncTyped<K, OopsFramework.TypedEventMap[K]>, object?: any): void {
        this.event.unwatch(event, listener, object);
    }

    /** @deprecated 请使用 this.event.emit() */
    emit<K extends keyof OopsFramework.TypedEventMap>(event: K, data?: OopsFramework.TypedEventMap[K]): void {
        this.event.emit(event, data);
    }

    /** @deprecated 请使用 this.event.emitAsync() */
    emitAsync<K extends keyof OopsFramework.TypedEventMap>(event: K, data: OopsFramework.TypedEventMap[K]): Promise<void> {
        return this.event.emitAsync(event, data);
    }

    /** @deprecated 请使用 this.event.on() */
    on(event: string, listener: ListenerFunc, object: any): void {
        this.event.on(event, listener, object);
    }

    /** @deprecated 请使用 this.event.once() */
    once(event: string, listener: ListenerFunc, object: any): void {
        this.event.once(event, listener, object);
    }

    /** @deprecated 请使用 this.event.off() */
    off(event: string, listener?: ListenerFunc, object?: object): void {
        this.event.off(event, listener, object);
    }

    /** @deprecated 请使用 this.event.dispatchEvent() */
    dispatchEvent(event: string, ...args: any[]): void {
        this.event.dispatchEvent(event, ...args);
    }

    /** @deprecated 请使用 this.event.dispatchEventAsync() */
    dispatchEventAsync(event: string, ...args: any[]): Promise<void> {
        return this.event.dispatchEventAsync(event, ...args);
    }
    //#endregion

    //#region 预制节点管理（兼容旧版本）
    /** @deprecated 请使用 this.nodes.getNode() */
    getNode(name: string): Node | undefined {
        return this.nodes.getNode(name);
    }

    /** @deprecated 请使用 this.nodes.nodeTreeInfoLite() */
    nodeTreeInfoLite(): void {
        this.nodes.nodeTreeInfoLite();
    }

    /** @deprecated 请使用 this.nodes.createPrefabNode() */
    async createPrefabNode(path: string, bundleName: string = oops.res.defaultBundleName): Promise<Node | null> {
        return this.nodes.createPrefabNode(path, bundleName);
    }
    //#endregion

    //#region 资源加载管理（兼容旧版本）
    /** @deprecated 请使用 this.res.getRes() */
    getRes<T extends Asset>(path: string, type?: __private.__types_globals__Constructor<T> | null, bundleName?: string): T | null {
        return this.res.getRes(path, type, bundleName);
    }

    /** @deprecated 请使用 this.res.load() */
    async load<T extends Asset>(bundleName: string, paths: Paths | AssetType<T>, type?: AssetType<T>): Promise<T> {
        return this.res.load(bundleName, paths, type);
    }

    /** @deprecated 请使用 this.res.loadAny() */
    loadAny(bundleName: string | string[], paths: string[] | ProgressCallback, onProgress?: ProgressCallback | CompleteCallback, onComplete?: CompleteCallback): void {
        this.res.loadAny(bundleName, paths, onProgress, onComplete);
    }

    /** @deprecated 请使用 this.res.loadDir() */
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
        this.res.loadDir(bundleName, dir, type, onProgress, onComplete);
    }

    /** @deprecated 请使用 this.res.setSprite() */
    async setSprite(target: Sprite, path: string, bundle: string = resLoader.defaultBundleName): Promise<boolean> {
        return this.res.setSprite(target, path, bundle);
    }
    //#endregion

    //#region 音频播放管理（兼容旧版本）
    /** @deprecated 请使用 this.audio.playMusic() */
    playMusic(url: string, params?: IAudioParams): void {
        this.audio.playMusic(url, params);
    }

    /** @deprecated 请使用 this.audio.playEffect() */
    playEffect(url: string, params?: IAudioParams): Promise<AudioEffect | null> {
        return this.audio.playEffect(url, params);
    }
    //#endregion

    //#region 游戏逻辑事件（兼容旧版本）
    /** @deprecated 请使用 this.button.setButton() */
    protected setButton(bindRootEvent = true): void {
        this.button.setButton(bindRootEvent);
    }

    /** @deprecated 请使用 this.event.setEvent() */
    protected setEvent(...args: string[]): void {
        this.event.setEvent(...args);
    }

    /** @deprecated 请使用 this.keyboard.setKeyboard() */
    setKeyboard(on: boolean): void {
        if (on) {
            this.keyboard.setKeyboard(true, {
                onKeyDown: this.onKeyDown.bind(this),
                onKeyUp: this.onKeyUp.bind(this),
                onKeyPressing: this.onKeyPressing.bind(this)
            });
        }
        else {
            this.keyboard.setKeyboard(false);
        }
    }

    /** @deprecated 请使用 this.keyboard.setKeyboard() 传入 callbacks */
    protected onKeyDown(event: EventKeyboard): void { }

    /** @deprecated 请使用 this.keyboard.setKeyboard() 传入 callbacks */
    protected onKeyUp(event: EventKeyboard): void { }

    /** @deprecated 请使用 this.keyboard.setKeyboard() 传入 callbacks */
    protected onKeyPressing(event: EventKeyboard): void { }

    /** @deprecated 请使用 this.event.setGameShow() */
    protected setGameShow(): void {
        this.event.setGameShow(this.onGameShow.bind(this));
    }

    /** @deprecated 请使用 this.event.setGameHide() */
    protected setGameHide(): void {
        this.event.setGameHide(this.onGameHide.bind(this));
    }

    /** @deprecated 请使用 this.event.setGameResize() */
    protected setGameResize(): void {
        this.event.setGameResize(this.onGameResize.bind(this));
    }

    /** @deprecated 请使用 this.event.setGameFullScreen() */
    protected setGameFullScreen(): void {
        this.event.setGameFullScreen(this.onGameFullScreen.bind(this));
    }

    /** @deprecated 请使用 this.event.setGameOrientation() */
    protected setGameOrientation(): void {
        this.event.setGameOrientation(this.onGameOrientation.bind(this));
    }

    /** @deprecated 请配合 setGameShow() 使用 */
    protected onGameShow(): void { }

    /** @deprecated 请配合 setGameHide() 使用 */
    protected onGameHide(): void { }

    /** @deprecated 请配合 setGameResize() 使用 */
    protected onGameResize(): void { }

    /** @deprecated 请配合 setGameFullScreen() 使用 */
    protected onGameFullScreen(): void { }

    /** @deprecated 请配合 setGameOrientation() 使用 */
    protected onGameOrientation(): void { }
    //#endregion

    //#endregion
}