/*
 * @Author: dgflash
 * @Date: 2023-07-25 10:44:38
 * @LastEditors: dgflash
 * @LastEditTime: 2023-07-25 11:48:52
 */
import { CCString, Component, _decorator, sp } from 'cc';
import { EDITOR } from 'cc/env';
import { resLoader } from '../../../core/common/loader/ResLoader';
import { LanguageData } from './LanguageData';

const { ccclass, property, menu } = _decorator;

/** Spine 动画多语言 */
@ccclass('LanguageSpine')
@menu('OopsFramework/Language/LanguageSpine （Spine 动画多语言）')
export class LanguageSpine extends Component {
    @property({ serializable: true })
    private _dataID = '';
    @property({ type: CCString, serializable: true })
    get dataID(): string {
        return this._dataID || '';
    }
    set dataID(value: string) {
        this._dataID = value;
        if (!EDITOR) {
            this.updateSpine();
        }
    }

    /** 默认动画名 */
    private _defaultAnimation = '';
    /** 缓存的Spine组件引用 */
    private _spineCache: sp.Skeleton | null = null;
    /** 是否已初始化组件缓存 */
    private _componentInitialized = false;

    onLoad() {
        this._initComponents();
    }

    /** 初始化并缓存组件引用 */
    private _initComponents() {
        if (this._componentInitialized) return;
        
        this._spineCache = this.getComponent(sp.Skeleton);
        if (!this._spineCache) {
            console.error('[LanguageSpine] 该节点没有sp.Skeleton组件');
            this._componentInitialized = true;
            return;
        }

        this._defaultAnimation = this._spineCache.animation;
        this._componentInitialized = true;
    }

    start() {
        this.updateSpine();
    }

    /** 更新语言 */
    language() {
        this.updateSpine();
    }

    private updateSpine() {
        // 确保组件已初始化
        if (!this._componentInitialized) {
            this._initComponents();
        }

        if (!this._spineCache) {
            return;
        }

        // 获取语言标记
        const path = `language/spine/${LanguageData.current}/${this.dataID}`;
        const res: sp.SkeletonData | null = resLoader.get(path, sp.SkeletonData);
        if (res) {
            this._spineCache.skeletonData = res;
            // 检查动画名是否有效
            if (this._defaultAnimation) {
                this._spineCache.setAnimation(0, this._defaultAnimation, true);
            }
        }
        else {
            console.error('[LanguageSpine] 资源不存在 ' + path);
        }
    }

    onDestroy() {
        // 清理缓存引用，帮助垃圾回收
        this._spineCache = null;
        this._defaultAnimation = '';
    }
}
