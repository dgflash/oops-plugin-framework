"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = exports.checkUpdate = void 0;
const PACKAGE_JSON = require('../package.json');
/**
 * 检查更新
 * @param {boolean} logWhatever 无论有无更新都打印提示
 */
async function checkUpdate(logWhatever) {
    // 编辑器本次启动是否已经检查过了
    // if (!logWhatever && (Editor[PACKAGE_NAME] && Editor[PACKAGE_NAME].hasCheckUpdate)) {
    //     return;
    // }
    // Editor[PACKAGE_NAME] = { hasCheckUpdate: true };
    // 是否有新版本
    const hasNewVersion = await check();
    // 打印到控制台
    // const { print, translate } = EditorMainUtil;
    const localVersion = getLocalVersion();
    if (hasNewVersion) {
        const remoteVersion = await getRemoteVersion();
        // print('info', translate('hasNewVersion'));
        // print('info', `${translate('localVersion')}${localVersion}`);
        // print('info', `${translate('latestVersion')}${remoteVersion}`);
        // print('info', translate('releases'));
        // print('info', translate('cocosStore'));
    }
    else if (logWhatever) {
        // print('info', translate('currentLatest'));
        // print('info', `${translate('localVersion')}${localVersion}`);
    }
}
exports.checkUpdate = checkUpdate;
/**
 * 检查远端是否有新版本
 * @returns {Promise<boolean>}
 */
async function check() {
    // 远端版本号
    const remoteVersion = await getRemoteVersion();
    if (!remoteVersion) {
        return false;
    }
    // 本地版本号
    const localVersion = getLocalVersion();
    // 对比版本号
    const result = compareVersion(localVersion, remoteVersion);
    return (result < 0);
}
exports.check = check;
/**
 * 获取远端版本号
 * @returns {Promise<string>}
 */
async function getRemoteVersion() {
    const json = await getRemotePackageJson();
    if (json && json.version) {
        return json.version;
    }
    return null;
}
/**
 * 获取远端的 package.json
 * @returns {Promise<object>}
 */
async function getRemotePackageJson() {
    const packageJsonUrl = `${repository()}/raw/master/package.json`;
    // 发起网络请求
    const response = await fetch(packageJsonUrl, {
        method: 'GET',
        cache: 'no-cache',
        mode: 'no-cors',
    });
    // 请求结果
    if (response.status !== 200) {
        return null;
    }
    // 读取 json
    const json = response.json();
    return json;
}
/**
 * 获取本地版本号
 * @returns {string}
 */
function getLocalVersion() {
    return repository();
}
/**
 * 包名
 * @type {string}
 */
function name() {
    return PACKAGE_JSON.name;
}
/**
 * 版本
 * @type {string}
 */
function version() {
    return PACKAGE_JSON.version;
}
/**
 * 仓库地址
 * @type {string}
 */
function repository() {
    return PACKAGE_JSON.repository;
}
/**
     * 拆分版本号
     * @param {string | number} version 版本号文本
     * @returns {number[]}
     * @example
     * splitVersionString('1.2.0');  // [1, 2, 0]
     */
function splitVersionString(version) {
    if (typeof version === 'number') {
        return [version];
    }
    if (typeof version === 'string') {
        return (version.replace(/-/g, '.').split('.').map(v => (parseInt(v) || 0)));
    }
    return [0];
}
/**
 * 对比版本号
 * @param {string | number} a 版本 a
 * @param {string | number} b 版本 b
 * @returns {-1 | 0 | 1}
 * @example
 * compareVersion('1.0.0', '1.0.1');    // -1
 * compareVersion('1.1.0', '1.1.0');    // 0
 * compareVersion('1.2.1', '1.2.0');    // 1
 * compareVersion('1.2.0.1', '1.2.0');  // 1
 */
function compareVersion(a, b) {
    const acs = splitVersionString(a), bcs = splitVersionString(b);
    const count = Math.max(acs.length, bcs.length);
    for (let i = 0; i < count; i++) {
        const ac = acs[i], bc = bcs[i];
        // 前者缺少分量或前者小于后者
        if (ac == undefined || ac < bc) {
            return -1;
        }
        // 后者缺少分量或前者大于后者
        if (bc == undefined || ac > bc) {
            return 1;
        }
    }
    return 0;
}
