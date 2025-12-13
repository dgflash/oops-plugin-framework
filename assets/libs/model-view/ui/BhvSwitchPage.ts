import type { Node } from 'cc';
import { CCInteger, Component, _decorator } from 'cc';
import { VMEnv } from '../VMEnv';

const { ccclass, property, executeInEditMode, menu } = _decorator;

/** 页面切换 */
@ccclass
@executeInEditMode
@menu('OopsFramework/UI/Switch Page （页面切换）')
export class BhvSwitchPage extends Component {
    @property
        isLoopPage = false;

    @property
    private _index = 0;
    get index(): number {
        return this._index;
    }
    @property({
        type: CCInteger
    })
    set index(v: number) {
        if (this.isChanging) return;
        v = Math.round(v);
        const count = this.node.children.length - 1;

        if (this.isLoopPage) {
            if (v > count) v = 0;
            if (v < 0) v = count;
        }
        else {
            if (v > count) v = count;
            if (v < 0) v = 0;
        }
        this.preIndex = this._index;//标记之前的页面
        this._index = v;

        if (VMEnv.editor) {
            this._updateEditorPage(v);
        }
        else {
            this._updatePage(v);
        }
    }

    private preIndex = 0;

    //判断是否在 changing 页面状态

    private _isChanging = false;
    /**只读，是否在changing 的状态 */
    get isChanging(): boolean {
        return this._isChanging;
    }

    onLoad() {
        this.preIndex = this.index;
    }

    private _updateEditorPage(page: number) {
        if (!VMEnv.editor) return;

        const children = this.node.children;
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            if (i == page) {
                node.active = true;
            }
            else {
                node.active = false;
            }
        }
    }

    private _updatePage(page: number) {
        const children = this.node.children;
        const preIndex = this.preIndex;
        const curIndex = this.index;
        if (preIndex === curIndex) return;//没有改变就不进行操作

        const preNode: Node = children[preIndex];//旧节点
        const showNode: Node = children[curIndex];//新节点

        preNode.active = false;
        showNode.active = true;
    }

    next(): boolean {
        if (this.isChanging) {
            return false;
        }
        else {
            this.index++;
            return true;
        }
    }

    previous(): boolean {
        if (this.isChanging) {
            return false;
        }
        else {
            this.index--;
            return true;
        }
    }

    setEventIndex(e: any, index: any): boolean {
        if (this.index >= 0 && this.index != null && this.isChanging === false) {
            this.index = index;
            return true;
        }
        else {
            return false;
        }
    }
}
