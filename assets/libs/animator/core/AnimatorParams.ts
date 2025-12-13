import { ParamType } from './AnimatorCondition';

/**
 * 参数结构
 */
interface Param {
    type: ParamType;
    value: number;
}

/**
 * 状态机参数
 */
export default class AnimatorParams {
    private _paramMap: Map<string, Param> = new Map();

    constructor(dataArr: any[]) {
        dataArr.forEach((data: any) => {
            const param: Param = {
                type: data.type,
                value: data.init
            };
            this._paramMap.set(data.param, param);
        });
    }

    getParamType(key: string): ParamType {
        const param: Param = this._paramMap.get(key)!;
        if (param) {
            return param.type;
        }
        else {
            return null!;
        }
    }

    setNumber(key: string, value: number) {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.NUMBER) {
            param.value = value;
        }
    }

    setBool(key: string, value: boolean) {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.BOOLEAN) {
            param.value = value ? 1 : 0;
        }
    }

    setTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.TRIGGER) {
            param.value = 1;
        }
    }

    resetTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.TRIGGER) {
            param.value = 0;
        }
    }

    autoTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.AUTO_TRIGGER) {
            param.value = 1;
        }
    }

    resetAutoTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.AUTO_TRIGGER) {
            param.value = 0;
        }
    }

    resetAllAutoTrigger() {
        this._paramMap.forEach((param: Param, key: string) => {
            if (param.type === ParamType.AUTO_TRIGGER) {
                param.value = 0;
            }
        });
    }

    getNumber(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.NUMBER) {
            return param.value;
        }
        else {
            return 0;
        }
    }

    getBool(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.BOOLEAN) {
            return param.value;
        }
        else {
            return 0;
        }
    }

    getTrigger(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.TRIGGER) {
            return param.value;
        }
        else {
            return 0;
        }
    }

    getAutoTrigger(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (param && param.type === ParamType.AUTO_TRIGGER) {
            return param.value;
        }
        else {
            return 0;
        }
    }
}
