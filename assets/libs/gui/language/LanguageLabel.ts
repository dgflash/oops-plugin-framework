import type { TTFFont } from 'cc';
import { CCString, Component, Label, RichText, _decorator, warn } from 'cc';
import { EDITOR } from 'cc/env';
import { LanguageData } from './LanguageData';

const { ccclass, property, menu } = _decorator;

@ccclass('LangLabelParamsItem')
export class LangLabelParamsItem {
    @property
        key = '';
    @property
        value = '';
}

/** 文本多语言 */
@ccclass('LanguageLabel')
@menu('OopsFramework/Language/LanguageLabel （文本多语言）')
export class LanguageLabel extends Component {
    @property({
        type: LangLabelParamsItem,
        displayName: 'params'
    })
    private _params: Array<LangLabelParamsItem> = [];

    @property({
        type: LangLabelParamsItem,
        displayName: 'params'
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
    private _dataID = '';
    @property({ type: CCString, serializable: true })
    get dataID(): string {
        return this._dataID || '';
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
                _string = _string.replace(`%{${item.key}}`, item.value);
            });
        }
        if (!_string) {
            warn('[LanguageLabel] 未找到语言标识，使用dataID替换');
            _string = this._dataID;
        }
        return _string;
    }

    /** 更新语言 */
    language() {
        this._needUpdate = true;
    }

    /** 初始字体尺寸 */
    initFontSize = 0;

    /** 缓存的Label组件引用 */
    private _labelCache: Label | null = null;
    /** 缓存的RichText组件引用 */
    private _richTextCache: RichText | null = null;
    /** 是否已初始化组件缓存 */
    private _componentInitialized = false;

    private _needUpdate = false;

    onLoad() {
        this._initComponents();
        this._needUpdate = true;
    }

    /** 初始化并缓存组件引用 */
    private _initComponents() {
        if (this._componentInitialized) return;
        
        this._labelCache = this.getComponent(Label);
        this._richTextCache = this.getComponent(RichText);
        this._componentInitialized = true;

        if (!this._labelCache && !this._richTextCache) {
            warn('[LanguageLabel] 该节点没有cc.Label || cc.RichText组件');
        }
    }

    /**
     * 修改多语言参数，采用惰性求值策略
     * @param key 对于i18n表里面的key值
     * @param value 替换的文本
     */
    setVars(key: string, value: string) {
        let haskey = false;
        // 优化：找到后立即退出循环
        for (let i = 0; i < this._params.length; i++) {
            const element: LangLabelParamsItem = this._params[i];
            if (element.key === key) {
                element.value = value;
                haskey = true;
                break; // 找到后立即退出
            }
        }
        if (!haskey) {
            const ii = new LangLabelParamsItem();
            ii.key = key;
            ii.value = value;
            this._params.push(ii);
        }
        this._needUpdate = true;
    }

    update() {
        if (this._needUpdate) {
            this.updateContent();
            this._needUpdate = false;
        }
    }

    updateContent() {
        // 确保组件已初始化
        if (!this._componentInitialized) {
            this._initComponents();
        }

        const font: TTFFont | null = LanguageData.font;

        // 使用缓存的组件引用，避免重复调用getComponent
        if (this._labelCache) {
            if (font) {
                this._labelCache.font = font;
            }
            this._labelCache.string = this.string;
            this.initFontSize = this._labelCache.fontSize;
        }
        else if (this._richTextCache) {
            if (font) {
                this._richTextCache.font = font;
            }
            this._richTextCache.string = this.string;
            this.initFontSize = this._richTextCache.fontSize;
        }
    }

    onDestroy() {
        // 清理缓存引用，帮助垃圾回收
        this._labelCache = null;
        this._richTextCache = null;
        this._params = [];
    }
}
