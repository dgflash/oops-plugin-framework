import type { ECSComblockSystem } from './ECSComblockSystem';

/** 本世界系统类注册表：注册名 -> 系统类（@ecs.register 指定 world 时写入，RootSystem.init 时实例化） */
export class ECSWorldSystemRegistry {
    private readonly _map: Map<string, Array<new () => ECSComblockSystem>> = new Map();

    /** 注册一个系统类到指定名下 */
    register(name: string, ctor: new () => ECSComblockSystem): void {
        let list = this._map.get(name);
        if (list == null) {
            list = [];
            this._map.set(name, list);
        }
        list.push(ctor);
    }

    /** 获取某注册名下的系统类列表 */
    get(name: string): Array<new () => ECSComblockSystem> | undefined {
        return this._map.get(name);
    }

    /** 遍历全部注册（名 -> 系统类列表） */
    forEach(cb: (ctors: Array<new () => ECSComblockSystem>, name: string) => void): void {
        this._map.forEach(cb);
    }

    /** 已注册的系统类总数 */
    get count(): number {
        let count = 0;
        this._map.forEach((list) => { count += list.length; });
        return count;
    }
}
