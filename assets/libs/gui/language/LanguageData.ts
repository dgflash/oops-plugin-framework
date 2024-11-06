import { TTFFont } from "cc";

/*
 * @Author: dgflash
 * @Date: 2022-02-11 09:31:52
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-22 16:37:40
 */

export class LanguageData {
    /** JSON资源目录 */
    static path_json: string = "language/json";
    /** 纹理资源目录 */
    static path_texture: string = "language/texture";
    /** SPINE资源目录 */
    static path_spine: string = "language/spine";

    /** 当前语言 */
    static current: string = "";
    /** 语言JSON配置数据 */
    static json: any = {}
    /** 语言EXCEL中的配置数据 */
    static excel: any = null!;
    /** TTF字体 */
    static font: TTFFont = null!;

    /** 
     * 通过多语言关键字获取语言文本 
     * 
     * 注：
     * 
     * 1、先获取language/json中的配置数据，如果没有者获取config/game/Language配置表中的多语言数据
     * 
     * 2、config/game/Language配置表可选使用，不用时不创建同名配置表即可
     * 
     * 3、config/game/Language配置表使用oops-plugin-excel-to-json插件生成，点击项目根目录下载update-oops-plugin-framework.bat或update-oops-plugin-framework.sh脚本下载插件
     */
    public static getLangByID(labId: string): string {
        const text = this.json[labId];
        if (text) {
            return text;
        }

        if (this.excel) {
            const record = this.excel[labId];
            if (record) {
                return record[this.current];
            }
        }

        return labId;
    }
}

export const LanguageType = [
    'LanguageLabel',
    'LanguageSprite',
    'LanguageSpine'
]