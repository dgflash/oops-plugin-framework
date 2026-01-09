/*
 * @Author: dgflash
 * @Date: 2021-11-24 15:51:01
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 10:04:57
 */
import type { Size } from 'cc';
import { CCString, Component, Sprite, SpriteFrame, UITransform, _decorator } from 'cc';
import { EDITOR } from 'cc/env';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { LanguageData } from './LanguageData';

const { ccclass, property, menu } = _decorator;

/** 图片多语言 */
@ccclass('LanguageSprite')
@menu('OopsFramework/Language/LanguageSprite （图片多语言）')
export class LanguageSprite extends Component {
    @property({ serializable: true })
    private _dataID = '';
    @property({ type: CCString, serializable: true })
    get dataID(): string {
        return this._dataID || '';
    }
    set dataID(value: string) {
        this._dataID = value;
        if (!EDITOR) {
            this.updateSprite();
        }
    }

    @property({
        tooltip: '是否设置为图片原始资源大小'
    })
    private isRawSize = true;

    /** 缓存的Sprite组件引用 */
    private _spriteCache: Sprite | null = null;
    /** 缓存的UITransform组件引用 */
    private _uiTransformCache: UITransform | null = null;
    /** 是否已初始化组件缓存 */
    private _componentInitialized = false;

    onLoad() {
        this._initComponents();
    }

    /** 初始化并缓存组件引用 */
    private _initComponents() {
        if (this._componentInitialized) return;
        
        this._spriteCache = this.getComponent(Sprite);
        if (!this._spriteCache) {
            console.error('[LanguageSprite] 该节点没有cc.Sprite组件');
            this._componentInitialized = true;
            return;
        }

        if (this.isRawSize) {
            this._uiTransformCache = this.getComponent(UITransform);
            if (!this._uiTransformCache) {
                console.warn('[LanguageSprite] 该节点没有cc.UITransform组件，无法设置原始大小');
            }
        }
        
        this._componentInitialized = true;
    }

    start() {
        this.updateSprite();
    }

    /** 更新语言 */
    language() {
        this.updateSprite();
    }

    private updateSprite() {
        // 确保组件已初始化
        if (!this._componentInitialized) {
            this._initComponents();
        }

        if (!this._spriteCache) {
            return;
        }

        // 获取语言标记
        const path = `language/texture/${LanguageData.current}/${this.dataID}/spriteFrame`;
        const res: SpriteFrame | null = resLoader.get(path, SpriteFrame);
        if (res) {
            this._spriteCache.spriteFrame = res;

            /** 修改节点为原始图片资源大小 */
            if (this.isRawSize && this._uiTransformCache) {
                // 使用公开的API获取原始尺寸
                const rawSize = res.originalSize;
                if (rawSize) {
                    this._uiTransformCache.setContentSize(rawSize);
                }
            }
        }
        else {
            console.error('[LanguageSprite] 资源不存在 ' + path);
        }
    }

    onDestroy() {
        // 清理缓存引用，帮助垃圾回收
        this._spriteCache = null;
        this._uiTransformCache = null;
    }
}
