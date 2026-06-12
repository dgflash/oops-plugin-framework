import type { ecs } from '../ECS';
import { registry } from '../registry/ECSTypeRegistry';
import type { ECSEntity } from '../entity/ECSEntity';
import { ECSMask } from '../component/ECSMask';
import type { CompCtor, CompType } from '../registry/ECSTypes';

/** 匹配器自增 id（用于 groups 缓存 key） */
let macherId = 1;

/** 小规则阈值：tid 数不超过此值时不分配 ECSMask，直接走 mask.has */
const SMALL_RULE_MAX = 4;

/**
 * 筛选规则间是“与”的关系
 * 比如：ecs.Macher.allOf(...).excludeOf(...)表达的是allOf && excludeOf，即实体有“这些组件” 并且 “没有这些组件”
 */
export class ECSMatcher implements ecs.IMatcher {
    /** 全局 flyweight 缓存（相同 key 共享 mid，各世界 groups 仍按 mid 隔离） */
    private static readonly _cache = new Map<string, ECSMatcher>();

    /** 筛选规则列表（规则间为“与”关系） */
    protected rules: BaseOf[] = [];
    /** 匹配器关注的组件索引（懒加载） */
    protected _indices: number[] | null = null;
    /** 实体匹配判定函数（按规则数量绑定不同实现） */
    isMatch!: (entity: ECSEntity) => boolean;
    /** 匹配器唯一 id */
    mid = -1;
    /** 已入全局缓存的匹配器不可原地追加规则（链式调用会 fork 出新实例） */
    private _sealed = false;

    /** 规则组合 key 缓存 */
    private _key: string | null = null;
    /** 规则组合的唯一字符串 key（用于调试与缓存） */
    get key(): string {
        if (!this._key) {
            const keys: string[] = [];
            const len = this.rules.length;
            for (let i = 0; i < len; i++) {
                keys.push(this.rules[i].getKey());
            }
            this._key = keys.join(' && ');
        }
        return this._key;
    }

    /** 分配匹配器 id */
    constructor() {
        this.mid = macherId++;
    }

    /**
     * 获取或创建缓存匹配器（`ecs.allOf` 等工厂入口使用）。
     * @param build 在未密封的临时匹配器上组装规则
     */
    static compose(build: (m: ECSMatcher) => ECSMatcher): ECSMatcher {
        const probe = new ECSMatcher();
        const built = build(probe);
        const k = built.key;
        const hit = ECSMatcher._cache.get(k);
        if (hit) {
            built._disposeRules();
            return hit;
        }
        built._sealed = true;
        ECSMatcher._cache.set(k, built);
        return built;
    }

    /** 清空全局匹配器缓存（热更重载等场景可选调用） */
    static clearCache(): void {
        ECSMatcher._cache.forEach((m) => m._disposeRules());
        ECSMatcher._cache.clear();
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
        if (this._sealed) {
            return ECSMatcher.compose((m) => {
                this._replayRules(m);
                return m.anyOf(...args);
            });
        }
        this.rules.push(new AnyOf(...args));
        this._invalidateKey();
        this.bindMatchMethod();
        return this;
    }

    /**
     * 组件间是与的关系，表示关注拥有所有这些组件的实体。
     * @param args 组件索引
     */
    allOf(...args: CompType<ecs.IComp>[]): ECSMatcher {
        if (this._sealed) {
            return ECSMatcher.compose((m) => {
                this._replayRules(m);
                return m.allOf(...args);
            });
        }
        this.rules.push(new AllOf(...args));
        this._invalidateKey();
        this.bindMatchMethod();
        return this;
    }

    /**
     * 表示关注只拥有这些组件的实体（仅监听 args 对应 tid，不扫描全注册表）。
     * @param args 组件索引
     */
    onlyOf(...args: CompType<ecs.IComp>[]): ECSMatcher {
        if (this._sealed) {
            return ECSMatcher.compose((m) => {
                this._replayRules(m);
                return m.onlyOf(...args);
            });
        }
        this.rules.push(new OnlyOf(...args));
        this._invalidateKey();
        this.bindMatchMethod();
        return this;
    }

    /**
     * 不包含指定的任意一个组件
     * @param args
     */
    excludeOf(...args: CompType<ecs.IComp>[]): ECSMatcher {
        if (this._sealed) {
            return ECSMatcher.compose((m: ECSMatcher): ECSMatcher => {
                this._replayRules(m);
                return m.excludeOf(...args);
            });
        }
        this.rules.push(new ExcludeOf(...args));
        this._invalidateKey();
        this.bindMatchMethod();
        return this;
    }

    /** 内部：追加已构造规则（replay / fork 用） */
    _pushRule(rule: BaseOf): void {
        this.rules.push(rule);
        this._indices = null;
        this._invalidateKey();
    }

    /** 根据当前规则数量绑定 isMatch 实现，减少运行时分支。 */
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

    /** 单条规则时的匹配判定 */
    private isMatch1(entity: ECSEntity): boolean {
        return this.rules[0].isMatch(entity);
    }

    /** 两条规则时的匹配判定（与） */
    private isMatch2(entity: ECSEntity): boolean {
        return this.rules[0].isMatch(entity) && this.rules[1].isMatch(entity);
    }

    /** 多条规则时的匹配判定（与） */
    private isMatchMore(entity: ECSEntity): boolean {
        for (const rule of this.rules) {
            if (!rule.isMatch(entity)) {
                return false;
            }
        }
        return true;
    }

    /** 将已密封匹配器的规则复制到目标匹配器 */
    private _replayRules(target: ECSMatcher): void {
        for (let i = 0; i < this.rules.length; i++) {
            target._pushRule(this.rules[i].fork());
        }
        target.bindMatchMethod();
    }

    private _invalidateKey(): void {
        this._key = null;
        this._indices = null;
    }

    /** 释放本匹配器全部规则 */
    private _disposeRules(): void {
        for (let i = 0; i < this.rules.length; i++) {
            this.rules[i].destroy();
        }
        this.rules.length = 0;
        this._invalidateKey();
    }

    /** 克隆当前匹配器（新 mid，规则 fork 副本） */
    clone(): ECSMatcher {
        const newMatcher = new ECSMatcher();
        for (let i = 0; i < this.rules.length; i++) {
            newMatcher._pushRule(this.rules[i].fork());
        }
        newMatcher.bindMatchMethod();
        return newMatcher;
    }
}

/** 从组件参数解析 tid 列表（去重、升序） */
function collectTids(...args: CompType<ecs.IComp>[]): number[] {
    const uniqueIds = new Set<number>();
    const len = args.length;
    for (let i = 0; i < len; i++) {
        let tid = -1;
        if (typeof args[i] === 'number') {
            tid = args[i] as number;
        }
        else {
            tid = (args[i] as CompCtor<ecs.IComp>).tid;
        }
        if (tid === -1) {
            throw Error('存在没有注册的组件！');
        }
        uniqueIds.add(tid);
    }
    return Array.from(uniqueIds).sort((a, b) => a - b);
}

/** 筛选规则基类 */
abstract class BaseOf {
    /** 本规则涉及的组件 type id 列表 */
    indices: number[] = [];
    /** 大规则（tid 数 > SMALL_RULE_MAX）使用的位掩码；小规则为 null */
    protected mask: ECSMask | null = null;
    /** getKey/toString 用 key 缓存 */
    private _keyCache: string | null = null;

    /**
     * @param args 组件构造器或 tid
     */
    constructor(...args: CompType<ecs.IComp>[]) {
        this.indices = collectTids(...args);
        if (this.indices.length > SMALL_RULE_MAX) {
            this.mask = new ECSMask(registry.maskWordCount);
            for (let i = 0; i < this.indices.length; i++) {
                this.mask.set(this.indices[i]);
            }
        }
    }

    /** 复制一条等价规则（链式 fork / clone 用） */
    fork(): BaseOf {
        const copy = Object.create(Object.getPrototypeOf(this)) as BaseOf;
        copy.indices = this.indices.slice();
        copy._keyCache = null;
        if (this.mask) {
            copy.mask = new ECSMask(registry.maskWordCount);
            for (let i = 0; i < this.indices.length; i++) {
                copy.mask.set(this.indices[i]);
            }
        }
        else {
            copy.mask = null;
        }
        return copy;
    }

    /** 清理资源，防止内存泄漏 */
    destroy(): void {
        if (this.mask) {
            this.mask.destroy();
            this.mask = null;
        }
        this.indices.length = 0;
        this._keyCache = null;
    }

    /** 返回 indices 拼接字符串（带缓存） */
    toString(): string {
        if (!this._keyCache) {
            this._keyCache = this.indices.join('-');
        }
        return this._keyCache;
    }

    /** 规则的唯一 key 前缀形式 */
    abstract getKey(): string;

    /** 判断实体是否满足本规则 */
    abstract isMatch(entity: ECSEntity): boolean;
}

/**
 * 用于描述包含任意一个这些组件的实体
 */
class AnyOf extends BaseOf {
    /** 实体 mask 与本规则 mask 有任意交集即匹配 */
    isMatch(entity: ECSEntity): boolean {
        const em = (entity as ECSEntityInternal).getMask();
        if (this.mask) {
            return this.mask.or(em);
        }
        for (let i = 0; i < this.indices.length; i++) {
            if (em.has(this.indices[i])) return true;
        }
        return false;
    }

    /** @returns anyOf:indices 形式 key */
    getKey(): string {
        return 'anyOf:' + this.toString();
    }
}

/**
 * 用于描述包含了"这些"组件的实体，这个实体除了包含这些组件还可以包含其他组件
 */
class AllOf extends BaseOf {
    /** 实体 mask 包含本规则 mask 的全部位即匹配 */
    isMatch(entity: ECSEntity): boolean {
        const em = (entity as ECSEntityInternal).getMask();
        if (this.mask) {
            return this.mask.and(em);
        }
        for (let i = 0; i < this.indices.length; i++) {
            if (!em.has(this.indices[i])) return false;
        }
        return true;
    }

    /** @returns allOf:indices 形式 key */
    getKey(): string {
        return 'allOf:' + this.toString();
    }
}

/**
 * 只拥有指定组件（无额外组件）；仅监听 indices 对应 tid 的增删。
 */
class OnlyOf extends BaseOf {
    isMatch(entity: ECSEntity): boolean {
        const em = (entity as ECSEntityInternal).getMask();
        for (let i = 0; i < this.indices.length; i++) {
            if (!em.has(this.indices[i])) return false;
        }
        return em.bitCount() === this.indices.length;
    }

    getKey(): string {
        return 'onlyOf:' + this.toString();
    }
}

/**
 * 不包含指定的任意一个组件
 */
class ExcludeOf extends BaseOf {
    /** @returns excludeOf:indices 形式 key */
    getKey(): string {
        return 'excludeOf:' + this.toString();
    }

    /** 实体 mask 与本规则 mask 无交集即匹配 */
    isMatch(entity: ECSEntity): boolean {
        const em = (entity as ECSEntityInternal).getMask();
        if (this.mask) {
            return !this.mask.or(em);
        }
        for (let i = 0; i < this.indices.length; i++) {
            if (em.has(this.indices[i])) return false;
        }
        return true;
    }
}

/** 内部接口，用于访问 ECSEntity 的私有成员 */
interface ECSEntityInternal {
    getMask(): ECSMask;
}
