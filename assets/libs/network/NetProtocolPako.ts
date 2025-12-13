/*
 * @Author: dgflash
 * @Date: 2022-04-21 13:45:51
 * @LastEditors: dgflash
 * @LastEditTime: 2022-04-21 13:51:33
 */
import type { IProtocolHelper, IRequestProtocol, IResponseProtocol, NetData } from './NetInterface';

const unzip = function (str: string) {
    const charData = str.split('').map((x) => {
        return x.charCodeAt(0);
    });
    const binData = new Uint8Array(charData);
    //@ts-ignore
    const data = pako.inflate(binData, { to: 'string' });
    return data;
};

const zip = function (str: string) {
    //@ts-ignore
    const binaryString = pako.gzip(str, { to: 'string' });
    return binaryString;
};

/** Pako.js 数据压缩协议 */
export class NetProtocolPako implements IProtocolHelper {
    getHeadlen(): number {
        return 0;
    }

    getHearbeat(): NetData {
        return '';
    }

    getPackageLen(msg: NetData): number {
        return msg.toString().length;
    }

    checkResponsePackage(respProtocol: IResponseProtocol): boolean {
        return true;
    }

    handlerResponsePackage(respProtocol: IResponseProtocol): boolean {
        if (respProtocol.code == 1) {
            if (respProtocol.isCompress) {
                respProtocol.data = unzip(respProtocol.data);
            }
            respProtocol.data = JSON.parse(respProtocol.data);

            return true;
        }
        else {
            return false;
        }
    }

    handlerRequestPackage(reqProtocol: IRequestProtocol): string {
        const rspCmd = reqProtocol.cmd;
        reqProtocol.callback = rspCmd;
        if (reqProtocol.isCompress) {
            reqProtocol.data = zip(reqProtocol.data);
        }
        return rspCmd;
    }

    getPackageId(respProtocol: IResponseProtocol): string {
        return respProtocol.callback!;
    }
}
