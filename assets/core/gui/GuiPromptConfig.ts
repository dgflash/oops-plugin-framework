/** GUI 提示组件资源配置（可外部覆盖，游戏启动前设置即可生效） */
export const GuiPromptConfig: {
    /** 飘动提示 */
    Notify: { bundle: string; path: string };
    /** 延迟等待提示 */
    Wait: { bundle: string; path: string };
    /** 遮罩层 */
    Mask: { bundle: string; path: string };
} = {
    /** 飘动提示 */
    Notify: { bundle: 'game_common', path: 'gui/window/prefab/notify' },
    /** 延迟等待提示 */
    Wait: { bundle: 'game_common', path: 'gui/window/prefab/wait' },
    /** 遮罩层 */
    Mask: { bundle: 'game_common', path: 'gui/window/prefab/mask' },
};
