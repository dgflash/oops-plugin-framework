/**
 * 类名注册装饰器
 *
 * 由于 JS 打包压缩会改变类名（`ctor.name` 被混淆为单字母），
 * 使用此装饰器将原始类名保存到构造函数的静态属性上，打包后仍可获取。
 *
 * @example
 * ```typescript
 * @classname('B_Account_Login')
 * export class B_Account_Login extends CCBusiness<Account> { ... }
 *
 * // 获取注册名
 * getClassName(B_Account_Login); // 'B_Account_Login'
 * ```
 */

/** 装饰器写入的静态属性名 */
const CLASS_NAME_KEY = 'CLASS_NAME';

/**
 * 类装饰器工厂：注册类名，防止打包压缩后 `ctor.name` 被混淆。
 * @param name 类注册名（须与源码中的类名一致）
 */
export function classname(name: string): ClassDecorator {
    return function (ctor: Function): void {
        (ctor as any)[CLASS_NAME_KEY] = name;
    };
}

/**
 * 获取类的注册名，未注册时回退到 `ctor.name`。
 * @param ctor 类构造函数
 * @returns 注册名或原始类名
 */
export function getClassName(ctor: Function): string {
    return (ctor as any)[CLASS_NAME_KEY] || ctor.name;
}
