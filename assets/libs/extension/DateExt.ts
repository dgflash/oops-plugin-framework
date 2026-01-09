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

    // 优化：预格式化数字，减少字符串拼接
    const pad = (n: number): string => n < 10 ? '0' + n : '' + n;
    
    let r = format
        .replace('yy', year.toString())
        .replace('MM', pad(month))
        .replace('dd', pad(day))
        .replace('hh', pad(hours))
        .replace('mm', pad(minutes))
        .replace('ss', pad(seconds));

    // 优化：简化毫秒格式化逻辑
    if (r.includes('ms')) {
        const ms = milliseconds < 10 ? '00' + milliseconds :
                    milliseconds < 100 ? '0' + milliseconds :
                    milliseconds.toString();
        r = r.replace('ms', ms);
    }

    return r;
};

Date.prototype.addTime = function (addMillis: number): Date {
    return new Date(this.getTime() + addMillis);
};

Date.prototype.range = function (d1: number | Date, d2: number | Date): boolean {
    // 优化：简化逻辑，减少变量声明
    const t1 = d1 instanceof Date ? d1.getTime() : d1;
    const t2 = d2 instanceof Date ? d2.getTime() : d2;
    const now = this.getTime();
    return now >= t1 && now < t2;
};

export { };
