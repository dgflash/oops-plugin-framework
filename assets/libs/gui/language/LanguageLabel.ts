import { CCString, Component, Label, RichText, TTFFont, _decorator, warn } from "cc";
import { EDITOR } from "cc/env";
import { LanguageData } from "./LanguageData";

const { ccclass, property, menu } = _decorator;

@ccclass("LangLabelParamsItem")
export class LangLabelParamsItem {
    @property
    key: string = "";
    @property
    value: string = "";
}

/** 文本多语言 */
@ccclass("LanguageLabel")
@menu('OopsFramework/Language/LanguageLabel （文本多语言）')
export class LanguageLabel extends Component {
    @property({
        type: LangLabelParamsItem,
        displayName: "params"
    })
    private _params: Array<LangLabelParamsItem> = [];

    @property({
        type: LangLabelParamsItem,
        displayName: "params"
    })
    set params(value: Array<LangLabelParamsItem>) {
        this._params = value;
        if (!EDITOR) {
            this._needUpdate = true;
        }
    }
    get params(): Array<LangLabelParamsItem> {
        return this._params || [];
    }

    @property({ serializable: true })
    private _dataID: string = "";
    @property({ type: CCString, serializable: true })
    get dataID(): string {
        return this._dataID || "";
    }
    set dataID(value: string) {
        this._dataID = value;
        if (!EDITOR) {
            this._needUpdate = true;
        }
    }

    get string(): string {
        let _string = LanguageData.getLangByID(this._dataID);
        if (_string && this._params.length > 0) {
            this._params.forEach((item: LangLabelParamsItem) => {
                _string = _string.replace(`%{${item.key}}`, item.value)
            })
        }
        if (!_string) {
            warn("[LanguageLabel] 未找到语言标识，使用dataID替换");
            _string = this._dataID;
        }
        return _string;
    }

    /** 更新语言 */
    language() {
        this._needUpdate = true;
    }

    /** 初始字体尺寸 */
    initFontSize: number = 0;

    onLoad() {
        this._needUpdate = true;
    }

    /**
     * 修改多语言参数，采用惰性求值策略
     * @param key 对于i18n表里面的key值
     * @param value 替换的文本
     */
    setVars(key: string, value: string) {
        let haskey = false;
        for (let i = 0; i < this._params.length; i++) {
            let element: LangLabelParamsItem = this._params[i];
            if (element.key === key) {
                element.value = value;
                haskey = true;
            }
        }
        if (!haskey) {
            let ii = new LangLabelParamsItem();
            ii.key = key;
            ii.value = value;
            this._params.push(ii);
        }
        this._needUpdate = true;
    }
    private _needUpdate: boolean = false;

    update() {
        if (this._needUpdate) {
            this.updateContent();
            this._needUpdate = false;
        }
    }

    updateContent() {
        const label = this.getComponent(Label);
        const richtext = this.getComponent(RichText);
        const font: TTFFont | null = LanguageData.font;

        if (label) {
            if (font) {
                label.font = font;
            }
            label.string = this.string;
            this.initFontSize = label.fontSize;
        }
        else if (richtext) {
            if (font) {
                richtext.font = font;
            }
            richtext.string = this.string;
            this.initFontSize = richtext.fontSize;
        }
        else {
            warn("[LanguageLabel], 该节点没有cc.Label || cc.RichText组件");
        }
    }
}
