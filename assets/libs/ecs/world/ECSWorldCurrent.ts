import type { ECSWorld } from './ECSWorld';

/**
 * 当前世界指针（供 ECSWorldManager 与 ECSRootSystem 等内部模块共享，避免循环依赖）。
 * 由 ECSWorldManager 负责维护；业务代码请通过 ecs.world.current 访问。
 */
export const worldCurrent = {
    current: null as ECSWorld | null,
};
