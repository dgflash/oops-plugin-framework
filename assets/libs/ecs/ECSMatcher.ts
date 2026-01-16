import type { ecs } from './ECS';
import type { ECSEntity } from './ECSEntity';
import { ECSMask } from './ECSMask';
import type { CompCtor, CompType } from './ECSModel';
import { ECSModel } from './ECSModel';

let macherId = 1;

/**
 * 筛选规则间是“与”的关系
 * 比如：ecs.Macher.allOf(...).excludeOf(...)表达的是allOf && excludeOf，即实体有“这些组件” 并且 “没有这些组件”
 */
export class ECSMatcher implements ecs.IMatcher {
    protected rules: BaseOf[] = [];
    protected _indices: number[] | null = null;
    isMatch!: (entity: ECSEntity) => boolean;
    mid = -1;

    private _key: string | null = null;
    get key(): string {
        if (!this._key) {
            // 使用数组 join 代替字符串拼接，性能更好
            const keys: string[] = [];
            const len = this.rules.length;
            for (let i = 0; i < len; i++) {
                keys.push(this.rules[i].getKey());
            }
            this._key = keys.join(' && ');
        }
        return this._key;
    }

    constructor() {
        this.mid = macherId++;
    }

    /**
     * 匹配器关注的组件索引。在创建Group时，Context根据组件id去给Group关联组件的添加和移除事件。
     */
    get indices() {
        if (this._indices === null) {
            this._indices = [];
            this.rules.forEach((rule) => {
                Array.prototype.push.apply(this._indices, rule.indices);
            });
        }
        return this._indices;
    }

    /**
     * 组件间是或的关系，表示关注拥有任意一个这些组件的实体。
     * @param args 组件索引
     */
    anyOf(...args: CompType<ecs.IComp>[]): ECSMatcher {
        this.rules.push(new AnyOf(...args));
        this.bindMatchMethod();
        return this;
    }

    /**
     * 组件间是与的关系，表示关注拥有所有这些组件的实体。
     * @param args 组件索引
     */
    allOf(...args: CompType<ecs.IComp>[]): ECSMatcher {
        this.rules.push(new AllOf(...args));
        this.bindMatchMethod();
        return this;
    }

    /**
     * 表示关注只拥有这些组件的实体
     *
     * 注意：
     *  不是特殊情况不建议使用onlyOf。因为onlyOf会监听所有组件的添加和删除事件。
     * @param args 组件索引
     */
    onlyOf(...args: CompType<ecs.IComp>[]): ECSMatcher {
        this.rules.push(new AllOf(...args));
        const otherTids: CompType<ecs.IComp>[] = [];
        for (const ctor of ECSModel.compCtors) {
            if (args.indexOf(ctor) < 0) {
                otherTids.push(ctor);
            }
        }
        this.rules.push(new ExcludeOf(...otherTids));
        this.bindMatchMethod();
        return this;
    }

    /**
     * 不包含指定的任意一个组件
     * @param args
     */
    excludeOf(...args: CompType<ecs.IComp>[]) {
        this.rules.push(new ExcludeOf(...args));
        this.bindMatchMethod();
        return this;
    }

    private bindMatchMethod() {
        if (this.rules.length === 1) {
            this.isMatch = this.isMatch1;
        }
        else if (this.rules.length === 2) {
            this.isMatch = this.isMatch2;
        }
        else {
            this.isMatch = this.isMatchMore;
        }
    }

    private isMatch1(entity: ECSEntity): boolean {
        return this.rules[0].isMatch(entity);
    }

    private isMatch2(entity: ECSEntity): boolean {
        return this.rules[0].isMatch(entity) && this.rules[1].isMatch(entity);
    }

    private isMatchMore(entity: ECSEntity): boolean {
        for (const rule of this.rules) {
            if (!rule.isMatch(entity)) {
                return false;
            }
        }
        return true;
    }

    clone(): ECSMatcher {
        const newMatcher = new ECSMatcher();
        newMatcher.mid = macherId++;
        this.rules.forEach((rule) => newMatcher.rules.push(rule));
        return newMatcher;
    }
}

abstract class BaseOf {
    indices: number[] = [];

    protected mask: ECSMask = new ECSMask();
    private _keyCache: string | null = null; // 缓存 key，避免重复生成

    constructor(...args: CompType<ecs.IComp>[]) {
        let componentTypeId = -1;
        const len = args.length;
        // 使用 Set 去重，性能更好
        const uniqueIds = new Set<number>();
        
        for (let i = 0; i < len; i++) {
            if (typeof (args[i]) === 'number') {
                componentTypeId = args[i] as number;
            }
            else {
                componentTypeId = (args[i] as CompCtor<ecs.IComp>).tid;
            }
            if (componentTypeId === -1) {
                throw Error('存在没有注册的组件！');
            }
            this.mask.set(componentTypeId);
            uniqueIds.add(componentTypeId);
        }
        
        // 从 Set 转为排序数组
        this.indices = Array.from(uniqueIds).sort((a, b) => a - b);
    }
    
    /** 清理资源，防止内存泄漏 */
    destroy(): void {
        this.mask.destroy();
        this.indices.length = 0;
        this._keyCache = null;
    }

    toString(): string {
        // 使用缓存避免重复生成字符串
        if (!this._keyCache) {
            this._keyCache = this.indices.join('-');
        }
        return this._keyCache;
    }

    abstract getKey(): string;

    abstract isMatch(entity: ECSEntity): boolean;
}

/**
 * 用于描述包含任意一个这些组件的实体
 */
class AnyOf extends BaseOf {
    isMatch(entity: ECSEntity): boolean {
        return this.mask.or((entity as ECSEntityInternal).getMask());
    }

    getKey(): string {
        return 'anyOf:' + this.toString();
    }
}

/**
 * 用于描述包含了"这些"组件的实体，这个实体除了包含这些组件还可以包含其他组件
 */
class AllOf extends BaseOf {
    isMatch(entity: ECSEntity): boolean {
        return this.mask.and((entity as ECSEntityInternal).getMask());
    }

    getKey(): string {
        return 'allOf:' + this.toString();
    }
}

/**
 * 不包含指定的任意一个组件
 */
class ExcludeOf extends BaseOf {
    getKey(): string {
        return 'excludeOf:' + this.toString();
    }

    isMatch(entity: ECSEntity): boolean {
        return !this.mask.or((entity as ECSEntityInternal).getMask());
    }
}

/** 内部接口，用于访问 ECSEntity 的私有成员 */
interface ECSEntityInternal {
    getMask(): ECSMask;
}
