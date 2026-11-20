import { Layers } from 'cc';
import type { Node } from 'cc';
import { Widget } from 'cc';

/** 界面层辅助工具 */
export class LayerHelper {
    /**
     * 界面层全屏布局
     * @param node 全屏布局的节点
     */
    static setFullScreen(node: Node) {
        const widget: Widget = node.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;
        widget.alignMode = 2;
        widget.enabled = true;

        node.layer = Layers.Enum.UI_2D;
        return widget;
    }

    /**
     * 节点重新挂上界面层时，让它和子孙的 Widget 按现在的尺寸重排。
     * 引擎的坑：节点摘下期间窗口改了尺寸（拖窗口、进出全屏、转屏），挂回来时 Widget 不会被标脏，一直停在旧尺寸
     * （复用的弹窗遮罩、缓存的界面、转圈层都是摘下再挂回）。
     */
    static realign(node: Node) {
        for (const widget of node.getComponentsInChildren(Widget)) widget.setDirty();
    }
}
