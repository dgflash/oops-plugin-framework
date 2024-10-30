const { shell } = require('electron');

/** 包信息 */
const PACKAGE_JSON = require('../../package.json');

/** 包工具 */
export class PackageUtil {
    /**
     * 包名
     * @type {string}
     */
    static get package_name() {
        return PACKAGE_JSON.name;
    }

    /**
     * 版本
     * @type {string}
     */
    static get version() {
        return PACKAGE_JSON.version;
    }

    /**
     * 仓库地址
     * @type {string}
     */
    static get repository() {
        return PACKAGE_JSON.repository;
    }

    /**
     * 打开仓库页面
     */
    static openRepository() {
        const url = this.repository;
        shell.openExternal(url);
    }
}