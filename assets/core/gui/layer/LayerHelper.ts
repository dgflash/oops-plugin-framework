import { Layers } from "cc";
import { Node, Widget } from "cc";

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
}