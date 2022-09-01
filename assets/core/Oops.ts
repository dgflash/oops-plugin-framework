/*
 * @Author: dgflash
 * @Date: 2022-02-11 09:32:47
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-17 13:59:54
 */
import { ECSRootSystem } from "../libs/ecs/ECSSystem";
import { LanguageManager } from "../libs/gui/language/Language";
import { HttpRequest } from "../libs/network/HttpRequest";
import { AudioManager } from "./common/audio/AudioManager";
import { MessageManager } from "./common/event/MessageManager";
import { Logger } from "./common/log/Logger";
import { TimerManager } from "./common/manager/TimerManager";
import { StorageManager } from "./common/storage/StorageManager";
import { GameManager } from "./game/GameManager";
import { LayerManager } from "./gui/layer/LayerManager";

/** 框架版本 */
export var version: string = "1.1.0";

export class oops {
    /** ----------核心模块---------- */

    /** 日志管理 */
    static log = Logger;
    /** 全局消息 */
    static message: MessageManager;
    /** 本地存储 */
    static storage: StorageManager;
    /** 游戏时间管理 */
    static timer: TimerManager;
    /** 游戏音乐管理 */
    static audio: AudioManager;
    /** 二维界面管理 */
    static gui: LayerManager;
    /** 三维游戏世界管理 */
    static game: GameManager;

    /** ----------可选模块---------- */

    /** 多语言模块 */
    static language: LanguageManager;
    /** HTTP */
    static http: HttpRequest;
    /** ECS */
    static ecs: ECSRootSystem;
}