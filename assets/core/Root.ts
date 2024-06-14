/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-28 10:02:57
 */
import { Component, Game, JsonAsset, Node, _decorator, director, game, screen, sys } from "cc";
import { LanguageManager } from "../libs/gui/language/Language";
import { GameConfig } from "../module/config/GameConfig";
import { GameQueryConfig } from "../module/config/GameQueryConfig";
import { oops, version } from "./Oops";
import { AudioManager } from "./common/audio/AudioManager";
import { EventMessage } from "./common/event/EventMessage";
import { TimerManager } from "./common/timer/TimerManager";
import { GameManager } from "./game/GameManager";
import { GUI } from "./gui/GUI";
import { LayerManager } from "./gui/layer/LayerManager";

const { property } = _decorator;

var isInited = false;

/** 框架显示层根节点 */
export class Root extends Component {
    /** 游戏层节点 */
    @property({
        type: Node,
        tooltip: "游戏层"
    })
    game: Node = null!;            // 可使用多摄像机自定义二维或三维游戏场景

    /** 界面层节点 */
    @property({
        type: Node,
        tooltip: "界面层"
    })
    gui: Node = null!;

    /** 持久根节点 */
    private persistRootNode: Node = null!

    onLoad() {
        if (!isInited) {
            isInited = true;      // 注：这里是规避cc3.8在编辑器模式下运行时，关闭游戏会两次初始化报错

            console.log(`Oops Framework v${version}`);
            this.enabled = false;
            this.loadConfig();
        }
    }

    private loadConfig() {
        const config_name = "config";
        oops.res.load(config_name, JsonAsset, () => {
            var config = oops.res.get(config_name);
            if (config == null) {
                this.loadConfig();
                return;
            }
            // oops.config.btc = new BuildTimeConstants();
            oops.config.query = new GameQueryConfig();
            oops.config.game = new GameConfig(config);
            oops.http.server = oops.config.game.httpServer;                                      // Http 服务器地址
            oops.http.timeout = oops.config.game.httpTimeout;                                    // Http 请求超时时间
            oops.storage.init(oops.config.game.localDataKey, oops.config.game.localDataIv);      // 初始化本地存储加密
            game.frameRate = oops.config.game.frameRate;                                         // 初始化每秒传输帧数

            this.enabled = true;
            this.init();
            this.run();

            oops.res.release(config_name);
        });
    }

    update(dt: number) {
        oops.ecs.execute(dt);
    }

    /** 初始化游戏界面 */
    protected initGui() {

    }

    /** 初始化游戏业务模块 */
    protected initEcsSystem() {

    }

    /** 加载完引擎配置文件后执行 */
    protected run() {

    }

    protected init() {
        // 创建持久根节点
        this.persistRootNode = new Node("PersistRootNode");
        director.addPersistRootNode(this.persistRootNode);

        // 创建音频模块
        oops.audio = this.persistRootNode.addComponent(AudioManager);
        oops.audio.load();

        // 创建时间模块
        oops.timer = this.persistRootNode.addComponent(TimerManager)!;

        oops.language = new LanguageManager();
        oops.game = new GameManager(this.game);
        oops.gui = new LayerManager(this.gui);
        this.initGui();
        this.initEcsSystem();
        oops.ecs.init();

        // 游戏显示事件
        game.on(Game.EVENT_SHOW, this.onShow, this);
        // 游戏隐藏事件
        game.on(Game.EVENT_HIDE, this.onHide, this);

        // 添加游戏界面屏幕自适应管理组件
        this.gui.addComponent(GUI)!;

        // 游戏尺寸修改事件
        if (sys.isMobile == false) {
            screen.on("window-resize", () => {
                oops.message.dispatchEvent(EventMessage.GAME_RESIZE);
            }, this);

            screen.on("fullscreen-change", () => {
                oops.message.dispatchEvent(EventMessage.GAME_FULL_SCREEN);
            }, this);
        }

        screen.on("orientation-change", () => {
            oops.message.dispatchEvent(EventMessage.GAME_ORIENTATION);
        }, this);
    }

    private onShow() {
        oops.timer.load();     // 平台不需要在退出时精准计算时间，直接暂时游戏时间
        oops.audio.resumeAll();
        director.resume();
        game.resume();
        oops.message.dispatchEvent(EventMessage.GAME_SHOW);
    }

    private onHide() {
        oops.timer.save();     // 平台不需要在退出时精准计算时间，直接暂时游戏时间
        oops.audio.pauseAll();
        director.pause();
        game.pause();
        oops.message.dispatchEvent(EventMessage.GAME_HIDE);
    }
}