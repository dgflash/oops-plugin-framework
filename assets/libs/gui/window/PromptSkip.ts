import { _decorator, Toggle } from "cc";
import { oops } from "db://oops-framework/core/Oops";
import { GameStorage } from "db://oops-framework/module/common/GameStorage";
import { PromptBase } from "./PromptBase";

const { ccclass, property } = _decorator;

/** 不同类型的提示窗口状态数据 */
var content: any = null;

/** 可设置指定时间内跳过提示 */
@ccclass("PromptSkip")
export class PromptSkip extends PromptBase {
    /** 是否可提示 */
    static isPrompt(id: string): boolean {
        if (content == null) content = oops.storage.getJson(GameStorage.PromptSkip, {});       // 第一次打开窗口从本地数据中获取窗口状态信息

        let r = content[id];
        let c = oops.timer.getClientTime();
        if (r == null || c > r) {
            return true;
        }
        return false;
    }

    protected start(): void {
        // 界面打开，删除昨天调协的不提示时间
        if (content[this.config.id]) {
            delete content[this.config.id];
            oops.storage.set(GameStorage.PromptSkip, JSON.stringify(content));
        }
    }

    /** 设置是否今天日内不提示 */
    private onSetSkip(toggle: Toggle) {
        if (toggle.isChecked) {
            const t = oops.timer.getClientDate();
            t.setDate(t.getDate() + this.config.skipDay);
            t.setHours(0, 0, 0, 0);
            content[this.config.id] = t.getTime();
        }
        else {
            content[this.config.id] = null;
        }
        oops.storage.set(GameStorage.PromptSkip, JSON.stringify(content));
    }
}