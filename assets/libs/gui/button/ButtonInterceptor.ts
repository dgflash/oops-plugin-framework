import { AudioClip, Button, Component, EventHandler, Node } from 'cc';
import { oops } from 'db://oops-framework/core/Oops';
import ButtonSimple from './ButtonSimple';

/**
 * 按钮音效配置
 */
export interface IButtonSoundConfig {
    /** 按钮类构造函数，作为唯一标识 */
    class: typeof Component;
    /** 音效资源 */
    clip: AudioClip;
}

/**
 * 按钮点击事件劫持器
 * 用于拦截所有按钮点击事件，根据按钮类型播放不同音效
 */
export class ButtonInterceptor {
    private _isActive = false;
    /** 按钮类型配置映射，key 为组件类 */
    private _buttonConfigs: Map<typeof Component, IButtonSoundConfig> = new Map();
    /** 保存 EventHandler 原始 emitEvents 方法 */
    private _originalEmitEvents: Function | null = null;

    private static _instance: ButtonInterceptor | null = null;
    /** 获取单例实例 */
    static get instance(): ButtonInterceptor {
        if (!this._instance) {
            this._instance = new ButtonInterceptor();
        }
        return this._instance;
    }

    /** 是否已激活 */
    get isActive(): boolean {
        return this._isActive;
    }

    /** ButtonSimple 原始 onClick 方法映射 */
    private _originalOnClickMap: Map<ButtonSimple, Function> = new Map();

    /**
     * 注册按钮音效配置
     * @param config 按钮音效配置
     */
    registerSound(config: IButtonSoundConfig): void {
        this._buttonConfigs.set(config.class, config);
    }

    /**
     * 激活劫持器
     * 开始拦截所有按钮点击事件
     */
    activate(): void {
        if (this._isActive) return;
        this._isActive = true;

        // 劫持 EventHandler 的 emitEvents 方法
        this.hijackEmitEvents();

        // 劫持 ButtonSimple 的 onClick 方法
        this.hijackButtonSimple();
    }

    /**
     * 停用劫持器
     * 恢复所有按钮的原始点击事件
     */
    deactivate(): void {
        if (!this._isActive) return;
        this._isActive = false;

        // 恢复 EventHandler 原始方法
        if (this._originalEmitEvents) {
            // @ts-ignore
            EventHandler.emitEvents = this._originalEmitEvents;
            this._originalEmitEvents = null;
        }

        // 恢复所有 ButtonSimple 的原始 onClick 方法
        this.restoreButtonSimple();
    }

    /**
     * 劫持 ButtonSimple 的 onClick 方法
     * 在触发点击时播放音效
     */
    private hijackButtonSimple(): void {
        const self = this;
        // @ts-ignore
        const originalOnClick = ButtonSimple.prototype.onClick;

        // 保存原始方法
        // @ts-ignore
        ButtonSimple.prototype._originalOnClick = originalOnClick;

        // 重写 onClick 方法
        // @ts-ignore
        ButtonSimple.prototype.onClick = function (this: ButtonSimple) {
            // 保存当前实例的原始方法引用
            if (!self._originalOnClickMap.has(this)) {
                self._originalOnClickMap.set(this, originalOnClick);
            }

            // 播放音效
            const config = self.getButtonConfig(this.node);
            if (config) {
                self.playButtonSound(config);
            }

            // 调用原始方法
            return originalOnClick.apply(this);
        };
    }

    /**
     * 恢复 ButtonSimple 的原始 onClick 方法
     */
    private restoreButtonSimple(): void {
        // @ts-ignore
        if (ButtonSimple.prototype._originalOnClick) {
            // @ts-ignore
            ButtonSimple.prototype.onClick = ButtonSimple.prototype._originalOnClick;
            // @ts-ignore
            ButtonSimple.prototype._originalOnClick = null;
        }
        this._originalOnClickMap.clear();
    }

    /**
     * 劫持 EventHandler 的 emitEvents 方法
     * 在触发点击事件时播放音效
     */
    private hijackEmitEvents(): void {
        const self = this;

        // 保存原始方法
        // @ts-ignore
        this._originalEmitEvents = EventHandler.emitEvents;

        EventHandler.emitEvents = function (...args: any[]) {
            // 调用原始方法
            const result = self._originalEmitEvents!.apply(this, args);

            // 检查是否是 touch-end 事件
            const event = args?.[1];
            if (event?.type === 'touch-end') {
                // 获取按钮节点
                const target = event?.currentTarget as Node;
                if (target) {
                    const config = self.getButtonConfig(target);
                    if (config) {
                        self.playButtonSound(config);
                    }
                }
            }

            return result;
        };
    }

    /**
     * 通过节点获取按钮配置
     * @param node 节点
     * @returns 按钮音效配置，未找到返回 null
     */
    private getButtonConfig(node: Node): IButtonSoundConfig | null {
        // 遍历所有注册的配置，检查节点上是否有对应的组件
        for (const [classType, config] of this._buttonConfigs) {
            if (node.getComponent(classType)) {
                return config;
            }
        }
        return null;
    }

    /**
     * 播放按钮音效
     * @param config 按钮音效配置
     */
    private playButtonSound(config: IButtonSoundConfig): void {
        if (typeof oops !== 'undefined' && oops.audio) {
            oops.audio.playEffect(config.clip);
        }
    }
}
