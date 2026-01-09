/*
 * @Author: dgflash
 * @Date: 2023-01-19 10:33:49
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-19 14:37:19
 */
import { Component, game } from 'cc';
import { StringUtil } from '../../utils/StringUtil';
import { Timer } from './Timer';

/** 定时器数据接口 */
interface ITimer<T = Record<string, number>> {
    /** 倒计时编号 */
    id: string;
    /** 定时器 */
    timer: Timer;
    /** 数据对象 - 必须包含数字类型的字段 */
    object: T;
    /** 修改数据对象的字段 */
    field: keyof T;
    /** 事件侦听器的目标和被叫方 */
    target: object;
    /** 开始时间 */
    startTime: number;
    /** 每秒触发事件 */
    onSeconds: Function[] | null;
    /** 时间完成事件 */
    onCompletes: Function[] | null;
}

/** 时间管理 */
export class TimerManager extends Component {
    /** 倒计时数据 - 使用 Map 提高性能 */
    private times: Map<string, ITimer<Record<string, number>>> = new Map();
    /** 服务器时间 - 复用对象减少 GC */
    private date_s: Date = new Date();
    /** 服务器初始时间 */
    private date_s_start: Date = new Date();
    /** 服务器时间后修正时间 */
    private polymeric_s = 0;
    /** 客户端时间 - 复用对象减少 GC */
    private date_c: Date = new Date();
    /** 待删除的定时器 ID 缓存池，避免遍历时删除 */
    private pendingRemove: string[] = [];
    /** ITimer 对象池，减少对象创建开销 */
    private timerPool: ITimer<Record<string, number>>[] = [];

    /** 后台管理倒计时完成事件 */
    protected update(dt: number): void {
        // 清空待删除列表
        this.pendingRemove.length = 0;

        // 使用 for...of 遍历 Map.values()，性能优于 forEach
        for (const data of this.times.values()) {
            const timer = data.timer;
            if (timer.update(dt)) {
                const value = data.object[data.field];
                if (value > 0) {
                    data.object[data.field] = value - 1;
                    const newValue = data.object[data.field];

                    // 倒计时结束触发
                    if (newValue === 0) {
                        this.pendingRemove.push(data.id);
                        this.onTimerComplete(data);
                    }
                    // 触发每秒回调事件
                    else if (data.onSeconds && data.onSeconds.length > 0) {
                        // 使用 for 循环替代 forEach，减少函数调用开销
                        const callbacks = data.onSeconds;
                        const len = callbacks.length;
                        for (let i = 0; i < len; i++) {
                            callbacks[i].call(data.object);
                        }
                    }
                }
            }
        }

        // 延迟删除已完成的定时器，避免遍历时修改 Map
        if (this.pendingRemove.length > 0) {
            for (let i = 0; i < this.pendingRemove.length; i++) {
                this.times.delete(this.pendingRemove[i]);
            }
        }
    }

    /** 触发倒计时完成事件 */
    private onTimerComplete(data: ITimer<Record<string, number>>): void {
        if (data.onCompletes && data.onCompletes.length > 0) {
            // 使用 for 循环替代 forEach，减少函数调用开销
            const callbacks = data.onCompletes;
            const len = callbacks.length;
            for (let i = 0; i < len; i++) {
                callbacks[i].call(data.target, data.object);
            }
        }
        // 清理内存
        this.cleanupTimer(data);
    }

    /** 清理定时器相关引用，防止内存泄漏 */
    private cleanupTimer(data: ITimer<Record<string, number>>): void {
        if (data.timer) {
            data.timer.destroy();
            data.timer = null!;
        }
        // 清空回调数组并回收到对象池
        if (data.onSeconds) {
            data.onSeconds.length = 0;
            data.onSeconds = null;
        }
        if (data.onCompletes) {
            data.onCompletes.length = 0;
            data.onCompletes = null;
        }
        // 清空引用
        data.object = null!;
        data.target = null!;

        // 回收 ITimer 对象到对象池（限制池大小避免内存浪费）
        if (this.timerPool.length < 50) {
            this.timerPool.push(data);
        }
    }

    /** 从对象池获取或创建新的 ITimer 对象 */
    private acquireTimer<T extends Record<string, number>>(): ITimer<T> {
        if (this.timerPool.length > 0) {
            // 从对象池获取时需要类型断言，因为池中的对象会被重新赋值
            return this.timerPool.pop() as unknown as ITimer<T>;
        }
        // 创建新对象
        return {
            id: '',
            timer: null!,
            object: null!,
            field: '' as keyof T,
            target: null!,
            startTime: 0,
            onSeconds: null,
            onCompletes: null
        };
    }

    /**
     * 在指定对象上注册一个倒计时的回调管理器
     * @template T 数据对象类型，必须包含数字类型的字段
     * @param object        注册定时器的对象（必须包含可数字递减的字段）
     * @param field         时间字段名（必须是 object 中数字类型的字段）
     * @param target        触发事件的对象
     * @param onSecond      每秒事件回调
     * @param onComplete    倒计时完成事件回调
     * @returns 倒计时编号
     * @example
    export class Test extends Component {
        private timeId!: string;
        private data = { countDown: 10 };

        start() {
            // 在指定对象上注册一个倒计时的回调管理器
            this.timeId = oops.timer.register(this.data, "countDown", this, this.onSecond, this.onComplete);
        }

        private onSecond() {
            console.log("每秒触发一次");
        }

        private onComplete() {
            console.log("倒计时完成触发");
        }
    }
     */
    register<T extends Record<string, number>>(
        object: T,
        field: keyof T,
        target: object,
        onSecond?: Function,
        onComplete?: Function
    ): string {
        const timer = new Timer();
        timer.step = 1;

        // 从对象池获取 ITimer 对象
        const data = this.acquireTimer<T>();
        data.id = StringUtil.guid();
        data.timer = timer;
        data.object = object;
        data.field = field;
        data.target = target;
        data.startTime = this.getTime();

        // 只在需要时创建数组，减少内存分配
        if (onSecond) {
            data.onSeconds = data.onSeconds || [];
            data.onSeconds.push(onSecond);
        }
        else {
            data.onSeconds = null;
        }

        if (onComplete) {
            data.onCompletes = data.onCompletes || [];
            data.onCompletes.push(onComplete);
        }
        else {
            data.onCompletes = null;
        }

        // 类型断言：将泛型类型转换为通用类型存储
        this.times.set(data.id, data as unknown as ITimer<Record<string, number>>);
        return data.id;
    }

    /**
     * 为指定倒计时添加回调事件
     * @param id            倒计时编号
     * @param onSecond      每秒事件
     * @param onComplete    倒计时完成事件
     */
    addCallback(id: string, onSecond?: Function, onComplete?: Function): void {
        const data = this.times.get(id);
        if (data) {
            // 检查回调是否已存在，避免重复添加
            if (onSecond) {
                if (!data.onSeconds) {
                    data.onSeconds = [];
                }
                if (!data.onSeconds.includes(onSecond)) {
                    data.onSeconds.push(onSecond);
                }
            }
            if (onComplete) {
                if (!data.onCompletes) {
                    data.onCompletes = [];
                }
                if (!data.onCompletes.includes(onComplete)) {
                    data.onCompletes.push(onComplete);
                }
            }
        }
    }

    /**
     * 移除指定倒计时的回调事件
     * @param id            倒计时编号
     * @param onSecond      要移除的每秒事件
     * @param onComplete    要移除的倒计时完成事件
     */
    removeCallback(id: string, onSecond?: Function, onComplete?: Function): void {
        const data = this.times.get(id);
        if (data) {
            if (onSecond && data.onSeconds) {
                const index = data.onSeconds.indexOf(onSecond);
                if (index > -1) {
                    data.onSeconds.splice(index, 1);
                }
            }
            if (onComplete && data.onCompletes) {
                const index = data.onCompletes.indexOf(onComplete);
                if (index > -1) {
                    data.onCompletes.splice(index, 1);
                }
            }
        }
    }

    /**
     * 在指定对象上注销一个倒计时的回调管理器
     * @param id         时间对象唯一表示
     * @example
    export class Test extends Component {
        private timeId!: string;

        start() {
            this.timeId = oops.timer.register(this, "countDown", this.onSecond, this.onComplete);
        }

        onDestroy() {
            // 在指定对象上注销一个倒计时的回调管理器
            oops.timer.unRegister(this.timeId);
        }
    }
     */
    unRegister(id: string): void {
        const data = this.times.get(id);
        if (data) {
            this.cleanupTimer(data);
            this.times.delete(id);
        }
    }

    /**
     * 检查指定 id 的定时器是否存在
     * @param id 倒计时编号
     */
    has(id: string): boolean {
        return this.times.has(id);
    }

    /**
     * 获取当前活跃的定时器数量
     */
    getTimerCount(): number {
        return this.times.size;
    }

    /**
     * 服务器时间与本地时间同步
     * @param value   服务器时间刻度
     */
    setServerTime(value: number): void {
        this.polymeric_s = this.getTime();
        this.date_s_start.setTime(value);
    }

    /** 获取写服务器同步的时间刻度 */
    getServerTime(): number {
        return this.date_s_start.getTime() + this.getTime() - this.polymeric_s;
    }

    /** 获取服务器时间对象 */
    getServerDate(): Date {
        this.date_s.setTime(this.getServerTime());
        return this.date_s;
    }

    /** 获取本地时间刻度 */
    getClientTime(): number {
        return Date.now();
    }

    /** 获取本地时间对象 */
    getClientDate(): Date {
        this.date_c.setTime(this.getClientTime());
        return this.date_c;
    }

    /** 获取游戏开始到现在逝去的时间 */
    getTime(): number {
        return game.totalTime;
    }

    /** 游戏最小化时记录时间数据 */
    save(): void {
        const currentTime = this.getTime();
        // 使用 for...of 替代 forEach，提高性能
        for (const data of this.times.values()) {
            data.startTime = currentTime;
        }
    }

    /** 游戏最大化时恢复时间数据 */
    load(): void {
        const currentTime = this.getTime();
        // 清空待删除列表
        this.pendingRemove.length = 0;

        // 使用 for...of 替代 forEach，提高性能
        for (const data of this.times.values()) {
            const interval = Math.floor((currentTime - (data.startTime || currentTime)) / 1000);
            const currentValue = data.object[data.field];
            data.object[data.field] = currentValue - interval;

            if (data.object[data.field] <= 0) {
                data.object[data.field] = 0;
                this.pendingRemove.push(data.id);
                this.onTimerComplete(data);
            }
        }

        // 延迟删除已完成的定时器
        if (this.pendingRemove.length > 0) {
            for (let i = 0; i < this.pendingRemove.length; i++) {
                this.times.delete(this.pendingRemove[i]);
            }
        }
    }

    /**
     * 清理所有定时器，释放内存
     * 注意：此方法会清除所有正在运行的定时器
     */
    clear(): void {
        // 使用 for...of 替代 forEach，提高性能
        for (const data of this.times.values()) {
            this.cleanupTimer(data);
        }
        this.times.clear();

        // 清空待删除列表
        this.pendingRemove.length = 0;
    }

    /**
     * 组件销毁时清理所有资源
     */
    protected onDestroy(): void {
        this.clear();

        // 清理对象池
        this.timerPool.length = 0;
    }
}