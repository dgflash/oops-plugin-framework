// import { BufferAsset, SpriteFrame, Texture2D } from "cc";
// import { oops } from "../../Oops";

// export class ZipLoader {
//     private zips: Map<string, JSZip> = new Map();

//     /**
//      * 加载ZIP资源包
//      * @param url 
//      * @returns 
//      */
//     load(url: string): Promise<JSZip> {
//         return new Promise((resolve, reject) => {
//             oops.res.load(url, BufferAsset, async (error: Error | null, asset: BufferAsset) => {
//                 if (error) return reject(error);

//                 var zip = await JSZip.loadAsync(asset.buffer());
//                 this.zips.set(url, zip);
//                 resolve(zip);
//             })
//         });
//     }

//     getJson(zipName: string, path: string): Promise<any> {
//         return new Promise(async (resolve, reject) => {
//             var zip = this.zips.get(zipName);
//             if (zip == null) {
//                 console.error(`名为【${zipName}】的资源包不存在`);
//                 resolve(null);
//                 return;
//             }

//             var file = zip.file(path);
//             var json = JSON.parse(await file.async("text"));
//             resolve(json);
//         });
//     }

//     getSpriteFrame(zipName: string, path: string): Promise<SpriteFrame> {
//         return new Promise(async (resolve, reject) => {
//             var zip = this.zips.get(zipName);
//             if (zip == null) {
//                 console.error(`名为【${zipName}】的资源包不存在`);
//                 resolve(null!);
//                 return;
//             }

//             var file = zip.file(path);
//             var buf = await file.async("base64");
//             var img = new Image();
//             img.src = 'data:image/png;base64,' + buf;
//             img.onload = () => {
//                 var texture = new Texture2D();
//                 texture.reset({
//                     width: img.width,
//                     height: img.height
//                 });
//                 texture.uploadData(img, 0, 0);
//                 texture.loaded = true;

//                 var sf = new SpriteFrame();
//                 sf.texture = texture;

//                 resolve(sf);
//             }
//         });
//     }
// }