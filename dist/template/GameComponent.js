"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateGameComponent = void 0;
exports.TemplateGameComponent = `import { _decorator } from 'cc';
import { GameComponent } from "db://oops-framework/module/common/GameComponent";

const { ccclass, property } = _decorator;

/** 显示对象控制 */
@ccclass('<%Name%>')
export class <%Name%> extends GameComponent {
    protected start() {

    }
}`;
