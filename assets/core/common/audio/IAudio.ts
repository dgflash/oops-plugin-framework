export interface IAudioParams {
    /** 资源包名 */
    bundle?: string,
    /** 是否循环播放 */
    loop?: boolean;
    /** 音效音量 */
    volume?: number;
    /** 播放完成事件 */
    onPlayComplete?: Function;
}