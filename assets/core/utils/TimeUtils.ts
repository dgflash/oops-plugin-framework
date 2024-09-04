/** 时间工具 */
export class TimeUtil {
    /**
     * 间隔天数
     * @param time1 开始时间
     * @param time2 结束时间
     * @returns 
     */
    public static daysBetween(time1: number | string | Date, time2: number | string | Date): number {
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
    public static secsBetween(time1: number, time2: number) {
        let dates = Math.abs((time2 - time1)) / (1000);
        dates = Math.floor(dates) + 1;
        return dates;
    }

    /**
     * 代码休眠时间
     * @param ms 毫秒
     */
    public static async sleep(ms: number) {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms)
        });
    }
}