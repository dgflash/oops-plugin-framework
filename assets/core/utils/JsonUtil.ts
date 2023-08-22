/*
 * @Author: dgflash
 * @Date: 2021-08-18 17:00:59
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-22 15:48:02
 */

import { JsonAsset } from "cc";
import { oops } from "../Oops";

/** 资源路径 */
var path: string = "config/game/";

/** 数据缓存 */
var data: Map<string, any> = new Map();

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
            var url = path + name;
            oops.res.load(url, JsonAsset, (err: Error | null, content: JsonAsset) => {
                if (err) {
                    console.warn(err.message);
                    callback(null);
                }
                else {
                    data.set(name, content.json);
                    callback(content.json);
                }
            });
        }
    }

    /**
     * 异步加载Json数据表
     * @param name 资源名
     */
    static loadAsync(name: string) {
        return new Promise((resolve, reject) => {
            if (data.has(name)) {
                resolve(data.get(name))
            }
            else {
                var url = path + name;
                oops.res.load(url, JsonAsset, (err: Error | null, content: JsonAsset) => {
                    if (err) {
                        console.warn(err.message);
                        resolve(null);
                    }
                    else {
                        data.set(name, content.json);
                        resolve(content.json);
                    }
                });
            }
        });
    }

    /**
     * 通过指定资源名释放资源
     * @param name 资源名
     */
    static release(name: string) {
        var url = path + name;
        data.delete(name);
        oops.res.release(url);
    }
}