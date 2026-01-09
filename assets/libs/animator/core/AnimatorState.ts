import type AnimatorController from './AnimatorController';
import AnimatorTransition from './AnimatorTransition';

/**
 * 状态管理类
 */
export default class AnimatorState {
    private _name = '';
    private _motion = '';
    private _loop = false;
    private _speed = 1;
    private _multi = '';

    private _transitions: AnimatorTransition[] = [];
    private _ac: AnimatorController = null!;

    /** 状态名 */
    get name() {
        return this._name;
    }
    /** 动画名 */
    get motion() {
        return this._motion;
    }
    /** 动画是否循环播放 */
    get loop() {
        return this._loop;
    }
    /** 动画播放速度的混合参数 */
    get multi() {
        return this._multi;
    }
    /** 动画播放速度 */
    get speed() {
        return this._speed;
    }
    set speed(value: number) {
        this._speed = value;
    }

    constructor(data: any, ac: AnimatorController) {
        this._name = data.state;
        this._motion = data.motion || '';
        this._loop = data.loop || false;
        this._speed = data.speed || 1;
        this._multi = data.multiplier || '';

        this._ac = ac;

        for (let i = 0; i < data.transitions.length; i++) {
            const transition: AnimatorTransition = new AnimatorTransition(data.transitions[i], ac);
            if (transition.isValid()) {
                this._transitions.push(transition);
            }
        }
    }

    /**
     * 判断各个分支是否满足条件，满足则转换状态
     */
    checkAndTrans() {
        for (let i = 0; i < this._transitions.length; i++) {
            const transition: AnimatorTransition = this._transitions[i];
            if (transition && transition.check()) {
                transition.doTrans();
                return;
            }
        }
    }
}
