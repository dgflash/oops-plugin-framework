import { director, log } from 'cc';
import { JsonOb } from './JsonOb';

const VM_EMIT_HEAD = 'VC:';
const DEBUG_SHOW_PATH = false;

/** 通过 .  路径设置值 */
function setValueFromPath(obj: any, path: string, value: any, tag: string | null = '') {
    const props = path.split('.');
    for (let i = 0; i < props.length; i++) {
        const propName = props[i];
        if (propName in obj === false) {
            console.error('[' + propName + '] not find in ' + tag + '.' + path); break;
        }
        if (i == props.length - 1) {
            obj[propName] = value;
        }
        else {
            obj = obj[propName];
        }
    }
}

/** 通过 . 路径 获取值 */
function getValueFromPath(obj: any, path: string, def?: any, tag: string | null = ''): any {
    const props = path.split('.');
    for (let i = 0; i < props.length; i++) {
        const propName = props[i];
        if ((propName in obj === false)) {
            console.error('[' + propName + '] not find in ' + tag + '.' + path); return def;
        }
        obj = obj[propName];
    }
    if (obj === null || typeof obj === 'undefined') obj = def;//如果g == null 则返回一个默认值
    return obj;
}

/**
 * ModelViewer 类
 */
class ViewModel<T> {
    constructor(data: T, tag: string) {
        this._tag = tag; // 先设置tag
        this.$data = data;
        this._jsonOb = new JsonOb(data, this._callback.bind(this));
    }

    $data: T;

    // 索引值用的标签
    private _tag: string;

    // JsonOb 实例引用，用于销毁时清理
    private _jsonOb: JsonOb<T> | null = null;

    /** 激活状态, 将会通过 director.emit 发送值变动的信号, 适合需要屏蔽的情况 */
    active = true;

    /** 是否激活根路径回调通知, 不激活的情况下 只能监听末端路径值来判断是否变化 */
    emitToRootPath = false;

    // 回调函数
    private _callback(n: any, o: any, path: string[]): void {
        if (this.active == true) {
            const name = VM_EMIT_HEAD + this._tag + '.' + path.join('.');
            if (DEBUG_SHOW_PATH) log('>>', n, o, path);
            // 传递路径数组的副本，防止外部修改
            director.emit(name, n, o, [this._tag, ...path]); // 通知末端路径

            if (this.emitToRootPath) director.emit(VM_EMIT_HEAD + this._tag, n, o, path.slice()); // 通知主路径
        }
    }

    // 通过路径设置数据的方法
    setValue(path: string, value: any) {
        setValueFromPath(this.$data, path, value, this._tag || '');
    }

    // 获取路径的值
    getValue(path: string, def?: any): any {
        return getValueFromPath(this.$data, path, def, this._tag || '');
    }

    // 销毁 ViewModel，释放内存
    destroy() {
        if (this._jsonOb) {
            this._jsonOb.destroy();
            this._jsonOb = null;
        }
        // @ts-ignore
        this.$data = null;
        // @ts-ignore
        this._tag = null;
        this.active = false;
    }
}

/**
 * VM 对象管理器(工厂)
 */
class VMManager {
    private _mvs: Map<string, ViewModel<any>> = new Map<string, ViewModel<any>>();
    
    // 自动管理相关
    private _autoIdCounter = 0;
    private _autoIdPool: number[] = []; // 回收的ID池
    private _componentToTag: WeakMap<any, string> = new WeakMap();

    /**
     * 绑定一个数据，并且可以由VM所管理（绑定的数据只能是值类型）
     * @param data 需要绑定的数据
     * @param tag 对应该数据的标签(用于识别为哪个VM，不允许重复)
     * @param activeRootObject 激活主路径通知，可能会有性能影响，一般不使用
     */
    add<T>(data: T, tag = 'global', activeRootObject = false) {
        const vm = new ViewModel<T>(data, tag);
        const has = this._mvs.get(tag);
        if (tag.includes('.')) {
            console.error('cant write . in tag:', tag);
            return;
        }
        if (has) {
            console.error('already set VM tag:' + tag);
            return;
        }

        vm.emitToRootPath = activeRootObject;

        this._mvs.set(tag, vm);
    }

    /**
     * 移除并且销毁 VM 对象
     * @param tag
     */
    remove(tag: string) {
        const vm = this._mvs.get(tag);
        if (vm) {
            vm.destroy();
            this._mvs.delete(tag);
        }
    }

    /**
     * 获取或回收ID
     */
    private _getAutoId(): number {
        return this._autoIdPool.pop() ?? ++this._autoIdCounter;
    }

    /**
     * 回收ID供复用
     */
    private _recycleAutoId(id: number) {
        if (id > 0) {
            this._autoIdPool.push(id);
        }
    }

    /**
     * 自动管理模式：为组件创建VM，自动生成唯一tag
     * @param data 需要绑定的数据
     * @param component 关联的组件实例
     * @param activeRootObject 激活主路径通知
     * @returns 生成的tag
     */
    addAuto<T>(data: T, component: any, activeRootObject = false): string {
        // 检查是否已经创建过
        const existingTag = this._componentToTag.get(component);
        if (existingTag) {
            console.warn('组件已存在自动 VM，标签：', existingTag);
            return existingTag;
        }

        const id = this._getAutoId();
        const tag = `_vm${id}`; // 短标签: _vm1, _vm2...
        
        const vm = new ViewModel<T>(data, tag);
        vm.emitToRootPath = activeRootObject;
        
        this._mvs.set(tag, vm);
        this._componentToTag.set(component, tag);
        
        return tag;
    }

    /**
     * 自动管理模式：移除组件关联的VM
     * @param component 关联的组件实例
     */
    removeAuto(component: any) {
        const tag = this._componentToTag.get(component);
        if (tag) {
            const vm = this._mvs.get(tag);
            if (vm) {
                vm.destroy();
                this._mvs.delete(tag);
            }
            
            // 回收ID
            const id = parseInt(tag.substring(3)); // 从 "_vm123" 提取 123
            if (!isNaN(id)) {
                this._recycleAutoId(id);
            }
            
            this._componentToTag.delete(component);
        }
    }

    /**
     * 获取组件关联的VM
     * @param component 关联的组件实例
     */
    getAuto<T>(component: any): ViewModel<T> | undefined {
        const tag = this._componentToTag.get(component);
        return tag ? this._mvs.get(tag) : undefined;
    }

    /**
     * 获取组件关联的tag
     * @param component 关联的组件实例
     */
    getAutoTag(component: any): string | undefined {
        return this._componentToTag.get(component);
    }

    /**
     * 获取绑定的数据
     * @param tag 数据tag
     */
    get<T>(tag: string): ViewModel<T> | undefined {
        const res = this._mvs.get(tag);
        return res;
    }

    /**
     * 通过全局路径,而不是 VM 对象来 设置值
     * @param path - 全局取值路径
     * @param value - 需要增加的值
     */
    addValue(path: string, value: any) {
        path = path.trim();//防止空格,自动剔除
        const rs = path.split('.');
        if (rs.length < 2) {
            console.error('Cant find path:' + path);
        };
        const vm = this.get(rs[0]);
        if (!vm) {
            console.error('Cant Set VM:' + rs[0]); return;
        };
        const resPath = rs.slice(1).join('.');
        vm.setValue(resPath, vm.getValue(resPath) + value);
    }

    /**
     * 通过全局路径,而不是 VM 对象来 获取值
     * @param path - 全局取值路径
     * @param def - 如果取不到值的返回的默认值
     */
    getValue(path: string, def?: any): any {
        path = path.trim(); // 防止空格,自动剔除

        if (path === '') return '';

        const rs = path.split('.');
        if (rs.length < 2) {
            console.error('Get Value Cant find path:' + path); return;
        };
        const vm = this.get(rs[0]);
        if (!vm) {
            console.error('Cant Get VM:' + rs[0]); return;
        };
        return vm.getValue(rs.slice(1).join('.'), def);
    }

    /**
     * 通过全局路径,而不是 VM 对象来 设置值
     * @param path - 全局取值路径
     * @param value - 需要设置的值
     */
    setValue(path: string, value: any) {
        path = path.trim(); // 防止空格,自动剔除
        const rs = path.split('.');
        if (rs.length < 2) {
            console.error('Set Value Cant find path:' + path); return;
        };
        const vm = this.get(rs[0]);
        if (!vm) {
            console.error('Cant Set VM:' + rs[0]); return;
        };
        vm.setValue(rs.slice(1).join('.'), value);

    }

    setObjValue = setValueFromPath;
    getObjValue = getValueFromPath;

    /** 等同于 director.on */
    bindPath(path: string, callback: Function, target?: any, useCapture?: boolean): void {
        path = path.trim(); // 防止空格,自动剔除
        if (path == '') {
            console.error(target.node.name, '节点绑定的路径为空');
            return;
        }
        if (path.split('.')[0] === '*') {
            console.error(path, '路径不合法,可能错误覆盖了 VMParent 的onLoad 方法, 或者父节点并未挂载 VMParent 相关的组件脚本');
            return;
        }
        // @ts-ignore
        director.on(VM_EMIT_HEAD + path, callback, target, useCapture);
    }

    /** 等同于 director.off */
    unbindPath(path: string, callback: Function, target?: any): void {
        path = path.trim();//防止空格,自动剔除
        if (path.split('.')[0] === '*') {
            console.error(path, '路径不合法,可能错误覆盖了 VMParent 的onLoad 方法, 或者父节点并未挂载 VMParent 相关的组件脚本');
            return;
        }
        // @ts-ignore
        director.off(VM_EMIT_HEAD + path, callback, target);
    }

    /** 冻结所有标签的 VM，视图将不会受到任何信息 */
    inactive(): void {
        this._mvs.forEach((mv) => {
            mv.active = false;
        });
    }

    /** 激活所有标签的 VM*/
    active(): void {
        this._mvs.forEach((mv) => {
            mv.active = true; // 修复：应该设置为 true
        });
    }
}

/**
 *  VM管理对象,使用文档:
 *  https://gitee.com/dgflash/oops-framework/wikis/pages?sort_id=12037849&doc_id=2873565
 */
export const VM = new VMManager();
