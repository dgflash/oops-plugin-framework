import { RandomManager } from "./RandomManager";

/** 伪随机 */
export class SeedRandom {
    private rm: RandomManager;
    private sr: any;

    get random(): RandomManager {
        return this.rm;
    }

    constructor(seed: string) {
        //@ts-ignore
        this.sr = new Math.seedrandom(seed);
        this.rm = new RandomManager();
        this.rm.setRandom(this.sr);
    }

    destroy() {
        this.rm = null!;
        this.sr = null!;
    }
}