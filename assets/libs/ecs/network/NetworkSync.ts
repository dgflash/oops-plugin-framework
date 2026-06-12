import { ByteWriter, ByteReader } from './ByteBuffer';
import { SyncOp, SyncType } from './SyncTypes';
import { SyncCodec } from './SyncCodec';
import { sync, getSyncFields, getTracker, ensureTracker } from './SyncDecorators';
import { ecsWorldManager } from '../world/ECSWorldManager';
import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { CompCtor } from '../registry/ECSTypes';

/**
 * 网络同步门面：将带 @sync 字段的组件编码为紧凑二进制，并在另一端（共享 eid）应用。
 *
 * 用法：
 *   // 发送端
 *   const bytes = ecs.net.encodeWorld(SyncOp.Delta);
 *   send(bytes); ecs.net.clearDirty();
 *   // 接收端
 *   ecs.net.applyToWorld(bytes, (eid) => spawnByPrefab(eid));
 */
export class NetworkSync {
    /** 为实体上所有可同步组件初始化追踪器（可选标记全脏以便首帧全量） */
    static track(entity: ECSEntity, markAll = false): void {
        entity.forEachComponent((comp) => {
            const fields = getSyncFields(comp.constructor as CompCtor<ecs.IComp>);
            if (fields && fields.length > 0) ensureTracker(comp, markAll);
        });
    }

    /** 为单个组件初始化追踪器 */
    static trackComponent(comp: ecs.IComp, markAll = false): void {
        ensureTracker(comp, markAll);
    }

    /**
     * 编码当前世界的可同步实体。
     * @param op Full=全量 / Delta=仅脏字段（默认）
     */
    static encodeWorld(op: SyncOp = SyncOp.Delta): Uint8Array {
        const body = new ByteWriter(256);
        let count = 0;
        ecsWorldManager.current.entities.forEach((e) => {
            if (e.isValid && SyncCodec.encodeEntity(body, e, op)) count++;
        });

        const out = new ByteWriter(body.length + 8);
        out.writeUint8(op);
        out.writeVarUint(count);
        out.writeBytes(body.toUint8Array());
        return out.toUint8Array();
    }

    /**
     * 将二进制同步数据应用到世界（按 eid 匹配实体）。
     * @param onMissing 当目标 eid 不存在时的处理（如按 prefab spawn）。
     */
    static applyToWorld(
        bytes: Uint8Array,
        onMissing?: (eid: number) => ECSEntity | undefined
    ): void {
        const r = new ByteReader(bytes);
        r.readUint8(); // op
        const count = r.readVarUint();
        for (let i = 0; i < count; i++) {
            SyncCodec.decodeEntityInto(r, onMissing);
        }
    }

    /** 清除世界内所有可同步组件的脏标记（一帧发送完成后调用） */
    static clearDirty(): void {
        ecsWorldManager.current.entities.forEach((e) => {
            e.forEachComponent((comp) => {
                const tracker = getTracker(comp);
                if (tracker) tracker.clear();
            });
        });
    }
}

/** 网络同步 API 集合（`ecs.network` 即此对象） */
export const ecsNetwork = {
    /** @sync 字段装饰器：标记组件字段参与网络同步 */
    sync,
    /** 同步字段数据类型枚举 */
    SyncType,
    /** 同步编解码操作枚举（Full / Delta） */
    SyncOp,
    /** 世界级增量同步（encodeWorld / applyToWorld / track / clearDirty） */
    net: NetworkSync,
    /** 实体 / 组件级同步编解码器 */
    SyncCodec,
    /** 二进制写缓冲 */
    ByteWriter,
    /** 二进制读缓冲 */
    ByteReader,
    /** 为组件实例初始化变更追踪器 */
    ensureSyncTracker: ensureTracker,
    /** 获取组件实例上的变更追踪器 */
    getSyncTracker: getTracker,
};
