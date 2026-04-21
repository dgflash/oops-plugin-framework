/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 14:49:42
 */
import { assetManager, Color, ImageAsset, sys, Texture2D } from 'cc';

/**
 * 图像工具
 */
export class ImageUtil {
    /**
     * 获取纹理中指定像素的颜色，原点为左上角，从像素 (1, 1) 开始。
     * @param texture 纹理
     * @param x x 坐标
     * @param y y 坐标
     * @example
// 获取纹理左上角第一个像素的颜色
const color = ImageUtil.getPixelColor(texture, 1, 1);
cc.color(50, 100, 123, 255);
     */
    static getPixelColor(texture: Texture2D, x: number, y: number): Color {
        if (sys.isBrowser) {
            return ImageUtil.getPixelColorForWeb(texture, x, y);
        }
        else {
            return ImageUtil.getPixelColorForNative(texture, x, y);
        }
    }

    private static getPixelColorForWeb(texture: Texture2D, x: number, y: number): Color {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = texture.width;
        canvas.height = texture.height;
        const image = texture.image?.data as HTMLCanvasElement | HTMLImageElement;
        ctx.drawImage(image, 0, 0, texture.width, texture.height);
        const imageData = ctx.getImageData(0, 0, texture.width, texture.height);
        const pixelIndex = ((y - 1) * texture.width * 4) + (x - 1) * 4;
        const pixelData = imageData.data.slice(pixelIndex, pixelIndex + 4);
        const color = new Color(pixelData[0], pixelData[1], pixelData[2], pixelData[3]);
        image.remove();
        canvas.remove();
        return color;
    }

    private static getPixelColorForNative(texture: Texture2D, x: number, y: number): Color {
        const height = texture.height;
        const pixels = texture.getPixel(x - 1, height - y);
        if (pixels) {
            return new Color(pixels.r, pixels.g, pixels.b, pixels.a);
        }
        return new Color(0, 0, 0, 0);
    }

    /**
     * 将图像转为 Base64 字符（仅 png、jpg 或 jpeg 格式资源）
     * @param url 图像地址
     * @param callback 完成回调
     */
    static imageToBase64(url: string, callback?: (dataURL: string) => void): Promise<string> {
        return new Promise((res) => {
            if (sys.isBrowser) {
                ImageUtil.imageToBase64ForWeb(url, callback).then((dataURL) => {
                    res(dataURL);
                });
            }
            else {
                ImageUtil.imageToBase64ForNative(url, callback).then((dataURL) => {
                    res(dataURL);
                });
            }
        });
    }

    private static imageToBase64ForWeb(url: string, callback?: (dataURL: string) => void): Promise<string> {
        return new Promise((res) => {
            let extname = /\.png|\.jpg|\.jpeg/.exec(url)?.[0];
            if (extname && ['.png', '.jpg', '.jpeg'].includes(extname)) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.src = url;
                image.onload = () => {
                    canvas.height = image.height;
                    canvas.width = image.width;
                    ctx.drawImage(image, 0, 0);
                    extname = extname === '.jpg' ? 'jpeg' : extname!.replace('.', '');
                    const dataURL = canvas.toDataURL(`image/${extname}`);
                    callback && callback(dataURL);
                    res(dataURL);
                    image.remove();
                    canvas.remove();
                };
                image.onerror = () => {
                    console.warn('Failed to load image:', url);
                    callback && callback('');
                    res('');
                };
            }
            else {
                console.warn('Not a jpg/jpeg or png resource!');
                callback && callback('');
                res('');
            }
        });
    }

    private static imageToBase64ForNative(url: string, callback?: (dataURL: string) => void): Promise<string> {
        return new Promise((res) => {
            const extname = /\.png|\.jpg|\.jpeg/.exec(url)?.[0];
            if (!extname || !['.png', '.jpg', '.jpeg'].includes(extname)) {
                console.warn('Not a jpg/jpeg or png resource!');
                callback && callback('');
                res('');
                return;
            }
            assetManager.loadRemote<ImageAsset>(url, (err, imageAsset) => {
                if (err || !imageAsset) {
                    console.warn('Failed to load image for base64:', url, err);
                    callback && callback('');
                    res('');
                    return;
                }
                const data = imageAsset.data as Uint8Array;
                const base64 = ImageUtil.uint8ArrayToBase64(data);
                const mimeType = extname === '.jpg' ? 'image/jpeg' : `image/${extname.replace('.', '')}`;
                const dataURL = `data:${mimeType};base64,${base64}`;
                callback && callback(dataURL);
                res(dataURL);
            });
        });
    }

    /**
     * 将 Base64 字符转为 cc.Texture2D 资源（异步）
     * @param base64 Base64 字符
     */
    static base64ToTextureAsync(base64: string): Promise<Texture2D | null> {
        return new Promise((resolve) => {
            if (sys.isBrowser) {
                ImageUtil.base64ToTextureForWebAsync(base64).then((texture) => {
                    resolve(texture);
                });
            }
            else {
                const texture = ImageUtil.base64ToTextureForNative(base64);
                resolve(texture);
            }
        });
    }

    /**
     * 将 Base64 字符转为 cc.Texture2D 资源（同步，仅 Web 平台推荐使用）
     * @param base64 Base64 字符
     * @deprecated 建议使用 base64ToTextureAsync 异步方法
     */
    static base64ToTexture(base64: string): Texture2D | null {
        if (sys.isBrowser) {
            return ImageUtil.base64ToTextureForWeb(base64);
        }
        else {
            return ImageUtil.base64ToTextureForNative(base64);
        }
    }

    private static base64ToTextureForWeb(base64: string): Texture2D | null {
        const image = document.createElement('img');
        image.src = base64;
        if (image.width === 0 || image.height === 0) {
            console.warn('Image not loaded yet, please use base64ToTextureAsync instead');
            return null;
        }
        const imageAsset = new ImageAsset(image);
        const texture = new Texture2D();
        texture.image = imageAsset;
        image.remove();
        return texture;
    }

    private static base64ToTextureForWebAsync(base64: string): Promise<Texture2D | null> {
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                const imageAsset = new ImageAsset(image);
                const texture = new Texture2D();
                texture.image = imageAsset;
                resolve(texture);
            };
            image.onerror = () => {
                console.warn('Failed to load base64 image');
                resolve(null);
            };
            image.src = base64;
        });
    }

    private static base64ToTextureForNative(base64: string): Texture2D | null {
        try {
            const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
            if (!base64Data) {
                console.warn('Invalid base64 string');
                return null;
            }
            const bytes = ImageUtil.base64ToUint8Array(base64Data);
            const imageAsset = new ImageAsset();
            imageAsset.reset({
                _data: bytes,
                width: 0,
                height: 0,
                format: Texture2D.PixelFormat.RGBA8888,
                _compressed: false
            });
            const texture = new Texture2D();
            texture.image = imageAsset;
            return texture;
        }
        catch (e) {
            console.warn('Failed to convert base64 to texture:', e);
            return null;
        }
    }

    /**
     * 将 Base64 字符转为二进制数据
     * @param base64 Base64 字符
     */
    static base64ToBlob(base64: string): Blob | null {
        try {
            const strings = base64.split(',');
            const type = /image\/\w+/.exec(strings[0])?.[0] || 'image/png';
            const base64Data = strings[1] || base64;
            const bytes = ImageUtil.base64ToUint8Array(base64Data);
            return new Blob([bytes], { type: type });
        }
        catch (e) {
            console.warn('Failed to convert base64 to blob:', e);
            return null;
        }
    }

    private static base64ToUint8Array(base64: string): Uint8Array {
        const binaryString = ImageUtil.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    private static atob(base64: string): string {
        if (typeof window !== 'undefined' && window.atob) {
            return window.atob(base64);
        }
        return ImageUtil.atobPolyfill(base64);
    }

    private static atobPolyfill(base64: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        let i = 0;
        base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
        while (i < base64.length) {
            const enc1 = chars.indexOf(base64.charAt(i++));
            const enc2 = chars.indexOf(base64.charAt(i++));
            const enc3 = chars.indexOf(base64.charAt(i++));
            const enc4 = chars.indexOf(base64.charAt(i++));
            const chr1 = (enc1 << 2) | (enc2 >> 4);
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const chr3 = ((enc3 & 3) << 6) | enc4;
            output += String.fromCharCode(chr1);
            if (enc3 !== 64) {
                output += String.fromCharCode(chr2);
            }
            if (enc4 !== 64) {
                output += String.fromCharCode(chr3);
            }
        }
        return output;
    }

    private static uint8ArrayToBase64(uint8Array: Uint8Array): string {
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return ImageUtil.btoa(binary);
    }

    private static btoa(binary: string): string {
        if (typeof window !== 'undefined' && window.btoa) {
            return window.btoa(binary);
        }
        return ImageUtil.btoaPolyfill(binary);
    }

    private static btoaPolyfill(binary: string): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        let i = 0;
        while (i < binary.length) {
            const byte1 = binary.charCodeAt(i++);
            const byte2 = binary.charCodeAt(i++);
            const byte3 = binary.charCodeAt(i++);
            const enc1 = byte1 >> 2;
            const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
            let enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
            let enc4 = byte3 & 63;
            if (isNaN(byte2)) {
                enc3 = enc4 = 64;
            }
            else if (isNaN(byte3)) {
                enc4 = 64;
            }
            output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
        }
        return output;
    }
}
