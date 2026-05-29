import { GamePartAudio } from './part/GamePartAudio';
import { GamePartButton } from './part/GamePartButton';
import { GamePartNodePool } from './part/GamePartNodePool';
import { GamePartEvent } from './part/GamePartEvent';
import { GamePartKeyboard } from './part/GamePartKeyboard';
import { GamePartNode } from './part/GamePartNode';
import { GamePartRes } from './part/GamePartRes';
import { GamePartBase } from './GamePartBase';

/**
 * 子模块注册键
 * @remarks 枚举顺序即销毁顺序（先输入/音频/资源/特效，最后事件）
 */
export enum GamePartKey {
    /** 按钮 */
    Button = 'button',
    /** 键盘 */
    Keyboard = 'keyboard',
    /** 音频 */
    Audio = 'audio',
    /** 资源 */
    Res = 'res',
    /** 节点池 */
    Pool = 'pool',
    /** 节点树 */
    Nodes = 'nodes',
    /** 全局事件 */
    Event = 'event',
}

/** 模块创建器类型 */
type ModuleCreator = (comp: object) => GamePartBase;

/** 子模块懒加载注册表（统一登记、按序批量销毁） */
export class GamePartRegistry {
    private instances: Map<GamePartKey, GamePartBase> | null = null;
    private creators: Map<GamePartKey, ModuleCreator>;

    /** 构造函数
     * @param comp 宿主对象
     * @param creators 模块创建器映射表
     */
    constructor(
        private readonly comp: object,
        creators: Map<GamePartKey, ModuleCreator>
    ) {
        this.creators = creators;
    }

    /** 获取实例映射表（延迟创建） */
    private getInstances(): Map<GamePartKey, GamePartBase> {
        if (!this.instances) {
            this.instances = new Map<GamePartKey, GamePartBase>();
        }
        return this.instances;
    }

    /** 获取模块实例
     * @param key 模块键
     * @returns 模块实例
     */
    get<M extends GamePartBase = GamePartBase>(key: GamePartKey): M {
        const instances = this.getInstances();
        let module = instances.get(key) as M | undefined;
        if (!module) {
            const creator = this.creators.get(key);
            if (!creator) {
                throw new Error(`未找到模块创建器: ${key}`);
            }
            module = creator(this.comp) as M;
            instances.set(key, module);
        }
        return module;
    }

    /** 销毁所有模块 */
    destroy(): void {
        if (this.instances) {
            for (const key of Object.values(GamePartKey)) {
                this.instances.get(key)?.destroy();
            }
            this.instances.clear();
            this.instances = null;
        }
    }
}

const GAME_PART = new Map<GamePartKey, ModuleCreator>([
    [GamePartKey.Button, (comp) => new GamePartButton(comp)],
    [GamePartKey.Keyboard, (comp) => new GamePartKeyboard(comp)],
    [GamePartKey.Audio, (comp) => new GamePartAudio(comp)],
    [GamePartKey.Res, (comp) => new GamePartRes(comp)],
    [GamePartKey.Pool, (comp) => new GamePartNodePool(comp)],
    [GamePartKey.Nodes, (comp) => new GamePartNode(comp)],
    [GamePartKey.Event, (comp) => new GamePartEvent(comp)],
]);

export function createPart(comp: object): GamePartRegistry {
    return new GamePartRegistry(comp, GAME_PART);
}
