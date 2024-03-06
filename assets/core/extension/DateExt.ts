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

    return format
        .replace('yy', year.toString())
        .replace('mm', (month < 10 ? '0' : '') + month)
        .replace('dd', (day < 10 ? '0' : '') + day)
        .replace('hh', (hours < 10 ? '0' : '') + hours)
        .replace('mm', (minutes < 10 ? '0' : '') + minutes)
        .replace('ss', (seconds < 10 ? '0' : '') + seconds);
};

export { };
