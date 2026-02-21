"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.config = exports.unload = exports.load = void 0;
const electron_1 = require("electron");
const version_1 = require("./common/version");
/**
 * @en Hooks triggered after extension loading is complete
 * @zh 扩展加载完成后触发的钩子
 */
function load() {
    (0, version_1.checkUpdate)();
    (0, version_1.statistics)();
}
exports.load = load;
/**
 * @en Hooks triggered after extension uninstallation is complete
 * @zh 扩展卸载完成后触发的钩子
 */
function unload() { }
exports.unload = unload;
/**
 * @en
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    /** 打开框架文档 */
    document() {
        electron_1.shell.openExternal('https://gitee.com/dgflash/oops-framework/wikis/pages');
    },
    /** 打开框架API文档 */
    documentApi() {
        electron_1.shell.openExternal('https://oops-1255342636.cos.ap-shanghai.myqcloud.com/doc/oops-framework/index.html');
    },
    /** 打开框架更新日志 */
    log() {
        electron_1.shell.openExternal('https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12101082&doc_id=2873565');
    },
    update() {
        (0, version_1.checkUpdate)();
    },
    /** 打开解决方案列表 */
    solution() {
        electron_1.shell.openExternal('https://store.cocos.com/app/search?name=oops');
    },
    /** 打开教程项目 */
    tutorial() {
        electron_1.shell.openExternal('https://store.cocos.com/app/detail/6647');
    },
    /** 点亮 Gitee 星星 */
    gitee() {
        electron_1.shell.openExternal('https://gitee.com/dgflash/oops-framework');
    },
    /** 点亮 Github 星星 */
    github() {
        electron_1.shell.openExternal('https://github.com/dgflash/oops-framework');
    },
    animator_editor() {
        electron_1.shell.openExternal('https://oops-1255342636.cos.ap-shanghai.myqcloud.com/tools/animator-editor/index.html');
    }
};
