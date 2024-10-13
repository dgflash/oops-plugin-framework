/*
 * @Author: dgflash
 * @Date: 2023-07-25 10:44:38
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-25 11:48:52
 */
import { CCString, Component, _decorator, sp } from "cc";
import { EDITOR } from "cc/env";
import { resLoader } from "../../../core/common/loader/ResLoader";
import { LanguageData } from "./LanguageData";

const { ccclass, property, menu } = _decorator;

/** Spine 动画多语言 */
@ccclass("LanguageSpine")
@menu('OopsFramework/Language/LanguageSpine （Spine 动画多语言）')
export class LanguageSpine extends Component {
    @property({ serializable: true })
    private _dataID: string = "";
    @property({ type: CCString, serializable: true })
    get dataID(): string {
        return this._dataID || "";
    }
    set dataID(value: string) {
        this._dataID = value;
        if (!EDITOR) {
            this.updateSpine();
        }
    }

    /** 默认动画名 */
    private _defaultAnimation: string = "";

    onLoad() {
        let spine: sp.Skeleton = this.getComponent(sp.Skeleton)!;
        this._defaultAnimation = spine.animation;
    }

    start() {
        this.updateSpine();
    }

    /** 更新语言 */
    language() {
        this.updateSpine();
    }

    private updateSpine() {
        // 获取语言标记
        let path = `language/spine/${LanguageData.current}/${this.dataID}`;
        let res: sp.SkeletonData | null = resLoader.get(path, sp.SkeletonData);
        if (res) {
            let spine: sp.Skeleton = this.getComponent(sp.Skeleton)!;
            spine.skeletonData = res;
            spine.setAnimation(0, this._defaultAnimation, true);
        }
        else {
            console.error("[LanguageSpine] 资源不存在 " + path);
        }
    }
}