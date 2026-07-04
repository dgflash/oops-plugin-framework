import type { Node } from 'cc';
import { Component, _decorator } from 'cc';
import type { ListenerFunc, ListenerFuncTyped } from '../../core/common/event/EventMessage';
import { oops } from '../../core/Oops';
import type { GamePartAudio } from './part/GamePartAudio';
import type { GamePartButton } from './part/GamePartButton';
import type { GamePartNodePool } from './part/GamePartNodePool';
import type { GamePartEvent } from './part/GamePartEvent';
import type { GamePartKeyboard } from './part/GamePartKeyboard';
import type { GamePartNode } from './part/GamePartNode';
import type { GamePartRes } from './part/GamePartRes';
import { createPart, GamePartRegistry, GamePartKey } from './GamePartRegistry';

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
    private _parts: GamePartRegistry | null = null;

    private get parts(): GamePartRegistry {
        return (this._parts ??= createPart(this));
    }

    /** 获取事件模块 */
    get event(): GamePartEvent {
        return this.parts.get(GamePartKey.Event);
    }

    /** 获取节点模块 */
    get nodes(): GamePartNode {
        return this.parts.get(GamePartKey.Nodes);
    }

    /** 获取资源模块 */
    get res(): GamePartRes {
        return this.parts.get(GamePartKey.Res);
    }

    /** 获取音频模块 */
    get audio(): GamePartAudio {
        return this.parts.get(GamePartKey.Audio);
    }

    /** 获取按钮模块 */
    get button(): GamePartButton {
        return this.parts.get(GamePartKey.Button);
    }

    /** 获取键盘模块 */
    get keyboard(): GamePartKeyboard {
        return this.parts.get(GamePartKey.Keyboard);
    }

    /** 游戏节点池模块 */
    get pool(): GamePartNodePool {
        return this.parts.get(GamePartKey.Pool);
    }

    /** 移除当前节点 */
    remove() {
        oops.gui.removeByNode(this.node);
    }

    /** 组件销毁时调用 */
    protected onDestroy() {
        this._parts?.destroy();
    }

    //#region ========== 兼容旧版本 API 如果是新项目可以把注释包起来的代码都删除 ==========

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
        return this.nodes.get(name);
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
}
