/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-11-01 15:47:16
 */

import { GameConfig } from "./GameConfig";
import { GameQueryConfig } from "./GameQueryConfig";

/** 游戏配置静态访问类 */
export class Config {
    /** 游戏配置数据，版本号、支持语种等数据 */
    game!: GameConfig;

    /** 浏览器查询参数 */
    query!: GameQueryConfig;
}