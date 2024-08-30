import { Director, director, js } from "cc";

/** 全局游戏时间缩放 */
//@ts-ignore
if (!Director.prototype["__$cc-director-speed-extension$__"]) {
    //@ts-ignore
    Director.prototype["__$cc-director-speed-extension$__"] = true;

    let oldTick = director.tick.bind(director);
    director.tick = function (dt) {
        dt *= director.globalGameTimeScale;
        oldTick(dt);
    };

    js.mixin(Director.prototype, {
        globalGameTimeScale: 1,
    });
}

declare module "cc" {
    interface Director {
        globalGameTimeScale: number;
    }
}

// director.globalGameTimeScale = 0.5;