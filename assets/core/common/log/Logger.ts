
/** 日志类型 */
export enum LogType {
    /** 网络层日志 */
    Net = 1,
    /** 数据结构层日志 */
    Model = 2,
    /** 业务逻辑层日志 */
    Business = 4,
    /** 视图层日志 */
    View = 8,
    /** 配置日志 */
    Config = 16,
    /** 标准日志 */
    Trace = 32,
}

let names = {
    "1": "网络日志",
    "2": "数据日志",
    "4": "业务日志",
    "8": "视图日志",
    "16": "配置日志",
    "32": "标准日志"
};

export interface ILoggerConsole {
    trace(content: string, color: string): void;
}

/**
 * 日志管理
 * @help    https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037904&doc_id=2873565
 * @example
oops.log.trace("默认标准日志");
oops.log.logConfig("灰色配置日志");
oops.log.logNet("橙色网络日志");
oops.log.logModel("紫色数据日志");
oops.log.logBusiness("蓝色业务日志");
oops.log.logView("绿色视图日志");
 */
export class Logger {
    private static _instance: Logger;
    static get instance(): Logger {
        if (this._instance == null) {
            this._instance = new Logger();
            this._instance.init();
        }
        return this._instance;
    }

    private tags: number = 0;
    private lc: ILoggerConsole = null!;

    /** 禁用日志 */
    disable(): void {
        const nullFunc = () => { };
        console.log = nullFunc;
        console.warn = nullFunc;
        console.info = nullFunc;
        console.time = nullFunc;
        console.timeEnd = nullFunc;
        console.table = nullFunc;

        this.setTags();
    }

    /** 设置界面日志控制台 */
    setLoggerConsole(lc: ILoggerConsole) {
        this.lc = lc;
    }

    private init(): void {
        this.tags =
            LogType.Net |
            LogType.Model |
            LogType.Business |
            LogType.View |
            LogType.Config |
            LogType.Trace;
    }

    /**
     * 设置显示的日志类型，默认值为不显示任何类型日志
     * @example
oops.log.setTags(LogType.View|LogType.Business)
     */
    setTags(tag: LogType = null!) {
        if (tag) {
            this.tags = tag;
        }
    }

    // 用于存储计时开始时间
    private timeMap: Map<string, number> = new Map<string, number>();

    /**
     * 记录开始计时
     * @param describe  标题描述
     */
    start(describe: string): void {
        this.timeMap.set(describe, Date.now());
    }

    /**
     * 打印范围内时间消耗
     * @param describe  标题描述
     * @param color     日志文本颜色
     */
    end(describe: string): void {
        const startTime = this.timeMap.get(describe);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.timeMap.delete(describe);
            const colorStyle = "color:#fff;background:#ec1b3c;padding:2px 6px;border-radius:4px;";
            console.log(`%c[性能][${describe}]消耗[${duration}ms]`, colorStyle);
        }
        else {
            console.error(`未找到名为"${describe}"的计时记录`);
        }
    }

    /**
     * 打印表格
     * @param msg       日志消息
     * @param describe  标题描述
     * @example
var object:any = {uid:1000, name:"oops"};
oops.log.table(object);
     */
    table(msg: any, describe?: string) {
        if (!this.isOpen(LogType.Trace)) {
            return;
        }
        console.table(msg);
    }

    /**
     * 打印标准日志
     * @param msg       日志消息
     */
    trace(msg: any, color: string = "#000000ff") {
        this.print(LogType.Trace, msg, color);
    }

    /**
     * 打印网络层日志
     * @param msg       日志消息
     * @param describe  标题描述
     */
    logNet(msg: any, describe?: string) {
        this.orange(LogType.Net, msg, describe);
    }

    /**
     * 打印数据层日志
     * @param msg       日志消息
     * @param describe  标题描述
     */
    logModel(msg: any, describe?: string) {
        this.violet(LogType.Model, msg, describe);
    }

    /**
     * 打印业务层日志
     * @param msg       日志消息
     * @param describe  标题描述
     */
    logBusiness(msg: any, describe?: string) {
        this.blue(LogType.Business, msg, describe);
    }

    /**
     * 打印视图日志
     * @param msg       日志消息
     * @param describe  标题描述
     */
    logView(msg: any, describe?: string) {
        this.green(LogType.View, msg, describe);
    }

    /** 打印配置日志 */
    logConfig(msg: any, describe?: string) {
        this.gray(LogType.Config, msg, describe);
    }

    // 橙色
    private orange(tag: LogType, msg: any, describe?: string) {
        this.print(tag, msg, "#ee7700", describe);
    }

    // 紫色
    private violet(tag: LogType, msg: any, describe?: string) {
        this.print(tag, msg, "#800080", describe);
    }

    // 蓝色
    private blue(tag: LogType, msg: any, describe?: string) {
        this.print(tag, msg, "#3a5fcd", describe);
    }

    // 绿色
    private green(tag: LogType, msg: any, describe?: string) {
        this.print(tag, msg, "#008000", describe);
    }

    // 灰色
    private gray(tag: LogType, msg: any, describe?: string) {
        this.print(tag, msg, "#808080", describe);
    }

    private isOpen(tag: LogType): boolean {
        return (this.tags & tag) != 0;
    }

    /**
     * 输出日志
     * @param tag       日志类型
     * @param msg       日志内容
     * @param color     日志文本颜色
     * @param describe  日志标题描述
     */
    private print(tag: LogType, msg: any, color: string, describe?: string) {
        // 标记没有打开，不打印该日志
        if (!this.isOpen(tag)) return;

        const type = names[tag];
        if (this.lc == null) {
            // 使用原始console方法，避免循环调用
            const backLog = console.log;
            color = "color:" + color + ";";

            // 处理数组参数，展开打印
            if (Array.isArray(msg)) {
                if (describe) {
                    backLog("%c%s%s: %s", color, this.getDateString(), "[" + type + "]", describe, ...msg);
                }
                else {
                    backLog("%c%s%s: ", color, this.getDateString(), "[" + type + "]", ...msg);
                }
            }
            else {
                if (describe) {
                    backLog("%c%s%s: %s%o", color, this.getDateString(), "[" + type + "]", describe, msg);
                }
                else {
                    backLog("%c%s%s: %o", color, this.getDateString(), "[" + type + "]", msg);
                }
            }
        }
        else {
            this.lc.trace(`${this.getDateString()}[${type}]${msg}`, color);
        }
    }

    private getDateString(): string {
        let d = new Date();
        let str = d.getHours().toString();
        let timeStr = "";
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = d.getMinutes().toString();
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = d.getSeconds().toString();
        timeStr += (str.length == 1 ? "0" + str : str) + ":";
        str = d.getMilliseconds().toString();
        if (str.length == 1) str = "00" + str;
        if (str.length == 2) str = "0" + str;
        timeStr += str;

        timeStr = "[" + timeStr + "]";
        return timeStr;
    }
}