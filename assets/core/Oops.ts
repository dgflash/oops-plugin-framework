import { DEBUG } from 'cc/env';
import { ECSDriver } from '../libs/ecs/ECSDriver';
import { LanguageManager } from '../libs/gui/language/Language';
import { VM } from '../libs/model-view/ViewModel';
import { Config } from '../module/config/Config';
import type { AudioManager } from './common/audio/AudioManager';
import type { MessageManager } from './common/event/MessageManager';
import type { ResLoader } from './common/loader/ResLoader';
import { Logger } from './common/log/Logger';
import { RandomManager } from './common/random/RandomManager';
import type { StorageManager } from './common/storage/StorageManager';
import type { TimerManager } from './common/timer/TimerManager';
import type { GameManager } from './game/GameManager';
import type { LayerManager } from './gui/layer/LayerManager';

/** 框架版本号 */
export var version = '3.1.0.20260504';

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

    /** ECS 驱动（由 Root.update 通过 execute 驱动） */
    static ecs = new ECSDriver();
    /** 多语言模块 */
    static language: LanguageManager = new LanguageManager();
    /** MVVM */
    static mvvm = VM;
}

// 引入oops全局变量以方便调试
if (DEBUG) {
    //@ts-ignore
    window.oops = oops;
}
