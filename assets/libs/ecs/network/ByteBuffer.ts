/**
 * 可增长二进制写缓冲（小端），用于网络同步编码。
 */
export class ByteWriter {
    /** 底层字节数组 */
    private buf: Uint8Array;
    /** 小端 DataView 视图 */
    private view: DataView;
    /** 当前写入偏移量 */
    private offset = 0;

    /**
     * 构造函数
     * @param initialSize 初始容量（字节）
     */
    constructor(initialSize = 64) {
        this.buf = new Uint8Array(initialSize);
        this.view = new DataView(this.buf.buffer);
    }

    /** 确保缓冲区至少还能写入 extra 字节，不足时按 2 倍扩容 */
    private ensure(extra: number): void {
        const need = this.offset + extra;
        if (need <= this.buf.length) return;
        let cap = this.buf.length;
        while (cap < need) cap *= 2;
        const next = new Uint8Array(cap);
        next.set(this.buf);
        this.buf = next;
        this.view = new DataView(this.buf.buffer);
    }

    /** 无符号 LEB128 变长整数 */
    writeVarUint(value: number): void {
        this.ensure(5);
        let v = value >>> 0;
        do {
            let byte = v & 0x7f;
            v >>>= 7;
            if (v !== 0) byte |= 0x80;
            this.buf[this.offset++] = byte;
        } while (v !== 0);
    }

    /** 写入有符号 8 位整数 */
    writeInt8(v: number): void { this.ensure(1); this.view.setInt8(this.offset, v); this.offset += 1; }
    /** 写入无符号 8 位整数 */
    writeUint8(v: number): void { this.ensure(1); this.view.setUint8(this.offset, v); this.offset += 1; }
    /** 写入有符号 16 位整数 */
    writeInt16(v: number): void { this.ensure(2); this.view.setInt16(this.offset, v, true); this.offset += 2; }
    /** 写入无符号 16 位整数 */
    writeUint16(v: number): void { this.ensure(2); this.view.setUint16(this.offset, v, true); this.offset += 2; }
    /** 写入有符号 32 位整数 */
    writeInt32(v: number): void { this.ensure(4); this.view.setInt32(this.offset, v, true); this.offset += 4; }
    /** 写入无符号 32 位整数 */
    writeUint32(v: number): void { this.ensure(4); this.view.setUint32(this.offset, v >>> 0, true); this.offset += 4; }
    /** 写入 32 位浮点数 */
    writeFloat32(v: number): void { this.ensure(4); this.view.setFloat32(this.offset, v, true); this.offset += 4; }
    /** 写入 64 位浮点数 */
    writeFloat64(v: number): void { this.ensure(8); this.view.setFloat64(this.offset, v, true); this.offset += 8; }

    /** UTF-8 字符串（前置 varint 长度） */
    writeString(s: string): void {
        const bytes = ByteWriter.utf8Encode(s);
        this.writeVarUint(bytes.length);
        this.ensure(bytes.length);
        this.buf.set(bytes, this.offset);
        this.offset += bytes.length;
    }

    /** 追加一段原始字节 */
    writeBytes(bytes: Uint8Array): void {
        this.ensure(bytes.length);
        this.buf.set(bytes, this.offset);
        this.offset += bytes.length;
    }

    /** 导出已写入的有效字节副本 */
    toUint8Array(): Uint8Array {
        return this.buf.slice(0, this.offset);
    }

    /** 已写入的字节数 */
    get length(): number {
        return this.offset;
    }

    /** UTF-8 编码字符串（无 TextEncoder 时回退到手动编码） */
    private static utf8Encode(s: string): Uint8Array {
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
        const out: number[] = [];
        for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            if (c < 0x80) out.push(c);
            else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
            else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
        }
        return new Uint8Array(out);
    }
}

/**
 * 二进制读缓冲（小端）。
 */
export class ByteReader {
    /** 小端 DataView 视图 */
    private view: DataView;
    /** 当前读取偏移量 */
    private offset = 0;

    /**
     * 构造函数
     * @param buf 待读取的字节数组
     */
    constructor(private readonly buf: Uint8Array) {
        this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    }

    /** 剩余可读字节数 */
    get remaining(): number {
        return this.buf.length - this.offset;
    }

    /** 是否已读到末尾 */
    get eof(): boolean {
        return this.offset >= this.buf.length;
    }

    /** 读取无符号 LEB128 变长整数 */
    readVarUint(): number {
        let result = 0;
        let shift = 0;
        let byte: number;
        do {
            byte = this.buf[this.offset++];
            result |= (byte & 0x7f) << shift;
            shift += 7;
        } while (byte & 0x80);
        return result >>> 0;
    }

    /** 读取有符号 8 位整数 */
    readInt8(): number { const v = this.view.getInt8(this.offset); this.offset += 1; return v; }
    /** 读取无符号 8 位整数 */
    readUint8(): number { const v = this.view.getUint8(this.offset); this.offset += 1; return v; }
    /** 读取有符号 16 位整数 */
    readInt16(): number { const v = this.view.getInt16(this.offset, true); this.offset += 2; return v; }
    /** 读取无符号 16 位整数 */
    readUint16(): number { const v = this.view.getUint16(this.offset, true); this.offset += 2; return v; }
    /** 读取有符号 32 位整数 */
    readInt32(): number { const v = this.view.getInt32(this.offset, true); this.offset += 4; return v; }
    /** 读取无符号 32 位整数 */
    readUint32(): number { const v = this.view.getUint32(this.offset, true); this.offset += 4; return v; }
    /** 读取 32 位浮点数 */
    readFloat32(): number { const v = this.view.getFloat32(this.offset, true); this.offset += 4; return v; }
    /** 读取 64 位浮点数 */
    readFloat64(): number { const v = this.view.getFloat64(this.offset, true); this.offset += 8; return v; }

    /** 读取 UTF-8 字符串（前置 varint 长度） */
    readString(): string {
        const len = this.readVarUint();
        const bytes = this.buf.subarray(this.offset, this.offset + len);
        this.offset += len;
        return ByteReader.utf8Decode(bytes);
    }

    /** UTF-8 解码字节为字符串（无 TextDecoder 时回退到手动解码） */
    private static utf8Decode(bytes: Uint8Array): string {
        if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
        let out = '';
        let i = 0;
        while (i < bytes.length) {
            const c = bytes[i++];
            if (c < 0x80) out += String.fromCharCode(c);
            else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
            else out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
        }
        return out;
    }
}
