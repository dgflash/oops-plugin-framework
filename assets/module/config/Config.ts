/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:05:13
 */

import { game, JsonAsset } from "cc";
import { oops } from "../../core/Oops";
import { BuildTimeConstants } from "./BuildTimeConstants";
import { GameConfig } from "./GameConfig";
import { GameQueryConfig } from "./GameQueryConfig";

/** 游戏配置静态访问类 */
export class Config {
    /** 构建时环境常量 */
    public btc!: BuildTimeConstants;

    /** 配置数据，版本号、支持语种等数据 */
    public game!: GameConfig;

    /** 处理浏览器地址栏参数，包括服务器ip、端口等数据 */
    public query!: GameQueryConfig;

    public init(callback: Function) {
        let config_name = "config/config";
        oops.res.load(config_name, JsonAsset, () => {
            var config = oops.res.get(config_name);
            this.btc = new BuildTimeConstants();
            this.query = new GameQueryConfig();
            this.game = new GameConfig(config);

            // 初始化每秒传输帧数
            game.frameRate = this.game.frameRate;
            // Http 服务器地址
            oops.http.server = this.game.httpServer;
            //  Http 请求超时时间
            oops.http.timeout = this.game.httpTimeout;
            // 初始化本地存储加密
            oops.storage.init(this.game.localDataKey, this.game.localDataIv);

            callback();
        });
    }
}

export const config = new Config()