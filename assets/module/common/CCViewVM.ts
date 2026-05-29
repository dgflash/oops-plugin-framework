import type { CCEntity } from './CCEntity';
import { CCView } from './CCView';

/** 兼容老版本 */
export abstract class CCViewVM<T extends CCEntity> extends CCView<T> {
    protected mvvm = true; // 启用 MVVM 功能
}