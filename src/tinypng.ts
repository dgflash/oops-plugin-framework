import fs from 'fs';
import https from 'https';
import path from 'path';
import url from 'url';

const exts = ['.png', '.jpg', '.jpeg'];
const max = 5200000;
const options: any = {
    method: 'POST',
    hostname: 'tinypng.com',
    path: '/backend/opt/shrink',
    headers: {
        rejectUnauthorized: 'false',
        'Postman-Token': Date.now(),
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    }
};

export function compress(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        console.log(`路径不存在：${filePath}`);
        return;
    }
    const fileName = path.basename(filePath);
    if (!fs.statSync(filePath).isDirectory()) {
        if (exts.includes(path.extname(filePath))) {
            console.log(`[${fileName}] 压缩中...`);
            fileTinyUpload(filePath)
                .then(data => {
                    console.log(`[1/1] [${fileName}] 压缩成功，原始: ${toSize(data.input.size)}，压缩: ${toSize(data.output.size)}，压缩比: ${toPercent(data.output.ratio)}`);
                })
                .catch(err => {
                    console.log(`[1/1] [${fileName}] 压缩失败！报错：${err}`);
                });
        }
        else {
            console.log(`[${fileName}] 压缩失败！报错：只支持 png、jpg 与 jpeg 格式`);
        }
    }
    else {
        let totalCount = 0;
        let processedCount = 0;
        fileEach(filePath, (filePathInDir) => {
            totalCount++;
            const relativePath = path.relative(filePath, filePathInDir);
            fileTinyUpload(filePathInDir)
                .then(data => {
                    console.log(`[${++processedCount}/${totalCount}] [${relativePath}] 压缩成功，原始: ${toSize(data.input.size)}，压缩: ${toSize(data.output.size)}，压缩比: ${toPercent(data.output.ratio)}`);
                })
                .catch(err => {
                    console.log(`[${++processedCount}/${totalCount}] [${relativePath}] 压缩失败！报错：${err}`);
                });
        });
    }
}

function getRandomIP(): string {
    return Array.from(Array(4)).map(() => Math.floor(255 * Math.random())).join('.');
}

function fileEach(dir: string, callback: (filePath: string) => void): void {
    fs.readdir(dir, (err: any, files: any[]) => {
        if (err) {
            console.error(err);
            return;
        }
        files.forEach((file: any) => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (statErr: any, stats: { isDirectory: () => any; size: number; isFile: () => any; }) => {
                if (statErr) {
                    console.error(statErr);
                    return;
                }
                if (stats.isDirectory()) {
                    fileEach(filePath, callback);
                }
                else {
                    if (stats.size <= max && stats.isFile() && exts.includes(path.extname(file))) {
                        callback(filePath);
                    }
                }
            });
        });
    });
}

function fileUpload(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
        options.headers['X-Forwarded-For'] = getRandomIP();
        const req = https.request(options, (res: any) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.error) {
                        reject(result.message);
                    } else {
                        resolve(result);
                    }
                } catch (parseErr) {
                    reject(parseErr);
                }
            });
        });
        req.write(fs.readFileSync(filePath), 'binary');
        req.on('error', err => {
            reject(err);
        });
        req.end();
    });
}

function fileUpdate(filePath: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const urlObj = new url.URL(data.output.url);
        const req = https.request(urlObj, (res: any) => {
            let body = '';
            res.setEncoding('binary');
            res.on('data', (chunk: string) => {
                body += chunk;
            });
            res.on('end', () => {
                fs.writeFile(filePath, body, 'binary', (err: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        });
        req.on('error', (err: any) => {
            reject(err);
        });
        req.end();
    });
}

function fileTinyUpload(filePath: string): Promise<any> {
    return fileUpload(filePath).then(data => fileUpdate(filePath, data));
}

function toSize(size: number): string {
    if (size < 1024)
        return size + 'B';
    else if (size < 1048576)
        return (size / 1024).toFixed(2) + 'KB';
    else
        return (size / 1024 / 1024).toFixed(2) + 'MB';
}

function toPercent(ratio: number): string {
    return (100 * ratio).toFixed(2) + '%';
}