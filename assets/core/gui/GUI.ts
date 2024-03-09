/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-19 14:52:40
 */
import { Component, ResolutionPolicy, UITransform, _decorator, math, screen, view } from "cc";
import { oops } from "../Oops";

const { ccclass } = _decorator;

/** 游戏界面屏幕自适应管理 */
@ccclass('GUI')
export class GUI extends Component {
    /** 是否为竖屏显示 */
    portrait!: boolean;

    /** 竖屏设计尺寸 */
    private portraitDrz: math.Size = null!;
    /** 横屏设计尺寸 */
    private landscapeDrz: math.Size = null!;
    /** 界面层矩形信息组件 */
    private transform: UITransform = null!;

    onLoad() {
        this.init();
    }

    /** 初始化引擎 */
    protected init() {
        this.transform = this.getComponent(UITransform)!;

        if (view.getDesignResolutionSize().width > view.getDesignResolutionSize().height) {
            this.landscapeDrz = view.getDesignResolutionSize();
            this.portraitDrz = new math.Size(this.landscapeDrz.height, this.landscapeDrz.width);
        }
        else {
            this.portraitDrz = view.getDesignResolutionSize();
            this.landscapeDrz = new math.Size(this.portraitDrz.height, this.portraitDrz.width);
        }

        this.resize();
    }

    /** 游戏画布尺寸变化 */
    resize() {
        let dr;
        if (view.getDesignResolutionSize().width > view.getDesignResolutionSize().height) {
            dr = this.landscapeDrz;
        }
        else {
            dr = this.portraitDrz
        }

        var s = screen.windowSize;
        var rw = s.width;
        var rh = s.height;
        var finalW = rw;
        var finalH = rh;

        if ((rw / rh) > (dr.width / dr.height)) {
            // 如果更长，则用定高
            finalH = dr.height;
            finalW = finalH * rw / rh;
            this.portrait = false;
        }
        else {
            // 如果更短，则用定宽
            finalW = dr.width;
            finalH = finalW * rh / rw;
            this.portrait = true;
        }

        // 手工修改canvas和设计分辨率，这样反复调用也能生效。
        view.setDesignResolutionSize(finalW, finalH, ResolutionPolicy.UNKNOWN);
        this.transform!.width = finalW;
        this.transform!.height = finalH;

        oops.log.logView(dr, "设计尺寸");
        oops.log.logView(s, "屏幕尺寸");
    }
}