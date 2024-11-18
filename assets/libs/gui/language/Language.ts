import { sys } from "cc";
import { Logger } from "../../../core/common/log/Logger";
import { LanguageData } from "./LanguageData";
import { LanguagePack } from "./LanguagePack";

/** 多语言管理器 */
export class LanguageManager {
    private _languages: Array<string> = [sys.Language.CHINESE, sys.Language.ENGLISH];      // 支持的语言
    private _languagePack: LanguagePack = new LanguagePack();                              // 语言包
    private _defaultLanguage: string = sys.Language.CHINESE;                               // 默认语言

    /** 支持的多种语言列表 */
    get languages(): string[] {
        return this._languages;
    }
    set languages(languages: Array<string>) {
        this._languages = languages;
    }

    /** 设置的当前语言列表中没有配置时，使用默认语言 */
    set default(lang: string) {
        this._defaultLanguage = lang || sys.Language.CHINESE;
    }

    /** 获取当前语种 */
    get current(): string {
        return LanguageData.current;
    }

    /** 语言包 */
    get pack(): LanguagePack {
        return this._languagePack;
    }

    /**
     * 是否存在指定语言
     * @param lang  语言名
     * @returns 存在返回true,则否false
     */
    isExist(lang: string): boolean {
        return this.languages.indexOf(lang) > -1;
    }

    /** 获取下一个语种 */
    getNextLang(): string {
        let supportLangs = this.languages;
        let index = supportLangs.indexOf(LanguageData.current);
        return supportLangs[(index + 1) % supportLangs.length];
    }

    /**
     * 改变语种，会自动下载对应的语种
     * @param language 语言名
     * @param callback 多语言资源数据加载完成回调
     */
    setLanguage(language: string, callback?: (success: boolean) => void) {
        if (language == null || language == "") {
            language = this._defaultLanguage;
        }
        else {
            language = language.toLowerCase();
        }

        let index = this.languages.indexOf(language);
        if (index < 0) {
            console.log(`当前不支持【${language}】语言，将自动切换到【${this._defaultLanguage}】语言`);
            language = this._defaultLanguage;
        }

        if (language === LanguageData.current) {
            callback && callback(false);
            return;
        }

        this.loadLanguageAssets(language, (lang: string) => {
            Logger.logConfig(`当前语言为【${language}】`);
            const oldLanguage = LanguageData.current;
            LanguageData.current = language;
            this._languagePack.updateLanguage(language);
            this._languagePack.releaseLanguageAssets(oldLanguage);
            callback && callback(true);
        });
    }

    /**
     * 根据data获取对应语种的字符
     * @param labId 
     * @param arr 
     */
    getLangByID(labId: string): string {
        return LanguageData.getLangByID(labId);
    }

    /**
     * 下载语言包素材资源
     * 包括语言json配置和语言纹理包
     * @param lang 
     * @param callback 
     */
    loadLanguageAssets(lang: string, callback: Function) {
        lang = lang.toLowerCase();
        return this._languagePack.loadLanguageAssets(lang, callback);
    }

    /**
     * 释放不需要的语言包资源
     * @param lang 
     */
    releaseLanguageAssets(lang: string) {
        lang = lang.toLowerCase();
        this._languagePack.releaseLanguageAssets(lang);
    }
}