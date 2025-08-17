/*
 * @Author: dgflash
 * @Date: 2022-02-11 09:32:47
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-21 15:19:56
 */
import { DEBUG } from "cc/env";
import { EffectSingleCase } from "../libs/animator-effect/EffectSingleCase";
import { ecs } from "../libs/ecs/ECS";
import { ECSRootSystem } from "../libs/ecs/ECSSystem";
import { LanguageManager } from "../libs/gui/language/Language";
import { VM } from "../libs/model-view/ViewModel";
import { Config } from "../module/config/Config";
import { AudioManager } from "./common/audio/AudioManager";
import { MessageManager } from "./common/event/MessageManager";
import { ResLoader } from "./common/loader/ResLoader";
import { Logger } from "./common/log/Logger";
import { RandomManager } from "./common/random/RandomManager";
import { StorageManager } from "./common/storage/StorageManager";
import { TimerManager } from "./common/timer/TimerManager";
import { GameManager } from "./game/GameManager";
import { LayerManager } from "./gui/layer/LayerManager";

/** 框架版本号 */
export var version: string = "2.0.0.20250514";

/** 框架核心模块访问入口 */
export class oops {
    /** ----------核心模块---------- */

    /** 日志管理 */
    static log = Logger.instance;
    /** 游戏配置 */
    static config = new Config();
    /** 本地存储 */
    static storage: StorageManager;
    /** 资源管理 */
    static res: ResLoader;
    /** 全局消息 */
    static message: MessageManager;
    /** 随机工具 */
    static random = RandomManager.instance;
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
    static language: LanguageManager = new LanguageManager();
    /** ECS */
    static ecs: ECSRootSystem = new ecs.RootSystem();
    /** MVVM */
    static mvvm = VM;
    /** 对象池 */
    static pool = EffectSingleCase.instance;
}

// 引入oops全局变量以方便调试
if (DEBUG) {
    //@ts-ignore
    window.oops = oops;
}