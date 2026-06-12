import { registry } from './ECSTypeRegistry';
import type { CompCtor, EntityCtor, IComp } from './ECSTypes';
import type { ECSEntity } from '../entity/ECSEntity';
import type { ECSComblockSystem } from '../system/ECSComblockSystem';
import { ecsWorldManager } from '../world/ECSWorldManager';
import type { ECSWorld } from '../world/ECSWorld';

/**
 * 类装饰器工厂：注册组件 / 实体 / 系统到 ecs。
 * @param name          由于 js 打包会改变类名，必须手动传入名称
 * @param canNewOrWorld 组件 / 实体：是否可 new（CC 组件需传 false）；
 *                      系统：注册到的世界（系统没有 canNew，可直接传 world 名/实例）
 * @param world         仅系统有效：注册到指定世界（不传则进全局表）
 * @example
 * ```ts
 * @ecs.register('DemoPos')
 * class DemoPosComp extends ecs.Comp { ... }
 * ```
 */
export function register<T extends ECSEntity | IComp | ECSComblockSystem>(
    name: string,
    canNewOrWorld?: boolean | ECSWorld | string,
    world?: ECSWorld | string
) {
    return function (ctor: EntityCtor<T> | CompCtor<T> | (new () => T)) {
        const ctorAny = ctor as unknown as {
            s?: boolean;
            tid?: number;
            compName?: string;
        };

        // 注册系统：world 可用第二参（系统无 canNew）或第三参指定；不传 → 全局表
        if (ctorAny.s) {
            const targetWorld = typeof canNewOrWorld === 'boolean' ? world : canNewOrWorld ?? world;
            const sysCtor = ctor as new () => ECSComblockSystem;
            if (targetWorld != null) {
                ecsWorldManager.resolve(targetWorld).systems.register(name, sysCtor);
            }
            else {
                let list = registry.systems.get(name);
                if (list == null) {
                    list = [];
                    registry.systems.set(name, list);
                }
                list.push(sysCtor);
            }
        }
        // 注册实体
        else if (ctorAny.tid === undefined) {
            registry.entityCtors.set(ctor as EntityCtor<ECSEntity>, name);
        }
        // 注册组件
        else {
            if (ctorAny.tid === -1) {
                ctorAny.tid = registry.compTid++;
                ctorAny.compName = name;
                registry.compCtors.push(ctor as CompCtor<IComp>);
                ecsWorldManager.registerComponentSlot(ctorAny.tid);
            }
            else {
                throw new Error(`ECS 组件重复注册: ${name}.`);
            }
        }
    };
}
