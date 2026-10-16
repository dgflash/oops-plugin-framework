import { CCInteger, Color, Component, UIRenderer, _decorator } from 'cc';

const { ccclass, property, executeInEditMode, requireComponent, menu } = _decorator;

/** 颜色切换（Label、Sprite 等渲染组件） */
@ccclass
@executeInEditMode
@requireComponent(UIRenderer)
@menu('OopsFramework/UI/Color Index （颜色切换）')
export class BhvColorIndex extends Component {
    @property({
        type: [Color],
        tooltip: '渲染组件将会用到的颜色'
    })
        colors: Array<Color> = [Color.WHITE];

    @property({
        type: CCInteger,
        tooltip: '当前显示的颜色'
    })
    get index() {
        return this._index;
    }
    set index(value: number) {
        if (value < 0) return;
        this._index = value % this.colors.length;
        this.node.getComponent(UIRenderer)!.color = this.colors[this._index];
    }

    @property
    private _index = 0;

    next() {
        this.index++;
    }

    previous() {
        this.index--;
    }
}
