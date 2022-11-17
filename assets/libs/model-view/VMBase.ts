import { Component, log, _decorator } from 'cc';
import { DEBUG } from 'cc/env';
import { VM } from './ViewModel';
import { VMEnv } from './VMEnv';

// 用来处理通知数据的层级
// 控制旗下子节点的数据
// 目前只是起到一个识别组件的作用，之后会抽象很多功能在这里面
// player.equips.* 可以自动根据所在父对象的位置设置顺序

const DEBUG_WATCH_PATH: boolean = false;

const { ccclass, help } = _decorator;

/**
 * watchPath 的基础，只提供绑定功能 和 对应的数据更新函数
 */
@ccclass
@help('https://gitee.com/dgflash/oops-framework/blob/master/doc/mvvm/VMBase.md')
export class VMBase extends Component {
    /**VM管理 */
    VM = VM;

    /** watch 单路径  */
    watchPath: string = '';

    /** 是否启用模板多路径模式 */
    templateMode: boolean = false;

    /** watch 多路径 */
    protected watchPathArr: string[] = [];

    /** 储存模板多路径的值 */
    protected templateValueArr: any[] = [];

    /**
     * 如果需要重写onLoad 方法，请根据顺序调用 super.onLoad()，执行默认方法
     */
    onLoad() {
        if (VMEnv.editor) return;

        // 提前拆分、并且解析路径
        let paths = this.watchPath.split('.');
        for (let i = 1; i < paths.length; i++) {
            const p = paths[i];
            // 如果发现了路径使用了 * ，则自动去自己的父节点查找自己所在 index 值
            if (p == '*') {
                let index = this.node.parent!.children.findIndex(n => n === this.node);
                if (index <= 0) index = 0;
                paths[i] = index.toString();
                break;
            }
        }

        // 替换掉原路径
        this.watchPath = paths.join('.');

        // 提前进行路径数组 的 解析
        let pathArr = this.watchPathArr;
        if (pathArr.length >= 1) {
            for (let i = 0; i < pathArr.length; i++) {
                const path = pathArr[i];
                let paths = path.split('.');

                for (let i = 1; i < paths.length; i++) {
                    const p = paths[i];
                    if (p == '*') {
                        let index = this.node.parent!.children.findIndex(n => n === this.node);
                        if (index <= 0) index = 0;
                        paths[i] = index.toString();
                        break;
                    }

                }

                this.watchPathArr[i] = paths.join('.');
            }
        }

        // 打印出所有绑定的路径，方便调试信息
        if (DEBUG_WATCH_PATH && DEBUG) {
            log('所有路径', this.watchPath ? [this.watchPath] : this.watchPathArr, '<<', this.node.parent!.name + '.' + this.node.name)
        }

        if (this.watchPath == '' && this.watchPathArr.join('') == '') {
            log('可能未设置路径的节点:', this.node.parent!.name + '.' + this.node.name);
        }
    }

    onEnable() {
        if (VMEnv.editor) return;

        if (this.templateMode) {
            this.setMultPathEvent(true);
        }
        else if (this.watchPath != '') {
            this.VM.bindPath(this.watchPath, this.onValueChanged, this);
        }

        this.onValueInit();                     // 激活时,调用值初始化
    }

    onDisable() {
        if (VMEnv.editor) return;

        if (this.templateMode) {
            this.setMultPathEvent(false);
        }
        else if (this.watchPath != '') {
            this.VM.unbindPath(this.watchPath, this.onValueChanged, this);
        }
    }

    // 多路径监听方式
    private setMultPathEvent(enabled: boolean = true) {
        if (VMEnv.editor) return;

        let arr = this.watchPathArr;
        for (let i = 0; i < arr.length; i++) {
            const path = arr[i];
            if (enabled) {
                this.VM.bindPath(path, this.onValueChanged, this);
            }
            else {
                this.VM.unbindPath(path, this.onValueChanged, this);
            }
        }
    }

    protected onValueInit() {
        // 虚方法
    }

    /**
     * 值变化事件
     * @param n       新值
     * @param o       旧值
     * @param pathArr 对象路径数组
     */
    protected onValueChanged(n: any, o: any, pathArr: string[]) {

    }
}
