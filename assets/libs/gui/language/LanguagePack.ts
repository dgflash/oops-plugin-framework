/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-26 17:20:19
 */
import { director, error, JsonAsset, TTFFont, warn } from "cc";
import { Logger } from "../../../core/common/log/Logger";
import { oops } from "../../../core/Oops";
import { LanguageData } from "./LanguageData";
import { LanguageLabel } from "./LanguageLabel";
import { LanguageSpine } from "./LanguageSpine";
import { LanguageSprite } from "./LanguageSprite";

export class LanguagePack {
    /** JSON资源目录 */
    json: string = "language/json";
    /** 纹理资源目录 */
    texture: string = "language/texture";
    /** SPINE资源目录 */
    spine: string = "language/spine";

    /**
     * 刷新语言文字
     * @param lang 
     */
    updateLanguage(lang: string) {
        let lanjson: any = oops.res.get(`${this.json}/${lang}`, JsonAsset);
        if (lanjson && lanjson.json) {
            LanguageData.data = lanjson.json;
            let rootNodes = director.getScene()!.children;
            for (let i = 0; i < rootNodes.length; ++i) {
                // 更新所有的LanguageLabel节点
                let labels = rootNodes[i].getComponentsInChildren(LanguageLabel);
                for (let j = 0; j < labels.length; j++) {
                    labels[j].language();
                }

                // 更新所有的LanguageSprite节点
                let sprites = rootNodes[i].getComponentsInChildren(LanguageSprite);
                for (let j = 0; j < sprites.length; j++) {
                    sprites[j].language();
                }

                // 更新所有的LanguageSpine节点
                let spines = rootNodes[i].getComponentsInChildren(LanguageSpine);
                for (let j = 0; j < spines.length; j++) {
                    spines[j].language();
                }
            }
        }
        else {
            warn("没有找到指定语言内容配置", lang);
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
        callback(lang);
    }

    private loadTexture(lang: string) {
        return new Promise((resolve, reject) => {
            let path = `${this.texture}/${lang}`;
            oops.res.loadDir(path, (err: any, assets: any) => {
                if (err) {
                    error(err);
                    resolve(null);
                    return;
                }
                Logger.logConfig(path, "下载语言包 textures 资源");
                resolve(null);
            })
        });
    }

    private loadJson(lang: string) {
        return new Promise((resolve, reject) => {
            let path = `${this.json}/${lang}`;
            oops.res.load(path, JsonAsset, (err: Error | null) => {
                if (err) {
                    error(err);
                    resolve(null);
                    return;
                }
                Logger.logConfig(path, "下载语言包 json 资源");

                oops.res.load(path, TTFFont, (err: Error | null) => {
                    if (err == null) Logger.logConfig(path, "下载语言包 ttf 资源");

                    resolve(null);
                });
            })
        });
    }

    private loadSpine(lang: string) {
        return new Promise((resolve, reject) => {
            let path = `${this.spine}/${lang}`;
            oops.res.loadDir(path, (err: any, assets: any) => {
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
        let langTexture = `${this.texture}/${lang}`;
        oops.res.releaseDir(langTexture);
        Logger.logView(langTexture, "释放语言 texture 资源");

        let langJson = `${this.json}/${lang}`;
        oops.res.release(langJson);
        Logger.logView(langJson, "释放语言文字资源");

        let langSpine = `${this.spine}/${lang}`;
        oops.res.release(langSpine);
        Logger.logView(langSpine, "释放语言 spine 资源");
    }
}