import { GamePartEvent } from './part/GamePartEvent';
import { GamePartRegistry, GamePartKey, createPart } from './GamePartRegistry';
import type { CCEntity } from './CCEntity';

/** 业务逻辑 */
export class CCBusiness<T extends CCEntity> {
    private _ent: T | null = null;

    /** 所属实体引用 */
    get ent(): T {
        return this._ent!;
    }

    set ent(value: T) {
        this._ent = value;
    }

    private _parts: GamePartRegistry | null = null;

    /** 获取模块注册表（懒加载） */
    private get parts(): GamePartRegistry {
        return (this._parts ??= createPart(this));
    }

    /** 获取事件模块 */
    get event(): GamePartEvent {
        return this.parts.get(GamePartKey.Event);
    }

    /** 业务逻辑初始化（由 CCEntity.addBusiness 自动调用） */
    protected init() {

    }

    destroy() {
        // 销毁所有模块
        if (this._parts) {
            this._parts.destroy();
            this._parts = null;
        }

        // 清空实体引用，避免循环引用导致的内存泄漏
        this._ent = null;
    }
}
