/*
 * @Author: dgflash
 * @Date: 2021-11-11 19:05:32
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 17:20:51
 */

import type { CCEntity } from './CCEntity';
import { CCView } from './CCView';

/** 兼容老版本 */
export abstract class CCViewVM<T extends CCEntity> extends CCView<T> {
    protected mvvm = true; // 启用 MVVM 功能
}