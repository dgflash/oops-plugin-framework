/*
 * @Author: dgflash
 * @Date: 2021-08-18 17:00:59
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-22 15:48:02
 */

import { JsonAsset } from "cc";
import { ZipLoader } from "db://oops-framework/core/common/loader/ZipLoader";
import { resLoader } from "../common/loader/ResLoader";

/** 资源路径 */
const pathJson: string = "config/game/";
/** 压缩包资源路径 */
const pathZip: string = "config/game/game";

/** 数据缓存 */
const data: Map<string, any> = new Map();

/** JSON数据表工具 */
export class JsonUtil {
    /** 是否使用压缩包加载配置表 */
    static zip: boolean = false;

    /**
     * 通知资源名从缓存中获取一个Json数据表
     * @param name  资源名
     */
    static get(name: string): any {
        if (data.has(name)) return data.get(name);
    }

    /**
     * 异步加载Json数据表
     * @param name 资源名
     */
    static load(name: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            let content: any = null;
            if (data.has(name)) {
                resolve(data.get(name));
            }
            else {
                const url = pathJson + name;
                if (this.zip) {
                    content = await ZipLoader.getJson(pathZip, `${name}.json`);
                }
                else {
                    content = await resLoader.loadAsync(url, JsonAsset);
                }

                if (content) {
                    data.set(name, content.json);
                    resLoader.release(url);
                    resolve(content.json);
                }
                else {
                    resolve(null);
                }
            }
        });
    }

    /**
     * 加载所有配置表数据到缓存中
     * @param isZip     是否为压缩包
     * @param zipNames  压缩包内的资源名列表
     */
    static loadDir(zipNames?: string[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.zip && zipNames) {
                await ZipLoader.load(pathZip);
                zipNames.forEach(name => {
                    data.set(name, ZipLoader.getJson(pathZip, `${name}.json`));
                });
                ZipLoader.release(pathZip);
                resolve();
            }
            else {
                resLoader.loadDir(pathJson, (err: Error | null, assets: JsonAsset[]) => {
                    if (err) {
                        console.error(err.message);
                        resolve();
                    }
                    else {
                        assets.forEach(asset => {
                            data.set(asset.name, asset.json);
                        });
                        resLoader.releaseDir(pathJson);
                        resolve();
                    }
                });
            }
        });
    }

    /**
     * 通过指定资源名释放资源内存
     * @param name 资源名
     */
    static release(name: string) {
        data.delete(name);
    }

    /** 清理所有数据 */
    static clear() {
        data.clear();
    }
}