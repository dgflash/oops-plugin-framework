export interface IAudioParams {
    /** 音乐分类 */
    type?: string,
    /** 资源包名 */
    bundle?: string,
    /** 是否循环播放 */
    loop?: boolean;
    /** 音效音量 */
    volume?: number;
    /** 是否在播放完后自动释放音乐资源（默认不释放） */
    destroy?: boolean;
    /** 播放完成事件 */
    onPlayComplete?: Function;
}

export interface IAudioData {
    /** 音乐开关 */
    switch: boolean;
    /** 音量 */
    volume: number;
}