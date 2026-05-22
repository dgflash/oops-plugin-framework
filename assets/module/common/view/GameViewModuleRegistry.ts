/*
 * @Author: dgflash
 * @Date: 2022-04-14 17:08:01
 * @LastEditors: dgflash
 */
import type { GameComponent } from '../GameComponent';
import { GameAudioModule } from './GameAudioModule';
import { GameButtonModule } from './GameButtonModule';
import { GameEventModule } from './GameEventModule';
import { GameKeyboardModule } from './GameKeyboardModule';
import { GameNodeModule } from './GameNodeModule';
import { GameResModule } from './GameResModule';
import type { GameViewModule } from './GameViewModuleBase';

export { GameViewModule } from './GameViewModuleBase';

/**
 * view 子模块注册键
 * @remarks 枚举顺序即销毁顺序（先输入/音频/资源，最后事件）
 */
export enum ViewModuleKey {
    /** 按钮 */
    Button = 'button',
    /** 键盘 */
    Keyboard = 'keyboard',
    /** 音频 */
    Audio = 'audio',
    /** 资源 */
    Res = 'res',
    /** 节点树 */
    Nodes = 'nodes',
    /** 全局事件 */
    Event = 'event',
}

/** view 子模块懒加载注册表（统一登记、按序批量销毁） */
export class GameViewModuleRegistry {
    private readonly instances = new Map<ViewModuleKey, GameViewModule>();

    /** 构造函数
     * @param comp 游戏组件
     */
    constructor(private readonly comp: GameComponent) {}

    /** 获取模块实例
     * @param key 模块键
     * @returns 模块实例
     */
    get<T extends GameViewModule = GameViewModule>(key: ViewModuleKey): T {
        let module = this.instances.get(key) as T | undefined;
        if (!module) {
            module = this.createViewModule(key) as T;
            this.instances.set(key, module);
        }
        return module;
    }

    /** 销毁所有模块 */
    destroy(): void {
        for (const key of Object.values(ViewModuleKey)) {
            this.instances.get(key)?.destroy();
        }
        this.instances.clear();
    }

    /** 创建视图模块
     * @param key 模块键
     * @returns 模块实例
     */
    private createViewModule(key: ViewModuleKey): GameViewModule {
        switch (key) {
            case ViewModuleKey.Event:
                return new GameEventModule(this.comp);
            case ViewModuleKey.Nodes:
                return new GameNodeModule(this.comp);
            case ViewModuleKey.Res:
                return new GameResModule(this.comp);
            case ViewModuleKey.Audio:
                return new GameAudioModule(this.comp);
            case ViewModuleKey.Button:
                return new GameButtonModule(this.comp);
            case ViewModuleKey.Keyboard:
                return new GameKeyboardModule(this.comp);
            default: {
                const _exhaustive: never = key;
                return _exhaustive;
            }
        }
    }
}