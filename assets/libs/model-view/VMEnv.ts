import { EDITOR } from "cc/env";

/** VM组件环境验证 */
export class VMEnv {
    /** 编辑状态 */
    static get editor() {
        return EDITOR;
    }
}