
import { EventTouch, Node, Vec2, js, v3 } from "cc";

/** 节点拖拽功能 */
//@ts-ignore
if (!Node.prototype["__$NodeDragExt$__"]) {
    //@ts-ignore
    Node.prototype["__$NodeDragExt$__"] = true;

    let _DragEvent = {
        DRAG_START: "drag_start",
        DRAG_MOVE: "drag_move",
        DRAG_END: "drag_end"
    }

    js.mixin(Node, {
        DragEvent: _DragEvent
    });

    //----------------   Node 添加 拖拽属性 ----------------

    js.mixin(Node.prototype, {
        _draggable: false,
        _dragging: false,
        _dragTesting: false,
        _dragStartPoint: null,
        initDrag: function () {
            if (this._draggable) {
                this.on(Node.EventType.TOUCH_START, this.onTouchBegin_0, this);
                this.on(Node.EventType.TOUCH_MOVE, this.onTouchMove_0, this);
                this.on(Node.EventType.TOUCH_END, this.onTouchEnd_0, this);
                this.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel_0, this);
            }
            else {
                this.off(Node.EventType.TOUCH_START, this.onTouchBegin_0, this);
                this.off(Node.EventType.TOUCH_MOVE, this.onTouchMove_0, this);
                this.off(Node.EventType.TOUCH_END, this.onTouchEnd_0, this);
                this.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel_0, this);
            }
        },
        onTouchBegin_0: function (event: EventTouch) {
            if (this._dragStartPoint == null) {
                this._dragStartPoint = new Vec2();
            }
            // DEV && console.log(`NodeDragExt -> onTouchBegin_0  ${this.name}`);

            // event.preventSwallow = true;
            let pos = event.getUILocation();
            this._dragStartPoint.set(pos);
            this._dragTesting = true;
        },
        onTouchMove_0: function (event: EventTouch) {
            if (!this._dragging && this._draggable && this._dragTesting) {
                let sensitivity = 10;
                let pos = event.getUILocation();
                if (Math.abs(this._dragStartPoint.x - pos.x) < sensitivity
                    && Math.abs(this._dragStartPoint.y - pos.y) < sensitivity) {
                    return;
                }

                // event.preventSwallow = true;
                this._dragging = true;
                this._dragTesting = false;
                this.emit(Node.DragEvent.DRAG_START, event);
            }

            if (this._dragging) {
                let delta = event.getUIDelta();
                // /** 这里除以 世界缩放，在有缩放的时候拖拽不至于很怪 */
                // this.position = this.position.add(v3(delta.x / this.worldScale.x, delta.y / this.worldScale.y, 0));
                let newPos = v3(delta.x, delta.y, 0).add(this.position);
                this.position = newPos;
                this.emit(Node.DragEvent.DRAG_MOVE, event);
            }
        },

        onTouchEnd_0: function (event: EventTouch) {
            if (this._dragging) {
                this._dragging = false;
                this.emit(Node.DragEvent.DRAG_END, event);
            }
            // DEV && console.log(`NodeDragExt -> onTouchEnd_0  ${this.name}, _dragging: ${this._dragging}`);
        },

        onTouchCancel_0: function (event: EventTouch) {
            if (this._dragging) {
                this._dragging = false;
                this.emit(Node.DragEvent.DRAG_END, event);
            }
            // DEV && console.log(`NodeDragExt -> onTouchCancel_0  ${this.name}, _dragging: ${this._dragging}`);
        },

        startDrag: function () {
            // 此节点是否在场景中激活
            if (!this.activeInHierarchy) {
                return;
            }
            this.dragBegin();
        },

        dragBegin: function () {
            this._dragging = true;
            this._dragTesting = true;
            this.on(Node.EventType.TOUCH_MOVE, this.onTouchMove_0, this);
            this.on(Node.EventType.TOUCH_END, this.onTouchEnd_0, this);
            this.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel_0, this);
        },
        dragEnd: function () {
            if (this._dragging) {
                this._dragTesting = false;
                this._dragging = false;
            }
        },

        // 停止拖拽
        stopDrag: function () {
            this.dragEnd();
        },

        // 移除 touch 事件
        removeDragEvent: function () {
            this.off(Node.EventType.TOUCH_START, this.onTouchBegin_0, this);
            this.off(Node.EventType.TOUCH_MOVE, this.onTouchMove_0, this);
            this.off(Node.EventType.TOUCH_END, this.onTouchEnd_0, this);
            this.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel_0, this);
        }
    });

    // 如果 node 设置 node.draggable = true, 则启用 拖拽
    Object.defineProperty(Node.prototype, "draggable", {
        get: function () {
            return this._draggable;
        },
        set: function (value) {
            if (this._draggable != value) {
                this._draggable = value;
                this.initDrag();
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Node.prototype, "dragTesting", {
        get: function () {
            return this._dragTesting;
        },
        set: function (value) {
            if (this._dragTesting != value) {
                this._dragTesting = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    //----------------   Node 添加 拖拽属性 ----------------
}

declare module "cc" {
    // 这里使用 interface 进行扩展，如果使用 class 则会与现有的 d.ts 有冲突
    export interface Node {
        /** 是否启动拖拽 - true为启动 */
        draggable: boolean;
        /** 开始拖拽 */
        startDrag(): void;
        /** 停止拖拽 */
        stopDrag(): void;
        /** 移除拖拽事件 */
        removeDragEvent(): void;
    }

    export namespace Node {
        /** 支持的拖拽事件 */
        export class DragEvent {
            /** 拖拽开始事件 */
            static DRAG_START: string;
            /** 拖拽移动事件 */
            static DRAG_MOVE: string;
            /** 拖拽结束事件 */
            static DRAG_END: string;
        }
    }
}