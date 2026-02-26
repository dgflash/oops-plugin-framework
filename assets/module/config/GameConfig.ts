/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-02-14 14:27:22
 */
import { oops } from '../../core/Oops';

/** 游戏自定义参数分组类型 */
export enum GameConfigCustomType {
    /** 开发环境 */
    Dev = 'dev',
    /** 测试环境 */
    Test = 'test',
    /** 生产环境 */
    Prod = 'prod',
}

/** 框架基础环境配置（dev/test/prod 三类字段相同，仅值不同） */
export interface IConfigEnvironmentBase {
    /** 客户端版本号 */
    version: string;
    /** 本地存储内容加密 key */
    localDataKey: string;
    /** 本地存储内容加密 iv */
    localDataIv: string;
    /** 游戏每秒传输帧数 */
    frameRate: number;
    /** 加载界面资源超时提示（毫秒） */
    loadingTimeoutGui: number;
    /** 是否开启移动设备安全区域适配 */
    mobileSafeArea: boolean;
    /** 是否显示统计信息 */
    stats: boolean;
    /** Http 服务器地址 */
    httpServer: string;
    /** Http 请求超时时间（毫秒） */
    httpTimeout: number;
    /** WebSocket 服务器地址 */
    webSocketServer: string;
    /** WebSocket 心跳间隔时间（毫秒） */
    webSocketHeartTime: number;
    /** WebSocket 指定时间没收到消息就断开连接（毫秒） */
    webSocketReceiveTime: number;
    /** WebSocket 重连间隔时间（毫秒） */
    webSocketReconnetTimeOut: number;
}

/** 环境配置类型（游戏项目可通过模块增强扩展自定义字段） */
export interface IConfigEnvironment extends IConfigEnvironmentBase {}

/** config.json 完整配置结构 */
export interface IConfigJson {
    /** 当前使用的环境类型（dev/test/prod） */
    type: GameConfigCustomType;
    /** 各环境配置数据 */
    config: Record<GameConfigCustomType, IConfigEnvironment>;
    /** 界面层级配置 */
    gui: Array<{ name: string; type: string }>;
    /** 多语言配置 */
    language: {
        /** 默认语言 */
        default: string;
        /** 支持的语言类型列表 */
        type: string[];
        /** 语言资源路径 */
        path: { json: string; texture: string; spine?: string };
    };
    /** 远程资源包配置 */
    bundle: { default: string };
}

/** 资源配置加载器传入的 config 结构 */
export interface IConfigResource {
    json: IConfigJson;
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
    get stats(): boolean {
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
        return this._data.language.type || ['zh'];
    }
    /** 获取当前客户端支持的语言 Json 配置路径 */
    get languagePathJson(): string {
        return this._data.language.path.json || 'language/json';
    }
    /** 获取当前客户端支持的语言纹理配置路径 */
    get languagePathTexture(): string {
        return this._data.language.path.texture || 'language/texture';
    }
    /** 默认语言 */
    get languageDefault(): string {
        return this._data.language.default || 'zh';
    }

    /** 远程资源名 */
    get bundleDefault(): string {
        return this._data.bundle.default;
    }

    private _data!: IConfigJson;
    /** 游戏配置数据 */
    get data(): IConfigEnvironment {
        return this._data.config[this._configType];
    }

    /** 当前游戏配置分组类型 */
    private _configType: GameConfigCustomType = GameConfigCustomType.Prod;

    constructor(config: IConfigResource) {
        this._data = Object.freeze(config.json) as IConfigJson;
        this.setConfigType(this._data.type);
        oops.log.logConfig(this._data, '游戏配置');
    }

    /**
     * 设置游戏参数类型
     * @param type
     */
    setConfigType(type: GameConfigCustomType) {
        this._configType = type;
    }
}
