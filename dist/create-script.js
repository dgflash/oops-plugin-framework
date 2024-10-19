"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScript = exports.createScriptBll = exports.createScriptModule = exports.createView = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/** 写入文件 */
function createView(directoryPath, fileName, content, isEcsComp = true) {
    return new Promise(async (resolve, reject) => {
        // 创建脚本
        let className = fileName + "View";
        let scriptUrl = "";
        if (isEcsComp) {
            scriptUrl = path_1.default.join(directoryPath, fileName) + "ViewComp.ts";
        }
        else {
            scriptUrl = path_1.default.join(directoryPath, fileName) + "View.ts";
        }
        if (!(0, fs_1.existsSync)(scriptUrl)) {
            content = content.replace(/<%Name%>/g, className);
            await Editor.Message.request('asset-db', 'create-asset', scriptUrl, content);
        }
        // 创建预制
        let prefabUrl = path_1.default.join(directoryPath, fileName) + ".prefab";
        if (!(0, fs_1.existsSync)(prefabUrl)) {
            if (isEcsComp)
                className = className + "Comp";
            await Editor.Message.request('scene', 'execute-scene-script', {
                name: "oops-framework",
                method: 'createPrefab',
                args: [fileName, className, prefabUrl]
            });
        }
        // 闪烁提示新创建的脚本文件
        Editor.Message.send('assets', 'twinkle', scriptUrl);
        // 打开脚本
        Editor.Message.request('asset-db', 'open-asset', scriptUrl);
        // 打开预制
        Editor.Message.request('asset-db', 'open-asset', prefabUrl);
        resolve();
    });
}
exports.createView = createView;
function createScriptModule(directoryPath, fileName, content) {
    return new Promise(async (resolve, reject) => {
        // 创建目录
        let pathName = fileName.toLowerCase();
        let pathModule = path_1.default.join(directoryPath, pathName);
        if (!(0, fs_1.existsSync)(pathModule)) {
            await Editor.Message.request('asset-db', 'create-asset', pathModule, null);
        }
        let subPathView = path_1.default.join(pathModule, "view");
        if (!(0, fs_1.existsSync)(subPathView)) {
            await Editor.Message.request('asset-db', 'create-asset', subPathView, null);
        }
        let subPathBll = path_1.default.join(pathModule, "bll");
        if (!(0, fs_1.existsSync)(subPathBll)) {
            await Editor.Message.request('asset-db', 'create-asset', subPathBll, null);
        }
        let subPathModel = path_1.default.join(pathModule, "model");
        if (!(0, fs_1.existsSync)(subPathModel)) {
            await Editor.Message.request('asset-db', 'create-asset', subPathModel, null);
        }
        // 创建脚本
        let scriptUrl = path_1.default.join(pathModule, fileName) + ".ts";
        if (!(0, fs_1.existsSync)(scriptUrl)) {
            content = content.replace(/<%Name%>/g, fileName);
            await Editor.Message.request('asset-db', 'create-asset', scriptUrl, content);
        }
        // 闪烁提示新创建的脚本文件
        Editor.Message.send('assets', 'twinkle', scriptUrl);
        // 打开脚本
        Editor.Message.request('asset-db', 'open-asset', scriptUrl);
        resolve();
    });
}
exports.createScriptModule = createScriptModule;
/** 创建脚本 */
function createScriptBll(directoryPath, fileName, content, moduleName) {
    return new Promise(async (resolve, reject) => {
        let scriptUrl = path_1.default.join(directoryPath, fileName) + ".ts";
        // 创建脚本
        if (!(0, fs_1.existsSync)(scriptUrl)) {
            content = content.replace(/<%Name%>/g, fileName);
            content = content.replace(/<%ModuleName%>/g, moduleName);
            await Editor.Message.request('asset-db', 'create-asset', scriptUrl, content);
        }
        // 闪烁提示新创建的脚本文件
        Editor.Message.send('assets', 'twinkle', scriptUrl);
        // 打开脚本
        Editor.Message.request('asset-db', 'open-asset', scriptUrl);
        resolve();
    });
}
exports.createScriptBll = createScriptBll;
/** 创建业务层脚本 */
function createScript(directoryPath, fileName, content, isEcsComp = true) {
    return new Promise(async (resolve, reject) => {
        let scriptUrl = "";
        if (isEcsComp) {
            scriptUrl = path_1.default.join(directoryPath, fileName) + "Comp.ts";
        }
        else {
            scriptUrl = path_1.default.join(directoryPath, fileName) + ".ts";
        }
        // 创建脚本
        if (!(0, fs_1.existsSync)(scriptUrl)) {
            content = content.replace(/<%Name%>/g, fileName);
            await Editor.Message.request('asset-db', 'create-asset', scriptUrl, content);
        }
        // 闪烁提示新创建的脚本文件
        Editor.Message.send('assets', 'twinkle', scriptUrl);
        // 打开脚本
        Editor.Message.request('asset-db', 'open-asset', scriptUrl);
        resolve();
    });
}
exports.createScript = createScript;
