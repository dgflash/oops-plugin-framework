import { _decorator, Enum, Label, Sprite, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/** 红点位置 */
export enum Position {
    /** 左上角 */
    TOP_LEFT,
    /** 右上角 */
    TOP_RIGHT
}

Enum(Position);

/** 红点组件 */
@ccclass('Badge')
export class Badge extends Sprite {
    @property({ tooltip: '内容' })
    string: string = '6';

    @property({ type: Position, tooltip: '位置\n 0: 左上角 \n 1: 右上角' })
    position: Position = Position.TOP_LEFT;
    // 徽标位置
    public static POSITION: Position;

    private label: Label | null = null;

    public get text(): string {
        return this.string;
    }
    public set text(text: string) {
        this.string = text;
        this.setText(text);
    }

    onLoad() {
        this.label = this.node.getComponentInChildren(Label);
        this.setPosition(this.position);
    }

    /**
     * 设置位置
     * @param position  位置
     */
    private setPosition(position: Position) {
        const parentSize = this.node.parent!.uiTransform.contentSize;

        switch (position) {
            case Position.TOP_LEFT: {
                const x = -parentSize.width / 2;
                const y = parentSize.height / 2;

                this.node.setPosition(new Vec3(x, y, 0));
                break;
            }
            case Position.TOP_RIGHT: {
                const x = parentSize.width / 2;
                const y = parentSize.height / 2;

                this.node.setPosition(new Vec3(x, y, 0));
                break;
            }
        }
    }

    /**
     * 设置文字
     * @param text  文字
     */
    private setText(text: string) {
        if (this.label) {
            this.label.string = text;
        }
    }
}