/** 时间工具 */
export class TimeUtil {
    /**
     * 间隔天数
     * @param time1 开始时间
     * @param time2 结束时间
     * @returns 
     */
    static daysBetween(time1: number | string | Date, time2: number | string | Date): number {
        if (time2 == undefined) {
            time2 = +new Date();
        }
        let startDate = new Date(time1).toLocaleDateString()
        let endDate = new Date(time2).toLocaleDateString()
        let startTime = new Date(startDate).getTime();
        let endTime = new Date(endDate).getTime();
        return Math.abs((startTime - endTime)) / (1000 * 60 * 60 * 24);
    }

    /** 间隔秒数，时间顺序无要求，最后会获取绝对值 */
    static secsBetween(time1: number, time2: number) {
        let dates = Math.abs((time2 - time1)) / (1000);
        dates = Math.floor(dates) + 1;
        return dates;
    }

    /**
     * 代码休眠时间
     * @param ms 毫秒
     */
    static async sleep(ms: number) {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms)
        });
    }

    /** 倒计时时秒格式为时间格式 */
    static format(countDown: number) {
        let c: number = countDown;
        let date: number = Math.floor(c / 86400);
        c = c - date * 86400;
        let hours: number = Math.floor(c / 3600);
        c = c - hours * 3600;
        let minutes: number = Math.floor(c / 60);
        c = c - minutes * 60;
        let seconds: number = c;

        let result: string = "";
        let timeFormat: string = "{0}:{1}:{2}";
        if (date == 0 && hours == 0 && minutes == 0 && seconds == 0) {
            result = this.replace(timeFormat, "00", "00", "00");
        }
        else {
            hours += date * 24;
            result = this.replace(timeFormat, this.coverString(hours), this.coverString(minutes), this.coverString(seconds)); // 否则显示 "01:12:24"
        }
        return result;
    }

    private static coverString(value: number) {
        if (value < 10) return "0" + value;
        return value.toString();
    }

    private static replace(value: string, ...args: any): string {
        return value.replace(/\{(\d+)\}/g, function (m, i) { return args[i]; });
    }
}