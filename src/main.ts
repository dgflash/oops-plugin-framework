import { shell } from "electron";
import { checkUpdate, statistics } from "./common/version";

/**
 * @en Hooks triggered after extension loading is complete
 * @zh 扩展加载完成后触发的钩子
 */
export function load() {
    checkUpdate();
    statistics();
}

/**
 * @en Hooks triggered after extension uninstallation is complete
 * @zh 扩展卸载完成后触发的钩子
 */
export function unload() { }

export var config: any;

/**
 * @en 
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /** 打开框架文档 */
    document() {
        shell.openExternal('https://gitee.com/dgflash/oops-framework/wikis/pages');
    },
    /** 打开框架API文档 */
    documentApi() {
        shell.openExternal('https://oops-1255342636.cos.ap-shanghai.myqcloud.com/doc/oops-framework/index.html');
    },
    /** 打开框架更新日志 */
    log() {
        shell.openExternal('https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12101082&doc_id=2873565');
    },
    update() {
        checkUpdate();
    },
    /** 打开解决方案列表 */
    solution() {
        shell.openExternal('https://store.cocos.com/app/search?name=oops');
    },
    /** 打开教程项目 */
    tutorial() {
        shell.openExternal('https://store.cocos.com/app/detail/6647');
    },
    /** 点亮 Gitee 星星 */
    gitee() {
        shell.openExternal('https://gitee.com/dgflash/oops-framework');
    },
    /** 点亮 Github 星星 */
    github() {
        shell.openExternal('https://github.com/dgflash/oops-framework');
    },
    animator_editor() {
        shell.openExternal('https://oops-1255342636.cos.ap-shanghai.myqcloud.com/tools/animator-editor/index.html');
    }
};