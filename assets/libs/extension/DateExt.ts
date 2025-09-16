declare global {
    interface Date {
        /**
         * 时间格式化
         * @param format 时间格式，例如：yy-mm-dd hh:mm:ss
         */
        format(format: string): string;

        /**
         * 时间加法
         * @param addMillis 时间加法，单位毫秒
         */
        addTime(addMillis: number): Date;

        /**
         * 验证时间是否在指定范围
         * @param t1 范围开始时间
         * @param t2 范围结束时间
         */
        range(t1: number | Date, t2: number | Date): boolean;
    }
}

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

Date.prototype.addTime = function (addMillis: number): Date {
    return new Date(this.getTime() + addMillis);
}

Date.prototype.range = function (d1: number | Date, d2: number | Date): boolean {
    let t1: number = -1;
    let t2: number = -1;
    if (d1 instanceof Date)
        t1 = d1.getTime();
    else
        t1 = d1;
    if (d2 instanceof Date)
        t2 = d2.getTime();
    else
        t2 = d2;

    let now = this.getTime();
    if (now >= t1 && now < t2) {
        return true;
    }
    return false;
}

export { };