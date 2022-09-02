/*
 * @Author: dgflash
 * @Date: 2021-08-18 17:00:59
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:03:56
 */

import { error, JsonAsset } from "cc";
import { oops } from "../Oops";

/** 资源路径 */
var path: string = "config/game/";

/** 数据缓存 */
var data: Map<string, any> = new Map();

/** JSON数据表工具 */
export class JsonUtil {
    static get(name: string): any {
        if (data.has(name))
            return data.get(name);
    }

    static load(name: string, callback: Function): void {
        if (data.has(name))
            callback(data.get(name));
        else {
            var url = path + name;
            oops.res.load(url, JsonAsset, (err: Error | null, content: JsonAsset) => {
                if (err) {
                    error(err.message);
                }
                data.set(name, content.json);
                callback(content.json)
            });
        }
    }

    static loadAsync(name: string) {
        return new Promise((resolve, reject) => {
            if (data.has(name)) {
                resolve(data.get(name))
            }
            else {
                var url = path + name;
                oops.res.load(url, JsonAsset, (err: Error | null, content: JsonAsset) => {
                    if (err) {
                        error(err.message);
                    }
                    data.set(name, content.json);
                    resolve(content.json)
                });
            }
        });
    }

    static release(name: string) {
        var url = path + name;
        data.delete(name);
        oops.res.release(url);
    }
}