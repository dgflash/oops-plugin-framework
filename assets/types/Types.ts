import type { Node } from 'cc';
import type { GameComponent } from 'db://oops-framework/module/common/GameComponent';
import type { ecs } from 'db://oops-framework/libs/ecs/ECS';
import type { CCView } from 'db://oops-framework/module/common/CCView';
import type { CCEntity } from 'db://oops-framework/module/common/CCEntity';
import type { CCBusiness } from 'db://oops-framework/module/common/CCBusiness';

// ==================== 通用构造函数类型 ====================

/** 通用构造函数类型 */
type Ctor<T = any> = new (...args: any[]) => T;

// ==================== 视图类型 ====================

/** GameComponent 及其子类的构造函数类型，用于类型安全的组件实例化 */
export type GameComponentCtor<T extends GameComponent = GameComponent> = Ctor<T>;

/** UI 组件构造函数类型（用于继承自 GameComponent 并使用 gui.register 注册的组件） */
export type UICtor<T extends GameComponent = GameComponent> = Ctor<T>;

/** 通用的视图组件构造函数类型（支持 ECSView 或 GameComponent） */
export type ViewCtor<T extends GameComponent | ecs.Comp = GameComponent | ecs.Comp> = Ctor<T>;

/** ECS 游戏视图组件类型（继承自 CCView，用于完整的 ECS 组件） */
export type ECSView = CCView<CCEntity>;

/** 视图节点类型（Node 或 GameComponent） */
export type View = Node | GameComponent;

// ==================== 实体类型 ====================

/** ECS 实体构造函数类型 */
export type EntityCtor<T extends CCEntity = CCEntity> = Ctor<T>;

// ==================== 业务逻辑类型 ====================

/** ECS 业务逻辑组件构造函数类型 */
export type BusinessCtor<T extends CCBusiness<CCEntity> = CCBusiness<CCEntity>> = Ctor<T>;
