import { Button, Canvas, Color, EditBox, Graphics, Label, Layout, Mask, Node, PageView, ProgressBar, RichText, ScrollView, Size, Slider, Sprite, Toggle, UIOpacity, UIRenderer, UITransform, Widget, v3 } from "cc";
import { EDITOR_NOT_IN_PREVIEW } from "cc/env";

// ========= 扩展 cc 提示声明 =========

/** 扩展节点属性 */
declare module "cc" {
    interface Node {
        uiGraphics: Graphics,
        uiLabel: Label,
        uiRichText: RichText,
        uiSprite: Sprite,
        uiButton: Button,
        uiCanvas: Canvas,
        uiEditBox: EditBox,
        uiLayout: Layout,
        uiPageView: PageView,
        uiProgressBar: ProgressBar,
        uiScrollView: ScrollView,
        uiSlider: Slider,
        uiToggle: Toggle,
        uiWidget: Widget,
        uiOpacity: UIOpacity,
        uiTransform: UITransform,
        uiMask: Mask;

        /** 获取、设置节点的本地X坐标 */
        x: number;
        /** 获取、设置节点的本地Y坐标 */
        y: number;
        /** 获取、设置节点的本地Z坐标 */
        z: number;
        /** 获取、设置节点宽 */
        w: number;
        /** 获取、设置节点高 */
        h: number;
        /** 获取、设置节点尺寸 */
        size: Size;
        /** 获取、设置X轴锚点 */
        anchor_x: number;
        /** 获取、设置Y轴锚点 */
        anchor_y: number;
        /** 获取、设置节点透明度  */
        opacity: number;
        /** 获取、设置节点颜色  */
        color: Color;
        /** 获取、设置X轴缩放 */
        scale_x: number;
        /** 获取、设置Y轴缩放 */
        scale_y: number;
        /** 获取、设置Z轴缩放 */
        scale_z: number;
        /** 获取、设置节点的 X 欧拉角 */
        angle_x: number;
        /** 获取、设置节点的 Y 欧拉角 */
        angle_y: number;
        /** 获取、设置节点的 Z 欧拉角 */
        angle_z: number;
    }
}

if (!EDITOR_NOT_IN_PREVIEW) {
    Object.defineProperty(Node.prototype, "uiGraphics", {
        get: function () {
            return this.getComponent(Graphics)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiLabel", {
        get: function () {
            return this.getComponent(Label)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiRichText", {
        get: function () {
            return this.getComponent(RichText)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiSprite", {
        get: function () {
            return this.getComponent(Sprite)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiButton", {
        get: function () {
            return this.getComponent(Button)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiCanvas", {
        get: function () {
            return this.getComponent(Canvas)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiEditBox", {
        get: function () {
            return this.getComponent(EditBox)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiLayout", {
        get: function () {
            return this.getComponent(Layout)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiPageView", {
        get: function () {
            return this.getComponent(PageView)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiProgressBar", {
        get: function () {
            return this.getComponent(ProgressBar)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiScrollView", {
        get: function () {
            return this.getComponent(ScrollView)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiSlider", {
        get: function () {
            return this.getComponent(Slider)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiToggle", {
        get: function () {
            return this.getComponent(Toggle)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiWidget", {
        get: function () {
            return this.getComponent(Widget)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiOpacity", {
        get: function () {
            return this.getComponent(UIOpacity)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiTransform", {
        get: function () {
            return this.getComponent(UITransform)!;
        },
        set: function (value) { }
    });

    Object.defineProperty(Node.prototype, "uiMask", {
        get: function () {
            return this.getComponent(Mask)!;
        },
        set: function (value) { }
    });

    /** 获取、设置节点的 X 坐标 */
    Object.defineProperty(Node.prototype, "x", {
        get: function () {
            let self: Node = this;
            return self.position.x;
        },
        set: function (value: number) {
            let self: Node = this;
            self.setPosition(value, self.position.y);
        }
    });

    /** 获取、设置节点的 Y 坐标 */
    Object.defineProperty(Node.prototype, "y", {
        get: function () {
            let self: Node = this;
            return self.position.y;
        },
        set: function (value: number) {
            let self: Node = this;
            self.setPosition(self.position.x, value);
        }
    });

    /** 获取、设置节点的 Z 坐标 */
    Object.defineProperty(Node.prototype, "z", {
        get: function () {
            let self: Node = this;
            return self.position.z;
        },
        set: function (value: number) {
            let self: Node = this;
            self.setPosition(self.position.x, self.position.y, value);
        }
    });

    /** 获取、设置节点的宽度 */
    Object.defineProperty(Node.prototype, "w", {
        configurable: true,
        get: function () {
            let self: Node = this;
            return self.getComponent(UITransform)?.width ?? 0;
        },
        set: function (value: number) {
            let self: Node = this;
            (self.getComponent(UITransform) || self.addComponent(UITransform)).width = value;
        }
    });

    /** 获取、设置节点的高度 */
    Object.defineProperty(Node.prototype, "h", {
        configurable: true,
        get: function () {
            let self: Node = this;
            return self.getComponent(UITransform)?.height ?? 0;
        },
        set: function (value: number) {
            let self: Node = this;
            (self.getComponent(UITransform) || self.addComponent(UITransform)).height = value;
        }
    });

    /** 获取、设置节点的尺寸 */
    Object.defineProperty(Node.prototype, "size", {
        get: function () {
            let self: Node = this;
            let uiTransform = self.getComponent(UITransform)!;
            return new Size(uiTransform.width, uiTransform.height);
        },
        set: function (value: Size) {
            let self: Node = this;
            let uiTransform = self.getComponent(UITransform) || self.addComponent(UITransform);
            uiTransform.width = value.width;
            uiTransform.height = value.height;
        }
    });

    /** 获取、设置节点的透明度 */
    Object.defineProperty(Node.prototype, "opacity", {
        get: function () {
            let self: Node = this;
            let op = self.getComponent(UIOpacity);
            if (op != null) {
                return op.opacity;
            }

            let render = self.getComponent(UIRenderer);
            if (render) {
                return render.color.a;
            }

            return 255;
        },

        set: function (value: number) {
            let self: Node = this;
            let op = self.getComponent(UIOpacity);
            if (op != null) {
                op.opacity = value;
                return;
            }

            let render = self.getComponent(UIRenderer);
            if (render) {
                // 直接通过 color.a 设置透明度会有bug，没能直接生效，需要激活节点才生效
                // (render.color.a as any) = value;

                // 创建一个颜色缓存对象，避免每次都创建新对象
                if (!this.$__color__) {
                    this.$__color__ = new Color(render.color.r, render.color.g, render.color.b, value);
                }
                else {
                    this.$__color__.a = value;
                }
                render.color = this.$__color__;     // 设置 color 对象则可以立刻生效
            }
            else {
                self.addComponent(UIOpacity).opacity = value;
            }
        }
    });

    /** 获取、设置节点的颜色 */
    Object.defineProperty(Node.prototype, "color", {
        get: function () {
            let self: Node = this;
            return self.getComponent(UIRenderer)?.color;
        },
        set: function (value: Color) {
            let self: Node = this;
            let render = self.getComponent(UIRenderer);
            render && (render.color = value);
        }
    });

    /** 获取、设置节点的 X 缩放系数 */
    Object.defineProperty(Node.prototype, "scale_x", {
        get: function () {
            let self: Node = this;
            return self.scale.x;
        },
        set: function (value: number) {
            let self: Node = this;
            self.scale = v3(value, self.scale.y, self.scale.z);
        }
    });

    /** 获取、设置节点的 Y 缩放系数 */
    Object.defineProperty(Node.prototype, "scale_y", {
        get: function () {
            let self: Node = this;
            return self.scale.y;
        },
        set: function (value: number) {
            let self: Node = this;
            self.scale = v3(self.scale.x, value, self.scale.z);
        }
    });

    /** 获取、设置节点的 Z 缩放系数 */
    Object.defineProperty(Node.prototype, "scale_z", {
        get: function () {
            let self: Node = this;
            return self.scale.z;
        },
        set: function (value: number) {
            let self: Node = this;
            self.scale = v3(self.scale.x, self.scale.y, value);
        }
    });

    /** 获取、设置节点的水平锚点 */
    Object.defineProperty(Node.prototype, "anchor_x", {
        get: function () {
            let self: Node = this;
            return self.getComponent(UITransform)?.anchorX ?? 0.5;
        },
        set: function (value: number) {
            let self: Node = this;
            (self.getComponent(UITransform) || self.addComponent(UITransform)).anchorX = value;
        }
    });

    /** 获取、设置节点的垂直锚点 */
    Object.defineProperty(Node.prototype, "anchor_y", {
        get: function () {
            let self: Node = this;
            return self.getComponent(UITransform)?.anchorY ?? 0.5;
        },
        set: function (value: number) {
            let self: Node = this;
            (self.getComponent(UITransform) || self.addComponent(UITransform)).anchorY = value;
        }
    });

    /** 获取、设置节点的 X 欧拉角 */
    Object.defineProperty(Node.prototype, "angle_x", {
        get: function () {
            let self: Node = this;
            return self.eulerAngles.x;
        },
        set: function (value: number) {
            let self: Node = this;
            self.setRotationFromEuler(value, self.eulerAngles.y, self.eulerAngles.z);
        }
    });

    /** 获取、设置节点的 Y 欧拉角 */
    Object.defineProperty(Node.prototype, "angle_y", {
        get: function () {
            return this.eulerAngles.y;
        },
        set: function (value: number) {
            let self: Node = this;
            self.setRotationFromEuler(self.eulerAngles.x, value, self.eulerAngles.z);
        }
    });

    /** 获取、设置节点的 Z 欧拉角 */
    Object.defineProperty(Node.prototype, "angle_z", {
        get: function () {
            return this.eulerAngles.y;
        },
        set: function (value: number) {
            let self: Node = this;
            self.setRotationFromEuler(self.eulerAngles.x, self.eulerAngles.y, value);
        }
    });
}