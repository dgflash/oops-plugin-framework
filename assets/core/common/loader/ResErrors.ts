/** 资源加载错误类，包含上下文信息 */
export class ResourceError extends Error {
    /** 资源路径 */
    readonly path?: string;
    /** 资源包名 */
    readonly bundle?: string;
    /** 原始错误 */
    readonly cause?: Error | string;

    constructor(message: string, options?: { path?: string; bundle?: string; cause?: Error | string }) {
        super(message);
        this.name = 'ResourceError';
        this.path = options?.path;
        this.bundle = options?.bundle;
        this.cause = options?.cause;
    }

    /** 格式化错误信息 */
    toString(): string {
        let msg = `[ResourceError] ${this.message}`;
        if (this.bundle) msg += `\n  Bundle: ${this.bundle}`;
        if (this.path) msg += `\n  Path: ${this.path}`;
        if (this.cause) msg += `\n  Cause: ${this.cause instanceof Error ? this.cause.message : this.cause}`;
        return msg;
    }
}