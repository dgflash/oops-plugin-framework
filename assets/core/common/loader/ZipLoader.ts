import { BufferAsset, SpriteFrame, Texture2D } from "cc";
import { resLoader } from "./ResLoader";

/** 
 * 加载Zip资源
 * 注：
 * 1. 使用此功能需要教程项目中项目资源目录libs/jszip目录拷贝到自己的项目中
 * 2. 选中libs/jszip/jszip文件，属性检查器中勾选导入为插件、允许指点平台加载此库
 * 3. 压缩软件打包的 game.zip 修改为 game.bin 则可在游戏中加载
 */
export class ZipLoader {
    private static zips: Map<string, JSZip> = new Map();

    /**
     * 加载ZIP资源包
     * @param url 
     * @returns 
     */
    static load(url: string): Promise<JSZip> {
        return new Promise((resolve, reject) => {
            resLoader.load(url, BufferAsset, async (error: Error | null, asset: BufferAsset) => {
                if (error) return reject(error);

                var zip = await JSZip.loadAsync(asset.buffer());
                this.zips.set(url, zip);
                resolve(zip);
            })
        });
    }

    static getJson(zipName: string, path: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            var zip = this.zips.get(zipName);
            if (zip == null) {
                console.error(`名为【${zipName}】的资源包不存在`);
                resolve(null);
                return;
            }

            var file = zip.file(path);
            var json = JSON.parse(await file.async("text"));
            resolve(json);
        });
    }

    static getSpriteFrame(zipName: string, path: string): Promise<SpriteFrame> {
        return new Promise(async (resolve, reject) => {
            var zip = this.zips.get(zipName);
            if (zip == null) {
                console.error(`名为【${zipName}】的资源包不存在`);
                resolve(null!);
                return;
            }

            var file = zip.file(path);
            var buf = await file.async("base64");
            var img = new Image();
            img.src = 'data:image/png;base64,' + buf;
            img.onload = () => {
                var texture = new Texture2D();
                texture.reset({
                    width: img.width,
                    height: img.height
                });
                texture.uploadData(img, 0, 0);
                texture.loaded = true;

                var sf = new SpriteFrame();
                sf.texture = texture;

                resolve(sf);
            }
        });
    }

    /** 释放Zip资源 */
    static release(url?: string) {
        if (url) {
            resLoader.release(url);
        }
        else {
            this.zips.forEach((value: JSZip, key: string) => {
                resLoader.release(key);
            });
        }
    }
}