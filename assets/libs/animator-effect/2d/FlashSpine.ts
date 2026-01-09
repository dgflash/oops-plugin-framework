import { Component, Material, sp, _decorator } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FlashSpine')
export default class FlashSpine extends Component {
    duration = 0.5;
    _median = 0;
    _time = 0;

    _material: Material = null!;
    _skeleton: sp.Skeleton = null!;
    _customMaterial: Material = null!;

    onLoad() {
        this._median = this.duration / 2;
        // 获取材质
        this._skeleton = this.node.getComponent(sp.Skeleton)!;
        this._material = this._skeleton.customMaterial!;
        
        // 创建一个自定义材质副本，只创建一次
        this._customMaterial = new Material();
        this._customMaterial.copy(this._material);
        this._skeleton.customMaterial = this._customMaterial;
        
        // 设置材质对应的属性
        this._customMaterial.setProperty('u_rate', 1);
    }

    update(dt: number) {
        if (this._time > 0) {
            this._time -= dt;

            this._time = this._time < 0 ? 0 : this._time;
            const rate = Math.abs(this._time - this._median) * 2 / this.duration;
            
            // 直接更新已有材质的属性，不再每帧创建新材质
            this._customMaterial.setProperty('u_rate', rate);
        }
    }

    onDestroy() {
        // 释放自定义材质
        if (this._customMaterial) {
            this._customMaterial.destroy();
        }
    }

    clickFlash() {
        this._time = this.duration;
    }
}
