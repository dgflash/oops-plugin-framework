/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 09:41:12
 */

/** 框架内部全局事件  */
export enum EventMessage {
    /** 游戏从后台进入 */
    GAME_ENTER = "EventMessage.GAME_ENTER",
    /** 游戏切到后台 */
    GAME_EXIT = "EventMessage.GAME_EXIT",
    /** 游戏画笔尺寸变化事件 */
    GAME_RESIZE = "EventMessage.GAME_RESIZE"
}
