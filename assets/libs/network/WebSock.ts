/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-09 17:42:19
 */
import { Logger } from "../../core/common/log/Logger";
import { ISocket, MessageFunc, NetData } from "./NetInterface";

type Connected = (event: any) => void;

/**
 * WebSocket 封装
 * 1. 连接/断开相关接口
 * 2. 网络异常回调
 * 3. 数据发送与接收
 */
export class WebSock implements ISocket {
    private _ws: WebSocket | null = null;              // websocket对象

    /** 网络连接成功事件 */
    onConnected: ((this: WebSocket, ev: Event) => any) | null = null;
    /** 接受到网络数据事件 */
    onMessage: MessageFunc | null = null;
    /** 网络错误事件 */
    onError: ((this: WebSocket, ev: Event) => any) | null = null;
    /** 网络断开事件 */
    onClosed: ((this: WebSocket, ev: CloseEvent) => any) | null = null;

    /** 请求连接 */
    connect(options: any) {
        if (this._ws) {
            if (this._ws.readyState === WebSocket.CONNECTING) {
                Logger.logNet("websocket connecting, wait for a moment...")
                return false;
            }
        }

        let url = null;
        if (options.url) {
            url = options.url;
        }
        else {
            let ip = options.ip;
            let port = options.port;
            let protocol = options.protocol;
            url = `${protocol}://${ip}:${port}`;
        }

        this._ws = new WebSocket(url);
        this._ws.binaryType = options.binaryType ? options.binaryType : "arraybuffer";
        this._ws.onmessage = (event) => {
            let onMessage: MessageFunc = this.onMessage!;
            onMessage(event.data);
        };
        this._ws.onopen = this.onConnected;
        this._ws.onerror = this.onError;
        this._ws.onclose = this.onClosed;
        return true;
    }

    /**
     * 发送数据 
     * @param buffer 网络数据
     */
    send(buffer: NetData): number {
        if (this._ws && this._ws.readyState == WebSocket.OPEN) {
            this._ws.send(buffer);
            return 1;
        }
        return -1;
    }

    /**
     * 网络断开
     * @param code      关闭码
     * @param reason    关闭原因
     */
    close(code?: number, reason?: string) {
        if (this._ws) {
            this._ws.close(code, reason);
        }
    }
}