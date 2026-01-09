
import type { Material } from 'cc';
import { CCInteger, Component, Sprite, _decorator } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Ambilight')
/** 流光效果 */
export class Ambilight extends Component {
    @property
        _max = 1;
    @property(CCInteger)
    get max(): number {
        return this._max;
    }
    set max(value: number) {
        this._max = value;
    }

    private _start = 0;
    private _material !: Material;
    private _sprite !: Sprite;

    onLoad() {
        // 缓存组件和材质引用，避免每帧查询
        this._sprite = this.node.getComponent(Sprite)!;
        if (this._sprite) {
            this._material = this._sprite.getMaterial(0)!;
        }
    }

    update(dt: number) {
        if (this._material) {
            this._setShaderTime(dt);
        }
    }

    private _setShaderTime(dt: number) {
        let start = this._start;
        if (start > this.max) start = 0;
        start += 0.015;
        this._material.setProperty('speed', start);

        this._start = start;
    }
}

