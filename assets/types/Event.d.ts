/**
 * 全局事件类型映射接口
 * 业务层可以通过 declare global 扩展 OopsFramework.TypedEventMap 来定义强类型事件
 *
 * @example
 * // 在业务代码中扩展
 * declare global {
 *     namespace OopsFramework {
 *         interface TypedEventMap {
 *             [YourEvent.SomeEvent]: { data: string };
 *         }
 *     }
 * }
 */

declare global {
    namespace OopsFramework {
        interface TypedEventMap {
            // 业务层通过 declare global 扩展此接口
        }
    }
}

/** 获取 TypedEventMap 中所有事件 key 的联合类型 */
export type EventMapKeys = keyof OopsFramework.TypedEventMap;

export { };
