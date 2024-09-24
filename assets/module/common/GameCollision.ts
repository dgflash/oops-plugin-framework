/*
 * @Author: dgflash
 * @Date: 2022-03-29 17:08:08
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 09:45:41
 */
import { _decorator, ccenum, Collider, Component, ICollisionEvent, ITriggerEvent } from "cc";

const { ccclass, property } = _decorator;

/** 碰撞物体类型 */
export enum CollisionType {
    /** 角色类 */
    Role,
    /** 飞弹类体*/
    Ballistic,
    /** 墙体类 */
    Wall
}
ccenum(CollisionType);

const Event_TriggerEnter = "onTriggerEnter";
const Event_TriggerStay = "onTriggerStay";
const Event_TriggerExit = "onTriggerExit";
const Event_CollisionEnter = "onCollisionEnter";
const Event_CollisionStay = "onCollisionStay";
const Event_CollisionExit = "onCollisionExit";

/** 碰撞器与触发器 */
@ccclass('GameCollision')
export class GameCollision extends Component {
    protected collider: Collider = null!;

    @property({ type: CollisionType, tooltip: '碰撞物体类型' })
    type: CollisionType = CollisionType.Ballistic;

    onLoad() {
        this.collider = this.getComponent(Collider)!;
        if (this.collider.isTrigger) {
            this.collider.on(Event_TriggerEnter, this.onTrigger, this);
            this.collider.on(Event_TriggerStay, this.onTrigger, this);
            this.collider.on(Event_TriggerExit, this.onTrigger, this);
        }
        else {
            this.collider.on(Event_CollisionEnter, this.onCollision, this);
            this.collider.on(Event_CollisionStay, this.onCollision, this);
            this.collider.on(Event_CollisionExit, this.onCollision, this);
        }
    }

    private onTrigger(event: ITriggerEvent) {
        switch (event.type) {
            case Event_TriggerEnter:
                this.onTriggerEnter(event);
                break;
            case Event_TriggerStay:
                this.onTriggerStay(event);
                break;
            case Event_TriggerExit:
                this.onTriggerExit(event);
                break;
        }
    }

    protected onTriggerEnter(event: ITriggerEvent) { }
    protected onTriggerStay(event: ITriggerEvent) { }
    protected onTriggerExit(event: ITriggerEvent) { }

    private onCollision(event: ICollisionEvent) {
        switch (event.type) {
            case Event_CollisionEnter:
                this.onCollisionEnter(event);
                break;
            case Event_CollisionStay:
                this.onCollisionStay(event);
                break;
            case Event_CollisionExit:
                this.onCollisionExit(event);
                break;
        }
    }

    protected onCollisionEnter(event: ICollisionEvent) { }
    protected onCollisionStay(event: ICollisionEvent) { }
    protected onCollisionExit(event: ICollisionEvent) { }
}
