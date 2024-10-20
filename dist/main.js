"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.config = exports.unload = exports.load = void 0;
const child_process_1 = require("child_process");
const electron_1 = require("electron");
/**
 * @en Hooks triggered after extension loading is complete
 * @zh 扩展加载完成后触发的钩子
 */
function load() { }
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
    update() {
        let path = __dirname.replace("extensions\\oops-plugin-framework\\dist", "") + "update-oops-plugin-framework.bat";
        console.log(path);
        (0, child_process_1.exec)(path, (error, stdout, stderr) => {
            if (error) {
                console.error(`执行批处理文件时出错: ${error}`);
                return;
            }
            if (stderr) {
                console.error(`批处理文件的错误输出: ${stderr}`);
                return;
            }
            console.log(`批处理文件的输出: ${stdout}`);
        });
    }
};
