import { ByteWriter, ByteReader } from './ByteBuffer';
import { SyncType, SyncOp, SyncField } from './SyncTypes';
import { getSyncFields, getTracker, ensureTracker } from './SyncDecorators';
import { registry } from '../registry/ECSTypeRegistry';
import { ecsWorldManager } from '../world/ECSWorldManager';
import type { ecs } from '../ECS';
import type { ECSEntity } from '../entity/ECSEntity';
import type { CompCtor } from '../registry/ECSTypes';

/** 按 SyncType 将值写入字节流 */
function writeValue(w: ByteWriter, type: SyncType, value: unknown): void {
    switch (type) {
        case SyncType.Bool: w.writeUint8(value ? 1 : 0); break;
        case SyncType.Int8: w.writeInt8((value as number) | 0); break;
        case SyncType.Uint8: w.writeUint8((value as number) & 0xff); break;
        case SyncType.Int16: w.writeInt16((value as number) | 0); break;
        case SyncType.Uint16: w.writeUint16((value as number) & 0xffff); break;
        case SyncType.Int32: w.writeInt32((value as number) | 0); break;
        case SyncType.Uint32: w.writeUint32((value as number) >>> 0); break;
        case SyncType.Float32: w.writeFloat32(value as number); break;
        case SyncType.Float64: w.writeFloat64(value as number); break;
        case SyncType.String: w.writeString((value as string) ?? ''); break;
    }
}

/** 按 SyncType 从字节流读取值 */
function readValue(r: ByteReader, type: SyncType): unknown {
    switch (type) {
        case SyncType.Bool: return r.readUint8() !== 0;
        case SyncType.Int8: return r.readInt8();
        case SyncType.Uint8: return r.readUint8();
        case SyncType.Int16: return r.readInt16();
        case SyncType.Uint16: return r.readUint16();
        case SyncType.Int32: return r.readInt32();
        case SyncType.Uint32: return r.readUint32();
        case SyncType.Float32: return r.readFloat32();
        case SyncType.Float64: return r.readFloat64();
        case SyncType.String: return r.readString();
    }
}

/**
 * 同步编解码：组件 / 实体 层级的二进制（反）序列化。
 *
 * 编码格式（小端）：
 *   组件: [字段数 varint] { [字段索引 varint][值] }*
 *   实体: [eid varint][组件数 varint] { [tid varint][组件数据] }*
 */
export class SyncCodec {
    /** 编码单个组件（Full=全部字段，Delta=脏字段） */
    static encodeComponent(w: ByteWriter, comp: ecs.IComp, op: SyncOp): void {
        const ctor = comp.constructor as CompCtor<ecs.IComp>;
        const fields = getSyncFields(ctor)!;
        const anyComp = comp as unknown as Record<string, unknown>;

        let indices: number[];
        if (op === SyncOp.Delta) {
            const tracker = getTracker(comp);
            indices = tracker ? tracker.collect() : [];
        }
        else {
            indices = fields.map((f) => f.index);
        }

        w.writeVarUint(indices.length);
        for (const idx of indices) {
            const field = fields[idx];
            w.writeVarUint(idx);
            writeValue(w, field.type, anyComp[field.name]);
        }
    }

    /** 解码组件数据到实例（应用后清除脏标记，避免回声） */
    static decodeComponentInto(r: ByteReader, comp: ecs.IComp): void {
        const ctor = comp.constructor as CompCtor<ecs.IComp>;
        const fields = getSyncFields(ctor)!;
        const anyComp = comp as unknown as Record<string, unknown>;

        const count = r.readVarUint();
        for (let i = 0; i < count; i++) {
            const idx = r.readVarUint();
            const field: SyncField = fields[idx];
            anyComp[field.name] = readValue(r, field.type);
        }
        const tracker = getTracker(comp);
        if (tracker) tracker.clear();
    }

    /** 增量模式下判断组件是否有脏字段需要发送 */
    private static shouldSend(comp: ecs.IComp, op: SyncOp): boolean {
        if (op !== SyncOp.Delta) return true;
        const tracker = getTracker(comp);
        return !!tracker && tracker.hasChanges;
    }

    /** 编码实体的可同步组件；无可发送组件时返回 false */
    static encodeEntity(w: ByteWriter, entity: ECSEntity, op: SyncOp): boolean {
        const toSend: ecs.IComp[] = [];
        entity.forEachComponent((comp) => {
            const ctor = comp.constructor as CompCtor<ecs.IComp>;
            const fields = getSyncFields(ctor);
            if (fields && fields.length > 0 && SyncCodec.shouldSend(comp, op)) {
                toSend.push(comp);
            }
        });
        if (toSend.length === 0) return false;

        w.writeVarUint(entity.eid);
        w.writeVarUint(toSend.length);
        for (const comp of toSend) {
            w.writeVarUint((comp.constructor as CompCtor<ecs.IComp>).tid);
            SyncCodec.encodeComponent(w, comp, op);
        }
        return true;
    }

    /**
     * 解码实体数据并应用到相同 eid 的实体。
     * 若该 eid 不存在，回调 onMissing 让调用方决定是否 spawn。
     */
    static decodeEntityInto(
        r: ByteReader,
        onMissing?: (eid: number) => ECSEntity | undefined
    ): void {
        const eid = r.readVarUint();
        const compCount = r.readVarUint();
        let entity = ecsWorldManager.current.entities.get(eid);
        if (!entity && onMissing) entity = onMissing(eid);

        for (let i = 0; i < compCount; i++) {
            const tid = r.readVarUint();
            const ctor = registry.compCtors[tid];
            if (!ctor) {
                console.warn(`[ECS] 同步解码遇到未注册 tid=${tid}，终止本实体解析`);
                return;
            }
            if (entity) {
                let comp = entity.get(ctor) as ecs.IComp | undefined;
                if (!comp) comp = entity.add(ctor) as ecs.IComp;
                ensureTracker(comp);
                SyncCodec.decodeComponentInto(r, comp);
            }
            else {
                const dummy = new (ctor as unknown as { new (): ecs.IComp })();
                SyncCodec.decodeComponentInto(r, dummy);
            }
        }
    }
}
