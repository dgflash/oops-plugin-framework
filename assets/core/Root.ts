/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-11-18 17:56:04
 */
import { Component, director, game, Game, JsonAsset, log, Node, sys, view, _decorator } from "cc";
import { LanguageManager } from "../libs/gui/language/Language";
import { BuildTimeConstants } from "../module/config/BuildTimeConstants";
import { GameConfig } from "../module/config/GameConfig";
import { GameQueryConfig } from "../module/config/GameQueryConfig";
import { AudioManager } from "./common/audio/AudioManager";
import { EventMessage } from "./common/event/EventMessage";
import { TimerManager } from "./common/manager/TimerManager";
import { GameManager } from "./game/GameManager";
import { GUI } from "./gui/GUI";
import { LayerManager } from "./gui/layer/LayerManager";
import { oops, version } from "./Oops";

const { ccclass, property } = _decorator;

/** 框架显示层根节点 */
export class Root extends Component {
    /** 游戏层节点 */
    @property({
        type: Node,
        tooltip: "游戏层"
    })
    game: Node = null!;

    /** 界面层节点 */
    @property({
        type: Node,
        tooltip: "界面层"
    })
    gui: Node = null!;

    onLoad() {
        console.log(`Oops Framework v${version}`);
        this.enabled = false;

        let config_name = "config/config";
        oops.res.load(config_name, JsonAsset, () => {
            var config = oops.res.get(config_name);
            oops.config.btc = new BuildTimeConstants();
            oops.config.query = new GameQueryConfig();
            oops.config.game = new GameConfig(config);
            oops.http.server = oops.config.game.httpServer;                                      // Http 服务器地址
            oops.http.timeout = oops.config.game.httpTimeout;                                    // Http 请求超时时间
            oops.storage.init(oops.config.game.localDataKey, oops.config.game.localDataIv);      // 初始化本地存储加密
            game.frameRate = oops.config.game.frameRate;                                         // 初始化每秒传输帧数

            this.enabled = true;
            this.init();
            this.run();
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
        oops.language = new LanguageManager();
        oops.timer = new TimerManager(this);
        oops.audio = AudioManager.instance;
        oops.game = new GameManager(this.game);
        oops.gui = new LayerManager(this.gui);
        this.initGui();

        this.initEcsSystem();
        oops.ecs.init();

        // 游戏显示事件
        game.on(Game.EVENT_SHOW, () => {
            log("Game.EVENT_SHOW");
            oops.timer.load();     // 平台不需要在退出时精准计算时间，直接暂时游戏时间
            oops.audio.resumeAll();
            director.resume();
            game.resume();
            oops.message.dispatchEvent(EventMessage.GAME_ENTER);
        });

        // 游戏隐藏事件
        game.on(Game.EVENT_HIDE, () => {
            log("Game.EVENT_HIDE");
            oops.timer.save();     // 平台不需要在退出时精准计算时间，直接暂时游戏时间
            oops.audio.pauseAll();
            director.pause();
            game.pause();
            oops.message.dispatchEvent(EventMessage.GAME_EXIT);
        });

        // 游戏尺寸修改事件
        var c_gui = this.gui.addComponent(GUI)!;
        if (sys.isMobile == false) {
            view.setResizeCallback(() => {
                c_gui.resize();
                oops.message.dispatchEvent(EventMessage.GAME_RESIZE);
            });
        }
    }
}