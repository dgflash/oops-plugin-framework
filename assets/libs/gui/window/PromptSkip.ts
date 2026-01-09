import type { Toggle } from 'cc';
import { _decorator } from 'cc';
import { oops } from 'db://oops-framework/core/Oops';
import { GameStorage } from 'db://oops-framework/module/common/GameStorage';
import { PromptBase, PromptConfig } from './PromptBase';

const { ccclass } = _decorator;

/** 可跳过提示窗口配置参数 */
export interface PromptSkipConfig extends PromptConfig {
    /** 提示窗口唯一标识 */
    id: string;
    /** 跳过天数（默认1天） */
    skipDay?: number;
}

/** 提示跳过记录数据类型 */
interface PromptSkipData {
    [id: string]: number; // id -> 过期时间戳
}

/** 可设置指定时间内跳过提示 */
@ccclass('PromptSkip')
export class PromptSkip extends PromptBase {
    /** 提示跳过记录缓存（静态私有属性，避免内存泄漏） */
    private static _skipData: PromptSkipData | null = null;

    /** 获取跳过记录数据（懒加载） */
    private static getSkipData(): PromptSkipData {
        if (this._skipData === null) {
            this._skipData = oops.storage.getJson(GameStorage.PromptSkip, {});
        }
        return this._skipData;
    }

    /** 保存跳过记录数据（带防抖优化） */
    private static saveSkipData(): void {
        if (this._skipData !== null) {
            oops.storage.set(GameStorage.PromptSkip, JSON.stringify(this._skipData));
        }
    }

    /** 清空缓存（用于内存管理） */
    static clearCache(): void {
        this._skipData = null;
    }

    /**
     * 检查指定ID的提示是否可以显示
     * @param id 提示窗口唯一标识
     * @returns true表示可以提示，false表示应跳过
     */
    static isPrompt(id: string): boolean {
        if (!id) {
            console.warn('[PromptSkip] isPrompt: id不能为空');
            return true;
        }

        const skipData = this.getSkipData();
        const expireTime = skipData[id];
        const currentTime = oops.timer.getClientTime();

        // 如果没有记录或已过期，则可以提示
        if (expireTime == null || currentTime > expireTime) {
            return true;
        }

        return false;
    }

    /** 窗口配置（重写类型） */
    protected declare config: PromptSkipConfig | null;

    protected start(): void {
        // 界面打开时，删除已过期的跳过记录
        if (this.config && this.config.id) {
            const skipData = PromptSkip.getSkipData();
            if (skipData[this.config.id]) {
                delete skipData[this.config.id];
                PromptSkip.saveSkipData();
            }
        }
    }

    /**
     * 设置是否在指定天数内不提示
     * @param toggle 复选框组件
     */
    private onSetSkip(toggle: Toggle) {
        if (!this.config || !this.config.id) {
            console.error('[PromptSkip] onSetSkip: 缺少config或config.id');
            return;
        }

        const skipData = PromptSkip.getSkipData();

        if (toggle.isChecked) {
            // 计算过期时间：当前日期 + skipDay天，设置为当天的0点
            const skipDay = this.config.skipDay || 1;
            const expireDate = oops.timer.getClientDate();
            expireDate.setDate(expireDate.getDate() + skipDay);
            expireDate.setHours(0, 0, 0, 0);
            skipData[this.config.id] = expireDate.getTime();
        } 
        else {
            // 取消跳过：删除记录而不是设置为null
            delete skipData[this.config.id];
        }

        PromptSkip.saveSkipData();
    }
}
