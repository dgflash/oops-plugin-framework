"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compress = void 0;
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const exts = ['.png', '.jpg', '.jpeg'];
const max = 5200000;
const options = {
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
function compress(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        console.log(`路径不存在：${filePath}`);
        return;
    }
    const fileName = path_1.default.basename(filePath);
    if (!fs_1.default.statSync(filePath).isDirectory()) {
        if (exts.includes(path_1.default.extname(filePath))) {
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
            const relativePath = path_1.default.relative(filePath, filePathInDir);
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
exports.compress = compress;
function getRandomIP() {
    return Array.from(Array(4)).map(() => Math.floor(255 * Math.random())).join('.');
}
function fileEach(dir, callback) {
    fs_1.default.readdir(dir, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }
        files.forEach((file) => {
            const filePath = path_1.default.join(dir, file);
            fs_1.default.stat(filePath, (statErr, stats) => {
                if (statErr) {
                    console.error(statErr);
                    return;
                }
                if (stats.isDirectory()) {
                    fileEach(filePath, callback);
                }
                else {
                    if (stats.size <= max && stats.isFile() && exts.includes(path_1.default.extname(file))) {
                        callback(filePath);
                    }
                }
            });
        });
    });
}
function fileUpload(filePath) {
    return new Promise((resolve, reject) => {
        options.headers['X-Forwarded-For'] = getRandomIP();
        const req = https_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.error) {
                        reject(result.message);
                    }
                    else {
                        resolve(result);
                    }
                }
                catch (parseErr) {
                    reject(parseErr);
                }
            });
        });
        req.write(fs_1.default.readFileSync(filePath), 'binary');
        req.on('error', err => {
            reject(err);
        });
        req.end();
    });
}
function fileUpdate(filePath, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new url_1.default.URL(data.output.url);
        const req = https_1.default.request(urlObj, (res) => {
            let body = '';
            res.setEncoding('binary');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                fs_1.default.writeFile(filePath, body, 'binary', (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
        req.on('error', (err) => {
            reject(err);
        });
        req.end();
    });
}
function fileTinyUpload(filePath) {
    return fileUpload(filePath).then(data => fileUpdate(filePath, data));
}
function toSize(size) {
    if (size < 1024)
        return size + 'B';
    else if (size < 1048576)
        return (size / 1024).toFixed(2) + 'KB';
    else
        return (size / 1024 / 1024).toFixed(2) + 'MB';
}
function toPercent(ratio) {
    return (100 * ratio).toFixed(2) + '%';
}
