
/** GUI 提示组件资源配置（可外部覆盖，游戏启动前设置即可生效） */
export const GuiPromptConfig: {
    /** 飘动提示 */
    Notify: { path: string };
    /** 延迟等待提示 */
    Wait: { path: string };
    /** 遮罩层 */
    Mask: { path: string };
} = {
    /** 飘动提示 */
    Notify: { path: 'gui/common/window/prefab/UI_Notify' },
    /** 延迟等待提示 */
    Wait: { path: 'gui/common/window/prefab/UI_Wait' },
    /** 遮罩层 */
    Mask: { path: 'gui/common/window/prefab/UI_Mask' },
};
