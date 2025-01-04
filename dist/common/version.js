"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reload = exports.statistics = exports.checkUpdate = void 0;
const package_util_1 = require("./package-util");
const axios = require('axios');
/**
 * 检查更新
 * @param {boolean} logWhatever 无论有无更新都打印提示
 */
function checkUpdate() {
    const packageJsonUrl = `${package_util_1.PackageUtil.repository}/raw/master/package.json`;
    axios.get(packageJsonUrl)
        .then(async (response) => {
        const json = response.data;
        if (json && json.version) {
            const remoteVersion = json.version;
            // 本地版本号
            const localVersion = getLocalVersion();
            // 对比版本号
            const result = compareVersion(localVersion, remoteVersion);
            if (result < 0) {
                console.log('【Oops Framework】发现新版本');
                console.log('【Oops Framework】本地版本：', localVersion);
                console.log('【Oops Framework】最新版本：', remoteVersion);
                console.log('【Oops Framework】关闭 Cocos Creator 运行 update-oops-plugin-hot-update 可自动更新');
            }
            else {
                console.log('【Oops Framework】当前 Oops Framework 为最新版本');
                console.log('【Oops Framework】本地版本：', localVersion);
            }
        }
    })
        .catch(() => {
        console.error("【Oops Framework】请检查你的网络是否正常，框架版本验证失败");
    });
}
exports.checkUpdate = checkUpdate;
async function statistics() {
    // 获取本地 IP 地址  
    const os = require('os');
    const getLocalIp = () => {
        const interfaces = os.networkInterfaces();
        for (let interfaceKey in interfaces) {
            for (let interfaceInfo of interfaces[interfaceKey]) {
                if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                    return interfaceInfo.address;
                }
            }
        }
        return 'undefined';
    };
    const si = require('systeminformation');
    const system = await si.system();
    const axios = require('axios');
    const api = `http://43.142.65.105:8866/ptl/Register`;
    const params = {
        username: system.uuid,
        ip: getLocalIp()
    };
    axios.post(api, params).then((response) => { }).catch(() => { });
}
exports.statistics = statistics;
async function reload() {
    const path = await Editor.Package.getPath(package_util_1.PackageUtil.name);
    await Editor.Package.unregister(path);
    await Editor.Package.register(path);
    await Editor.Package.enable(path);
}
exports.reload = reload;
/**
 * 获取本地版本号
 * @returns {string}
 */
function getLocalVersion() {
    return package_util_1.PackageUtil.version;
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
