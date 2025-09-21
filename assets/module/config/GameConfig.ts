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
        return this.data.version;
    }
    /** 本地存储内容加密 key */
    get localDataKey(): string {
        return this.data.localDataKey;
    }
    /** 本地存储内容加密 iv */
    get localDataIv(): string {
        return this.data.localDataIv;
    }
    /** 游戏每秒传输帧数 */
    get frameRate(): number {
        return this.data.frameRate;
    }
    /** 是否开启移动设备安全区域适配 */
    get mobileSafeArea(): boolean {
        return this.data.mobileSafeArea || false;
    }
    /** 加载界面资源超时提示 */
    get loadingTimeoutGui(): number {
        return this.data.loadingTimeoutGui || 1000;
    }
    /** 是否显示统计信息 */
    get stats(): number {
        return this.data.stats;
    }
    /** Http 服务器地址 */
    get httpServer(): string {
        return this.data.httpServer;
    }
    /** Http 请求超时时间 */
    get httpTimeout(): number {
        return this.data.httpTimeout;
    }
    /** WebSocket 服务器地址 */
    get webSocketServer(): string {
        return this.data.webSocketServer;
    }
    /** WebSocket 心跳间隔时间（毫秒） */
    get webSocketHeartTime(): number {
        return this.data.webSocketHeartTime;
    }
    /** WebSocket 指定时间没收到消息就断开连接（毫秒） */
    get webSocketReceiveTime(): number {
        return this.data.webSocketReceiveTime;
    }
    /** WebSocket 重连间隔时间（毫秒） */
    get webSocketReconnetTimeOut(): number {
        return this.data.webSocketReconnetTimeOut;
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

    private _data: any = null;
    /** 游戏配置数据 */
    get data(): any {
        return this._data.config[this._configType];
    }

    /** 当前游戏配置分组类型 */
    private _configType: GameConfigCustomType = GameConfigCustomType.Prod;

    constructor(config: any) {
        this._data = Object.freeze(config.json);
        this.setConfigType(this._data.type);
        oops.log.logConfig(this._data, "游戏配置");
    }

    /**
     * 设置游戏参数类型
     * @param type 
     */
    setConfigType(type: GameConfigCustomType) {
        this._configType = type;
    }
}