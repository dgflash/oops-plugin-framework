import { Component, Material, sp, _decorator } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FlashSpine')
export default class FlashSpine extends Component {
    duration = 0.5;
    _median = 0;
    _time = 0;

    _material: Material = null!;
    _skeleton: sp.Skeleton = null!;

    onLoad() {
        this._median = this.duration / 2;
        // 获取材质
        this._skeleton = this.node.getComponent(sp.Skeleton)!;
        this._material = this._skeleton.customMaterial!;
        // 设置材质对应的属性
        this._material.setProperty('u_rate', 1);
    }

    update(dt: number) {
        if (this._time > 0) {
            this._time -= dt;

            this._time = this._time < 0 ? 0 : this._time;
            const rate = Math.abs(this._time - this._median) * 2 / this.duration;

            const mat = new Material();
            mat.copy(this._material);
            this._skeleton.customMaterial = mat;
            mat.setProperty('u_rate', rate);
        }
    }

    clickFlash() {
        this._time = this.duration;
    }
}
