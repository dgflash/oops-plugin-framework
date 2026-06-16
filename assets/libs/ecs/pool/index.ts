/**
 * 对象池管理系统
 *
 * 用于管理 ECS 框架中的对象池，主要包括：
 * 1. ECS 实体对象 (ECSEntity) - 实体销毁后回收复用
 * 2. ECS 组件对象 (IComp) - 组件移除后回收复用
 * 3. 其他自定义对象 - 支持任意类型的对象池化
 *
 * 核心功能：
 * - 对象复用：减少频繁创建销毁带来的性能开销
 * - 统计监控：跟踪命中率、创建次数等指标
 * - 池管理：支持预热、缩减、清空等操作
 * - 场景优化：场景切换时自动预热相关对象池
 */

export { ECSDynamicPool } from './ECSDynamicPool';
export { ECSPoolManager } from './ECSPoolManager';

import { ECSPoolManager } from './ECSPoolManager';

/**
 * 全局池协调器实例
 */
export const ecsPoolCoordinator = new ECSPoolManager();
