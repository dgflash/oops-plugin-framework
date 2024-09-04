/*
 * @Author: dgflash
 * @Date: 2021-08-18 17:00:59
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-22 15:48:02
 */

import { JsonAsset } from "cc";
import { resLoader } from "../common/loader/ResLoader";

/** 资源路径 */
const path: string = "config/game/";

/** 数据缓存 */
const data: Map<string, any> = new Map();

/** JSON数据表工具 */
export class JsonUtil {
    /**
     * 通知资源名从缓存中获取一个Json数据表
     * @param name  资源名
     */
    static get(name: string): any {
        if (data.has(name))
            return data.get(name);
    }

    /**
     * 通知资源名加载Json数据表
     * @param name      资源名
     * @param callback  资源加载完成回调
     */
    static load(name: string, callback: Function): void {
        if (data.has(name))
            callback(data.get(name));
        else {
            const url = path + name;
            resLoader.load(url, JsonAsset, (err: Error | null, content: JsonAsset) => {
                if (err) {
                    console.warn(err.message);
                    callback(null);
                }
                else {
                    data.set(name, content.json);
                    resLoader.release(url);
                    callback(content.json);
                }
            });
        }
    }

    /**
     * 异步加载Json数据表
     * @param name 资源名
     */
    static loadAsync(name: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (data.has(name)) {
                resolve(data.get(name))
            }
            else {
                const url = path + name;
                resLoader.load(url, JsonAsset, (err: Error | null, content: JsonAsset) => {
                    if (err) {
                        console.warn(err.message);
                        resolve(null);
                    }
                    else {
                        data.set(name, content.json);
                        resLoader.release(url);
                        resolve(content.json);
                    }
                });
            }
        });
    }

    /** 加载所有配置表数据到缓存中 */
    static loadDirAsync(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            resLoader.loadDir(path, (err: Error | null, assets: JsonAsset[]) => {
                if (err) {
                    console.warn(err.message);
                    resolve(false);
                }
                else {
                    assets.forEach(asset => {
                        data.set(asset.name, asset.json);
                    });
                    resLoader.releaseDir(path);
                    resolve(true);
                }
            });
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