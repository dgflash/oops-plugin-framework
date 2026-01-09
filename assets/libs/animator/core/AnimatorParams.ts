import { error, warn } from 'cc';
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
            warn(`[AnimatorParams.getParamType] 参数不存在: ${key}`);
            return ParamType.BOOLEAN; // 返回默认类型而不是null
        }
    }

    setNumber(key: string, value: number) {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.setNumber] 参数不存在: ${key}`);
            return;
        }
        if (param.type !== ParamType.NUMBER) {
            error(`[AnimatorParams.setNumber] 参数类型错误，期望NUMBER但实际是: ${param.type}`);
            return;
        }
        param.value = value;
    }

    setBool(key: string, value: boolean) {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.setBool] 参数不存在: ${key}`);
            return;
        }
        if (param.type !== ParamType.BOOLEAN) {
            error(`[AnimatorParams.setBool] 参数类型错误，期望BOOLEAN但实际是: ${param.type}`);
            return;
        }
        param.value = value ? 1 : 0;
    }

    setTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.setTrigger] 参数不存在: ${key}`);
            return;
        }
        if (param.type !== ParamType.TRIGGER) {
            error(`[AnimatorParams.setTrigger] 参数类型错误，期望TRIGGER但实际是: ${param.type}`);
            return;
        }
        param.value = 1;
    }

    resetTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.resetTrigger] 参数不存在: ${key}`);
            return;
        }
        if (param.type !== ParamType.TRIGGER) {
            return;
        }
        param.value = 0;
    }

    autoTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.autoTrigger] 参数不存在: ${key}`);
            return;
        }
        if (param.type !== ParamType.AUTO_TRIGGER) {
            error(`[AnimatorParams.autoTrigger] 参数类型错误，期望AUTO_TRIGGER但实际是: ${param.type}`);
            return;
        }
        param.value = 1;
    }

    resetAutoTrigger(key: string) {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            return; // 重置操作不输出警告
        }
        if (param.type !== ParamType.AUTO_TRIGGER) {
            return;
        }
        param.value = 0;
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
        if (!param) {
            warn(`[AnimatorParams.getNumber] 参数不存在: ${key}`);
            return 0;
        }
        if (param.type !== ParamType.NUMBER) {
            error(`[AnimatorParams.getNumber] 参数类型错误，期望NUMBER但实际是: ${param.type}`);
            return 0;
        }
        return param.value;
    }

    getBool(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.getBool] 参数不存在: ${key}`);
            return 0;
        }
        if (param.type !== ParamType.BOOLEAN) {
            error(`[AnimatorParams.getBool] 参数类型错误，期望BOOLEAN但实际是: ${param.type}`);
            return 0;
        }
        return param.value;
    }

    getTrigger(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.getTrigger] 参数不存在: ${key}`);
            return 0;
        }
        if (param.type !== ParamType.TRIGGER) {
            error(`[AnimatorParams.getTrigger] 参数类型错误，期望TRIGGER但实际是: ${param.type}`);
            return 0;
        }
        return param.value;
    }

    getAutoTrigger(key: string): number {
        const param: Param = this._paramMap.get(key)!;
        if (!param) {
            warn(`[AnimatorParams.getAutoTrigger] 参数不存在: ${key}`);
            return 0;
        }
        if (param.type !== ParamType.AUTO_TRIGGER) {
            error(`[AnimatorParams.getAutoTrigger] 参数类型错误，期望AUTO_TRIGGER但实际是: ${param.type}`);
            return 0;
        }
        return param.value;
    }
}
