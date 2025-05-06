/**
 * 数值格式化函数，通过语义解析自动设置值的范围
 */
class StringFormat {
    /**
     * 处理输入的数值或字符串，根据指定的格式进行格式化
     * @param value 要格式化的数值或字符串
     * @param format 格式化字符串
     * @returns 格式化后的字符串
     */
    deal(value: number | string, format: string): string {
        if (format === "") {
            return value as string;
        }

        format = format.toLowerCase().trim(); // 不区分大小
        const match_func = format.match(/^[a-z_]+/i); // 匹配到 format 中的 函数名
        const match_num = format.match(/\d+$/g); // 匹配到 format 中的参数
        let func: string = "";
        let num: number = 0;
        let res: number | string = value;

        if (match_func) {
            func = match_func[0];
        }
        if (match_num) {
            num = Number.parseInt(match_num[0]);
        }

        if (typeof value === "number") {
            switch (func) {
                case "int":
                    res = this.int(value);
                    break;
                case "fix":
                    res = this.fix(value, num);
                    break;
                case "kmbt":
                    res = this.KMBT(value);
                    break;
                case "per":
                    res = this.per(value, num);
                    break;
                case "sep":
                    res = this.sep(value);
                    break;
                case "time_m":
                    res = this.time_m(value);
                    break;
                case "time_s":
                    res = this.time_s(value);
                    break;
                case "time_ms":
                    res = this.time_ms(value);
                    break;
                case "timestamp":
                    res = this.timeStamp(value);
                    break;
                default:
                    break;
            }
        } else {
            if (func === "limit") {
                res = this.limit(value, num);
            }
        }

        return res as string;
    }

    /**
     * 将数字按分号显示
     * @param value 要格式化的数字
     * @returns 格式化后的字符串
     */
    private sep(value: number): string {
        const num = Math.round(value).toString();
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * 将数字按分显示 00:00 显示 （ms制）
     */
    private time_m(value: number): string {
        const minutes = Math.floor(value / 60000);
        const seconds = Math.floor((value % 60000) / 1000);
        return `${this.padZero(minutes)}:${this.padZero(seconds)}`;
    }

    /**
     * 将数字按秒显示 00:00:00 显示 （ms制）
     */
    private time_s(value: number): string {
        const hours = Math.floor(value / 3600000);
        const minutes = Math.floor((value % 3600000) / 60000);
        const seconds = Math.floor((value % 60000) / 1000);
        return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
    }

    /**
     * 将数字按 0:00:00:000 显示 （ms制）
     */
    private time_ms(value: number): string {
        const hours = Math.floor(value / 3600000);
        const minutes = Math.floor((value % 3600000) / 60000);
        const seconds = Math.floor((value % 60000) / 1000);
        const milliseconds = value % 1000;
        return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}:${this.padZero(milliseconds, 3)}`;
    }

    /**
     * 将时间戳显示为详细的内容
     */
    private timeStamp(value: number): string {
        return new Date(value).toLocaleString();
    }

    /**
     * [value:int] 将取值0~1 变成 1~100,可以指定修饰的小数位数
     */
    private per(value: number, fd: number): string {
        return (value * 100).toFixed(fd);
    }

    /**
     * [value:int] 将取值变成整数
     */
    private int(value: number): number {
        return Math.round(value);
    }

    /**
     * [value:fix2] 数值转换为小数
     */
    private fix(value: number, fd: number): string {
        return value.toFixed(fd);
    }

    /**
     * [value:limit3] 字符串长度限制
     */
    private limit(value: string, count: number): string {
        return value.substring(0, count);
    }

    /**
     * 将数字缩短显示为KMBT单位 大写,目前只支持英文
     */
    private KMBT(value: number, lang: string = "en"): string {
        const counts = lang === "zh" ? [10000, 100000000, 1000000000000, 10000000000000000] : [1000, 1000000, 1000000000, 1000000000000];
        const units = lang === "zh" ? ["", "万", "亿", "兆", "京"] : ["", "K", "M", "B", "T"];
        return this.compressUnit(value, counts, units, 2);
    }

    /**
     * 压缩任意单位的数字，后缀加上单位文字
     */
    private compressUnit(value: number, valueArr: number[], unitArr: string[], fixNum: number = 2): string {
        let res = "";
        for (let i = 0; i < valueArr.length; i++) {
            if (value < valueArr[i]) {
                res = (value / (i === 0 ? 1 : valueArr[i - 1])).toFixed(fixNum) + unitArr[i];
                break;
            }
        }
        return res;
    }

    /**
     * 在数字前补零，确保其具有指定的宽度
     */
    private padZero(num: number, size: number = 2): string {
        const s = `000${num}`;
        return s.substr(s.length - size);
    }
}

/** 格式化处理函数 */
export const StringFormatFunction = new StringFormat();
