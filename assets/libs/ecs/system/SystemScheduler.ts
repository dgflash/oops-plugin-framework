import type { ECSComblockSystem } from './ECSComblockSystem';

/**
 * 系统调度 —— 声明式系统执行顺序。
 *
 * 通过 {@link executeBefore} / {@link executeAfter} / {@link inSet} 在系统类上声明约束，
 * 由 {@link sortSystemsByDependencies} 在 RootSystem 构建执行流时做拓扑排序（Kahn 算法），
 * 并在出现循环依赖时抛错。无任何声明时排序为空操作，保持原添加顺序与行为。
 *
 * 说明：依赖以"系统名"为节点标识，名取自系统类名（构造函数 name）。
 * 装饰器入参可传类引用或字符串；传类引用更安全（避免手写错字），但都依赖类名，
 * 若构建开启了类名混淆需改用字符串显式名并保持一致。
 */

/** 调度元数据存放在系统类原型上的键 */
const SCHEDULING_METADATA = Symbol('ecsSchedulingMetadata');

/** 集合节点前缀，用于区分虚拟集合节点与真实系统节点 */
const SET_PREFIX = 'set:';

/** 系统调度元数据 */
interface SchedulingMetadata {
    /** 本系统须在这些系统之前执行 */
    before: string[];
    /** 本系统须在这些系统之后执行 */
    after: string[];
    /** 本系统所属的集合（虚拟分组） */
    sets: string[];
}

/** 装饰器入参：系统类引用或系统名字符串 */
type SystemRef = string | { name: string };

/** 将类引用/字符串统一解析为名称 */
function refName(ref: SystemRef): string {
    return typeof ref === 'string' ? ref : ref.name;
}

/** 读取或在原型上创建调度元数据（own property，避免被父类共享污染） */
function getOrCreateMetadata(prototype: object): SchedulingMetadata {
    const holder = prototype as Record<symbol, SchedulingMetadata | undefined>;
    if (!Object.prototype.hasOwnProperty.call(prototype, SCHEDULING_METADATA) || !holder[SCHEDULING_METADATA]) {
        holder[SCHEDULING_METADATA] = { before: [], after: [], sets: [] };
    }
    return holder[SCHEDULING_METADATA]!;
}

/** 沿原型链读取调度元数据（实例或类皆可） */
function getMetadata(target: object): SchedulingMetadata | undefined {
    let proto: object | null = typeof target === 'function' ? (target as { prototype: object }).prototype : Object.getPrototypeOf(target);
    while (proto) {
        const holder = proto as Record<symbol, SchedulingMetadata | undefined>;
        if (Object.prototype.hasOwnProperty.call(proto, SCHEDULING_METADATA) && holder[SCHEDULING_METADATA]) {
            return holder[SCHEDULING_METADATA];
        }
        proto = Object.getPrototypeOf(proto);
    }
    return undefined;
}

/**
 * 类装饰器：声明本系统须在指定系统之前执行。
 * @param systems 目标系统（类引用或类名）
 */
export function executeBefore(...systems: SystemRef[]): ClassDecorator {
    return function (target) {
        const meta = getOrCreateMetadata((target as unknown as { prototype: object }).prototype);
        for (let i = 0; i < systems.length; i++) meta.before.push(refName(systems[i]));
        return target;
    };
}

/**
 * 类装饰器：声明本系统须在指定系统之后执行。
 * @param systems 目标系统（类引用或类名），可用 'set:集合名' 依赖整个集合
 */
export function executeAfter(...systems: SystemRef[]): ClassDecorator {
    return function (target) {
        const meta = getOrCreateMetadata((target as unknown as { prototype: object }).prototype);
        for (let i = 0; i < systems.length; i++) meta.after.push(refName(systems[i]));
        return target;
    };
}

/**
 * 类装饰器：把本系统加入一个或多个集合（虚拟分组），便于批量声明依赖。
 * 其他系统可用 `executeAfter('set:集合名')` 依赖整个集合。
 * @param sets 集合名列表
 */
export function inSet(...sets: string[]): ClassDecorator {
    return function (target) {
        const meta = getOrCreateMetadata((target as unknown as { prototype: object }).prototype);
        meta.sets.push(...sets);
        return target;
    };
}

/** 循环依赖错误 */
export class CycleDependencyError extends Error {
    /** 参与循环的节点名 */
    readonly involvedNodes: string[];
    constructor(involvedNodes: string[]) {
        super(`[ECS] 系统调度检测到循环依赖：${involvedNodes.join(' -> ')}`);
        this.name = 'CycleDependencyError';
        this.involvedNodes = involvedNodes;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/** 依赖图节点 */
interface GraphNode {
    /** 入边数（依赖本节点的前置节点数） */
    inEdges: Set<string>;
    /** 出边（本节点指向的后继节点） */
    outEdges: Set<string>;
    /** 是否为虚拟集合节点（不产出到结果） */
    virtual: boolean;
}

/**
 * 依据系统类上的调度声明对执行流做拓扑排序。
 *
 * 无任何调度声明时直接返回原数组（零开销、行为不变）。存在循环依赖时抛 {@link CycleDependencyError}。
 * 排序对无约束的系统保持其原始相对顺序（稳定）。
 *
 * @param systems RootSystem 摊平后的可执行系统实例数组
 * @returns 重新排序后的系统实例数组
 */
export function sortSystemsByDependencies(systems: ECSComblockSystem[]): ECSComblockSystem[] {
    const metas: (SchedulingMetadata | undefined)[] = new Array(systems.length);
    let hasAny = false;
    for (let i = 0; i < systems.length; i++) {
        const m = getMetadata(systems[i]);
        metas[i] = m;
        if (m && (m.before.length || m.after.length || m.sets.length)) hasAny = true;
    }
    if (!hasAny) return systems;

    const nameToInstances = new Map<string, ECSComblockSystem[]>();
    const orderedNames: string[] = [];
    for (let i = 0; i < systems.length; i++) {
        const name = systems[i].constructor.name;
        let list = nameToInstances.get(name);
        if (!list) {
            list = [];
            nameToInstances.set(name, list);
            orderedNames.push(name);
        }
        list.push(systems[i]);
    }

    const nodes = new Map<string, GraphNode>();
    const getNode = (id: string, virtual: boolean): GraphNode => {
        let n = nodes.get(id);
        if (!n) {
            n = { inEdges: new Set(), outEdges: new Set(), virtual };
            nodes.set(id, n);
        }
        return n;
    };
    const addEdge = (from: string, to: string): void => {
        if (from === to) return;
        getNode(from, from.startsWith(SET_PREFIX)).outEdges.add(to);
        getNode(to, to.startsWith(SET_PREFIX)).inEdges.add(from);
    };

    for (let i = 0; i < orderedNames.length; i++) getNode(orderedNames[i], false);

    for (let i = 0; i < systems.length; i++) {
        const meta = metas[i];
        if (!meta) continue;
        const name = systems[i].constructor.name;
        for (const setName of meta.sets) addEdge(SET_PREFIX + setName, name);
        for (const target of meta.before) addEdge(name, target);
        for (const target of meta.after) addEdge(target, name);
    }

    const inDegree = new Map<string, number>();
    nodes.forEach((node, id) => inDegree.set(id, node.inEdges.size));

    const queue: string[] = [];
    nodes.forEach((_node, id) => {
        if (inDegree.get(id) === 0) queue.push(id);
    });

    const sortedNames: string[] = [];
    let head = 0;
    let processed = 0;
    while (head < queue.length) {
        const id = queue[head++];
        processed++;
        const node = nodes.get(id)!;
        if (!node.virtual) sortedNames.push(id);
        node.outEdges.forEach((outId) => {
            const d = (inDegree.get(outId) ?? 0) - 1;
            inDegree.set(outId, d);
            if (d === 0) queue.push(outId);
        });
    }

    if (processed < nodes.size) {
        const cycle: string[] = [];
        inDegree.forEach((d, id) => { if (d > 0) cycle.push(id); });
        throw new CycleDependencyError(cycle);
    }

    const result: ECSComblockSystem[] = [];
    for (let i = 0; i < sortedNames.length; i++) {
        const list = nameToInstances.get(sortedNames[i]);
        if (list) for (let j = 0; j < list.length; j++) result.push(list[j]);
    }
    return result;
}

/** 系统调度装饰器集合（`ecs.system` 即此对象） */
export const ecsSystemScheduler = {
    /** 类装饰器：声明本系统须在指定系统之前执行 */
    executeBefore,
    /** 类装饰器：声明本系统须在指定系统之后执行（可用 `set:名` 依赖集合） */
    executeAfter,
    /** 类装饰器：把本系统加入虚拟集合，供 `executeAfter('set:名')` 批量依赖 */
    inSet,
};
