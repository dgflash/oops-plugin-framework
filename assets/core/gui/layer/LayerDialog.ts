import type { Node } from 'cc';
import { LayerPopUp } from './LayerPopup';
import type { UIParam, UIState } from './LayerUIElement';
import type { UIConfig } from './UIConfig';

/** 模式弹窗数据 */
type DialogParam = {
    /** 弹窗唯一编号 */
    uiid: string;
    /** 窗口配置 */
    config: UIConfig;
    /** 窗口附加参数 */
    params?: UIParam;
    /** 轮到它显示后交出节点；在队列里被移除时交出 null */
    resolve: (node: Node) => void;
}

/*
 * 模式弹窗层，该层的窗口同时只能显示一个，删除以后会自动从队列当中取一个弹窗，直到队列为空
 */
export class LayerDialog extends LayerPopUp {
    /** 窗口调用参数队列 */
    private params: Array<DialogParam> = [];

    /**
     * 添加模式窗口
     * 1. 同时添加多个模式窗口时，第一个之后的窗口会先队列起来，在第一个关闭后在加载与显示第二个
     * 2. 排队的窗口，返回的 Promise 要等它真正轮到、加载完成才兑现，拿到的是它自己的节点；
     *    轮到之前被 remove / clear 掉则兑现为 null
     *
     * 早先排队时是立刻把「当前显示的窗」的节点还回去的：`CCEntity.addUi` 拿着别人的节点挂 ECS 组件、
     * 调 `show()` 全都落空，而排队的窗带着 `preload` 标记，轮到它时只登记、不挂到层上 ——
     * 屏上只剩一层遮罩，该层之后的窗也全被它堵住。
     */
    add(uiid: string, config: UIConfig, params?: UIParam): Promise<Node> {
        // 控制同一时间只能显示一个模式窗口；队列非空时也要排到后面，别插到正要轮到的窗前面
        if (this.ui_nodes.size > 0 || this.params.length > 0) {
            return new Promise<Node>(resolve => {
                this.params.push({ uiid: uiid, config: config, params: params, resolve: resolve });
            });
        }
        return this.showDialog(uiid, config, params);
    }

    /** 显示模式弹窗 */
    private showDialog(uiid: string, config: UIConfig, param?: UIParam): Promise<Node> {
        const state = this.initUIConfig(uiid, config, param);
        return this.load(state);
    }

    /** 排队中的窗口也算：它迟早会显示出来，同一个界面不该再开一份 */
    has(prefabPath: string): boolean {
        return super.has(prefabPath) || this.params.some(p => p.config.prefab === prefabPath);
    }

    /**
     * 层上有这个窗（显示中或加载中）就只关它；只在队列里时才从队列删掉（对应的 add 兑现为 null）。
     * 不能两边一起删：同一个预制可以排好几份（连着两条 Alert），关掉第一份走的也是这里，
     * 一起删就把后面那几份也吞了。
     */
    remove(prefabPath: string): void {
        if (super.has(prefabPath)) super.remove(prefabPath);
        else this.dropQueued(p => p.config.prefab === prefabPath);
    }

    /** 队列当中的也删除（对应的 add 兑现为 null） */
    clear(isDestroy: boolean): void {
        this.dropQueued(() => true);
        super.clear(isDestroy);
    }

    private dropQueued(match: (p: DialogParam) => boolean): void {
        const dropped = this.params.filter(match);
        if (dropped.length === 0) return;
        this.params = this.params.filter(p => !match(p));
        for (const p of dropped) p.resolve(null!);
    }

    protected closeUi(state: UIState) {
        super.closeUi(state);
        // 使用 Promise 微任务代替 setTimeout，性能更好且更可靠
        Promise.resolve().then(() => this.next());
    }

    protected closeBlack() {
        if (this.params.length == 0) {
            super.closeBlack();
        }
    }

    private next() {
        // 上一个关掉到这个微任务之间，可能已经有窗直接开起来了（add 时层上恰好是空的）
        if (this.params.length > 0 && this.ui_nodes.size == 0) {
            const param = this.params.shift()!;
            this.showDialog(param.uiid, param.config, param.params).then(param.resolve, () => param.resolve(null!));
        }
    }
}
