"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reload = exports.checkUpdate = void 0;
const package_util_1 = require("./package-util");
/**
 * 显示当前框架版本
 */
function checkUpdate() {
    const version = package_util_1.PackageUtil.version;
    console.log('【Oops Framework】当前版本：', version);
}
exports.checkUpdate = checkUpdate;
/**
 * 重载插件
 */
async function reload() {
    const path = await Editor.Package.getPath(package_util_1.PackageUtil.name);
    await Editor.Package.unregister(path);
    await Editor.Package.register(path);
    await Editor.Package.enable(path);
}
exports.reload = reload;
