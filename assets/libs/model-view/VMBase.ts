import { _decorator, Component, log } from 'cc';
import { DEBUG } from 'cc/env';
import { VM } from './ViewModel';
import { VMEnv } from './VMEnv';

// 用来处理通知数据的层级
// 控制旗下子节点的数据
// 目前只是起到一个识别组件的作用，之后会抽象很多功能在这里面
// player.equips.* 可以自动根据所在父对象的位置设置顺序

const DEBUG_WATCH_PATH = false;

const { ccclass, help } = _decorator;

/**
 * watchPath 的基础，只提供绑定功能 和 对应的数据更新函数
 */
@ccclass
@help('https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037631&doc_id=2873565')
export class VMBase extends Component {
    /**VM管理 */
    VM = VM;

    /** watch 单路径  */
    watchPath = '';

    /** 是否启用模板多路径模式 */
    templateMode = false;

    /** watch 多路径 */
    watchPathArr: string[] = [];

    /** 储存模板多路径的值 */
    protected templateValueArr: any[] = [];

    /** 缓存解析后的路径，避免重复解析 */
    private _parsedPath: string = '';
    private _parsedPathArr: string[] = [];
    private _pathParsed: boolean = false;

    /**
     * 快速获取节点在父节点中的索引（优化版）
     */
    private getNodeIndex(): number {
        if (!this.node.parent) return 0;
        
        const children = this.node.parent.children;
        const len = children.length;
        
        // 使用传统for循环代替findIndex，性能更好
        for (let i = 0; i < len; i++) {
            if (children[i] === this.node) {
                return i;
            }
        }
        return 0;
    }

    /**
     * 解析单个路径中的通配符
     */
    private parsePath(path: string): string {
        // 快速检查是否包含通配符，避免不必要的split操作
        if (path.indexOf('*') === -1) {
            return path;
        }

        const paths = path.split('.');
        for (let i = 1; i < paths.length; i++) {
            if (paths[i] === '*') {
                paths[i] = this.getNodeIndex().toString();
                break; // 只处理第一个通配符
            }
        }
        return paths.join('.');
    }

    /**
     * 延迟解析路径，只在首次使用时解析
     */
    private ensurePathParsed() {
        if (this._pathParsed) return;
        
        this._pathParsed = true;

        // 解析单路径
        if (this.watchPath) {
            this._parsedPath = this.parsePath(this.watchPath);
        }

        // 解析多路径
        if (this.watchPathArr.length > 0) {
            this._parsedPathArr = new Array(this.watchPathArr.length);
            for (let i = 0; i < this.watchPathArr.length; i++) {
                this._parsedPathArr[i] = this.parsePath(this.watchPathArr[i]);
            }
        }

        // 打印调试信息
        if (DEBUG_WATCH_PATH && DEBUG) {
            log('所有路径', this._parsedPath ? [this._parsedPath] : this._parsedPathArr, '<<', this.node.parent!.name + '.' + this.node.name);
        }

        if (!this._parsedPath && this._parsedPathArr.join('') === '') {
            log('可能未设置路径的节点:', this.node.parent!.name + '.' + this.node.name);
        }
    }

    /**
     * 获取解析后的单路径
     */
    private getParsedPath(): string {
        this.ensurePathParsed();
        return this._parsedPath;
    }

    /**
     * 获取解析后的多路径数组
     */
    private getParsedPathArr(): string[] {
        this.ensurePathParsed();
        return this._parsedPathArr;
    }

    /**
     * 如果需要重写onLoad 方法，请根据顺序调用 super.onLoad()，执行默认方法
     */
    onLoad() {
        if (VMEnv.editor) return;
        // onLoad中不再进行路径解析，延迟到onEnable时才解析
    }

    onEnable() {
        if (VMEnv.editor) return;

        if (this.templateMode) {
            this.setMultPathEvent(true);
        }
        else if (this.watchPath != '') {
            const parsedPath = this.getParsedPath();
            this.VM.bindPath(parsedPath, this.onValueChanged, this);
        }

        this.onValueInit(); // 激活时,调用值初始化
    }

    onDisable() {
        if (VMEnv.editor) return;

        if (this.templateMode) {
            this.setMultPathEvent(false);
        }
        else if (this.watchPath != '') {
            const parsedPath = this.getParsedPath();
            this.VM.unbindPath(parsedPath, this.onValueChanged, this);
        }
    }

    // 多路径监听方式
    private setMultPathEvent(enabled = true) {
        if (VMEnv.editor) return;

        const arr = this.getParsedPathArr();
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
