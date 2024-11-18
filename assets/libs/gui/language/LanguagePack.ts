/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-22 16:34:28
 */
import { director, error, JsonAsset, TTFFont } from "cc";
import { resLoader } from "../../../core/common/loader/ResLoader";
import { Logger } from "../../../core/common/log/Logger";
import { JsonUtil } from "../../../core/utils/JsonUtil";
import { LanguageData, LanguageType } from "./LanguageData";

export class LanguagePack {
    /**
     * 刷新语言文字
     * @param lang 
     */
    updateLanguage(lang: string) {
        let rootNodes = director.getScene()!.children;
        for (let i = 0; i < rootNodes.length; ++i) {
            LanguageType.forEach(type => {
                let comps: any[] = rootNodes[i].getComponentsInChildren(type);
                for (let j = 0; j < comps.length; j++) {
                    comps[j].language();
                }
            })
        }
    }

    /**
     * 下载对应语言包资源
     * @param lang 语言标识
     * @param callback 下载完成回调
     */
    async loadLanguageAssets(lang: string, callback: Function) {
        await this.loadTexture(lang);
        await this.loadSpine(lang);
        await this.loadJson(lang);
        await this.loadTable(lang);

        callback(lang);
    }

    /** 多语言Excel配置表数据 */
    private loadTable(lang: string) {
        return new Promise(async (resolve, reject) => {
            LanguageData.excel = await JsonUtil.loadAsync("Language");
            if (LanguageData.excel) {
                Logger.logConfig("config/game/Language", "下载语言包 table 资源");
            }
            resolve(null);
        });
    }

    /** 纹理多语言资源 */
    private loadTexture(lang: string) {
        return new Promise((resolve, reject) => {
            const path = `${LanguageData.path_texture}/${lang}`;
            resLoader.loadDir(path, (err: any, assets: any) => {
                if (err) {
                    error(err);
                    resolve(null);
                    return;
                }
                Logger.logConfig(path, "下载语言包 textures 资源");
                resolve(null);
            });
        });
    }

    /** Json格式多语言资源 */
    private loadJson(lang: string) {
        return new Promise(async (resolve, reject) => {
            const path = `${LanguageData.path_json}/${lang}`;
            const jsonAsset = await resLoader.loadAsync(path, JsonAsset);
            if (jsonAsset) {
                LanguageData.json = jsonAsset.json;
                Logger.logConfig(path, "下载语言包 json 资源");
            }
            else {
                resolve(null);
                return;
            }

            resLoader.load(path, TTFFont, (err: Error | null, font: TTFFont) => {
                if (err == null) Logger.logConfig(path, "下载语言包 ttf 资源");
                LanguageData.font = font;
                resolve(null);
            });
        });
    }

    /** SPINE动画多语言资源 */
    private loadSpine(lang: string) {
        return new Promise(async (resolve, reject) => {
            const path = `${LanguageData.path_spine}/${lang}`;
            resLoader.loadDir(path, (err: any, assets: any) => {
                if (err) {
                    error(err);
                    resolve(null);
                    return;
                }
                Logger.logConfig(path, "下载语言包 spine 资源");
                resolve(null);
            })
        });
    }

    /**
     * 释放某个语言的语言包资源包括json
     * @param lang 
     */
    releaseLanguageAssets(lang: string) {
        let langTexture = `${LanguageData.path_texture}/${lang}`;
        resLoader.releaseDir(langTexture);

        let langJson = `${LanguageData.path_json}/${lang}`;
        let json = resLoader.get(langJson, JsonAsset);
        if (json) {
            json.decRef();
        }

        let font = resLoader.get(langJson, TTFFont);
        if (font) {
            font.decRef();
        }

        let langSpine = `${LanguageData.path_spine}/${lang}`;
        resLoader.release(langSpine);
    }
}