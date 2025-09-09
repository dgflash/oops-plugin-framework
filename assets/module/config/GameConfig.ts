/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-02-14 14:27:22
 */
import { oops } from "../../core/Oops";

/** 游戏自定义参数分组类型 */
export enum GameConfigCustomType {
    /** 开发环境 */
    Dev = "dev",
    /** 测试环境 */
    Test = "test",
    /** 生产环境 */
    Prod = "prod",
}

/* 游戏配置解析，对应 resources/config/config.json 配置 */
export class GameConfig {
    /** 客户端版本号配置 */
    get version(): string {
        return this._data.config.version;
    }
    /** 游戏每秒传输帧数 */
    get frameRate(): number {
        return this._data.config.frameRate;
    }
    /** 本地存储内容加密 key */
    get localDataKey(): string {
        return this._data.config.localDataKey;
    }
    /** 本地存储内容加密 iv */
    get localDataIv(): string {
        return this._data.config.localDataIv;
    }
    /** Http 服务器地址 */
    get httpServer(): string {
        return this._data.config.httpServer;
    }
    /** Http 请求超时时间 */
    get httpTimeout(): number {
        return this._data.config.httpTimeout;
    }

    /** 获取当前客户端支持的语言类型 */
    get language(): Array<string> {
        return this._data.language.type || ["zh"];
    }
    /** 获取当前客户端支持的语言 Json 配置路径 */
    get languagePathJson(): string {
        return this._data.language.path.json || "language/json";
    }
    /** 获取当前客户端支持的语言纹理配置路径 */
    get languagePathTexture(): string {
        return this._data.language.path.texture || "language/texture";
    }
    /** 默认语言 */
    get languageDefault(): string {
        return this._data.language.default || "zh";
    }

    /** 远程资源名 */
    get bundleDefault(): string {
        return this._data.bundle.default;
    }

    /** 加载界面资源超时提示 */
    get loadingTimeoutGui(): number {
        return this._data.config.loadingTimeoutGui || 1000;
    }

    /** 是否开启移动设备安全区域适配 */
    get mobileSafeArea(): boolean {
        return this._data.config.mobileSafeArea || false;
    }

    private _data: any = null;
    /** 游戏配置数据 */
    get data(): any {
        return this._data;
    }

    constructor(config: any) {
        this._data = Object.freeze(config.json);

        oops.log.logConfig(this._data, "游戏配置");
    }

    private _customType: GameConfigCustomType = GameConfigCustomType.Dev;

    /**
     * 设置自定义游戏参数配置类型
     * @param type 
     */
    setCustomType(type: GameConfigCustomType) {
        this._customType = type;
    }

    /** 获取游戏自定义配置 */
    get custom(): any {
        return this.data.custom[this._customType];
    }
}