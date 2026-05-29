export interface IAudioParams {
    /** 音效类型 */
    type?: string;
    /** 是否循环播放 */
    loop?: boolean;
    /** 音效音量 */
    volume?: number;
    /** 播放完成事件 */
    onPlayComplete?: Function;
}

export interface IAudioData {
    /** 音乐开关 */
    switch: boolean;
    /** 音量 */
    volume: number;
}
