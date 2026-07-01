import type { EventTouch } from 'cc';
import { Button, EventHandler, Node, Toggle } from 'cc';
import type { GameComponent } from '../GameComponent';
import { GamePartBase } from '../GamePartBase';

/** 界面按钮批量绑定 */
export class GamePartButton extends GamePartBase {
    /** 宿主组件 */
    protected declare comp: GameComponent;

    /** 设置按钮事件绑定
     * @param bindRootEvent 是否绑定根节点事件，默认为 true
     */
    bind(bindRootEvent = true): void {
        if (bindRootEvent) {
            this.comp.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                const self: any = this.comp;
                const func = self[event.target.name];
                if (func) {
                    func.call(this.comp, event);
                }
            }, this.comp);
        }

        const regex = /<([^>]+)>/;
        const match = this.comp.name.match(regex);
        if (!match || !match[1]) {
            console.warn('[OopsFramework]', `组件名 "${this.comp.name}" 不符合 "<组件名>" 格式，跳过按钮事件绑定`);
            return;
        }
        const componentName = match[1];
        const buttons = this.comp.node.getComponentsInChildren<Button>(Button);
        buttons.forEach((b: Button) => {
            // 跳过 Toggle 节点，避免与 Toggle 编辑器中配置的 checkEvents 冲突
            if (b.node.getComponent(Toggle)) return;

            const node = b.node;
            const self: any = this.comp;
            const func = self[node.name];
            if (func) {
                const event = new EventHandler();
                event.target = this.comp.node;
                event.handler = b.node.name;
                event.component = componentName;
                b.clickEvents.push(event);
            }
        });
    }
}
