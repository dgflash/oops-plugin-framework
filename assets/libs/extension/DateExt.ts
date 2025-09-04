declare global {
    interface Date {
        format(format: string): string;
    }
}

/** 格式化时间字符串 */
Date.prototype.format = function (format: string): string {
    const year: number = this.getFullYear();
    const month: number = this.getMonth() + 1;
    const day: number = this.getDate();
    const hours: number = this.getHours();
    const minutes: number = this.getMinutes();
    const seconds: number = this.getSeconds();
    const milliseconds: number = this.getMilliseconds();

    let r = format
        .replace('yy', year.toString())
        .replace('mm', (month < 10 ? '0' : '') + month)
        .replace('dd', (day < 10 ? '0' : '') + day)
        .replace('hh', (hours < 10 ? '0' : '') + hours)
        .replace('mm', (minutes < 10 ? '0' : '') + minutes)
        .replace('ss', (seconds < 10 ? '0' : '') + seconds);

    if (milliseconds < 10) {
        r = r.replace('ms', '00' + milliseconds);
    }
    else if (milliseconds < 100) {
        r = r.replace('ms', '0' + milliseconds);
    }
    else {
        r = r.replace('ms', milliseconds.toString());
    }

    return r;
};

export { };
