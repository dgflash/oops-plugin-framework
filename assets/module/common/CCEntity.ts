import type { Node } from 'cc';
import { oops } from '../../core/Oops';
import { gui } from '../../core/gui/Gui';
import type { UIParam } from '../../core/gui/layer/LayerUIElement';
import { LayerUIElement } from '../../core/gui/layer/LayerUIElement';
import { ViewUtil } from '../../core/utils/ViewUtil';
import { ecs } from '../../libs/ecs/ECS';
import type { ECSEntity } from '../../libs/ecs/ECSEntity';
import type { CompType } from '../../libs/ecs/ECSModel';
import type { BusinessCtor, EntityCtor, GUIView, UICtor, ViewCtor } from '../types/Types';
import type { CCBusiness } from './CCBusiness';
import { GameComponent } from './GameComponent';

/** ECS 游戏模块实体 */
export abstract class CCEntity extends ecs.Entity {
    //#region 子模块管理

    /** 单例子实体集合（key: 实体类构造函数，value: 实体实例） */
    private singletons: Map<EntityCtor, ECSEntity> = null!;

    /**
     * 批量添加单例子实体
     * @param clss 单例子实体类数组
     */
    addChildSingletons<T extends CCEntity>(...clss: EntityCtor<T>[]): void {
        for (const ctor of clss) {
            this.addChildSingleton<T>(ctor);
        }
    }

    /**
     * 添加单例子实体
     * @param cls 单例子实体类
     * @returns   单例子实体
     */
    addChildSingleton<T extends CCEntity>(cls: EntityCtor<T>): T {
        if (this.singletons == null) this.singletons = new Map();
        if (this.singletons.has(cls)) {
            console.error(`${cls.name} 单例子实体已存在`);
            return null!;
        }
        const entity = ecs.getEntity<T>(cls);
        this.singletons.set(cls, entity);
        this.addChild(entity);
        return entity as T;
    }

    /**
     * 获取单例子实体
     * @param cls 单例子实体类
     * @returns   单例子实体，不存在则返回 null
     */
    getChildSingleton<T extends CCEntity>(cls: EntityCtor<T>): T {
        if (!this.singletons) return null!;
        return (this.singletons.get(cls) as T) || null!;
    }

    /**
     * 移除单例子实体
     * @param cls 单例子实体类
     */
    removeChildSingleton<T extends CCEntity>(cls: EntityCtor<T>): void {
        if (!this.singletons) return;

        const entity = this.singletons.get(cls);
        if (entity) {
            this.singletons.delete(cls);
            this.removeChild(entity);
            // 销毁实体及其资源，避免内存泄漏
            if (entity && typeof entity.destroy === 'function') {
                entity.destroy();
            }
        }
    }
    //#endregion

    //#region 游戏视图层管理
    /**
     * 通过资源内存中获取预制上的组件添加到ECS实体中
     * @param ctor       界面逻辑组件（支持 ECSView 或使用 gui.register 注册的 GUIView）
     * @param parent     显示对象父级
     * @param path       显示资源地址（可选，不传时使用 @game.prefab 装饰器注册的路径）
     * @param bundleName 资源包名称（可选，不传时使用 @game.prefab 装饰器注册的包名）
     */
    async addPrefab<T extends GUIView>(
        ctor: ViewCtor<T>,
        parent: Node | GameComponent,
        path?: string,
        bundleName?: string
    ): Promise<Node> {
        // 未传入路径时，从装饰器注册的数据中获取
        if (path == null) {
            path = (ctor as any).GAME_PREFAB_PATH;
            bundleName = (ctor as any).GAME_PREFAB_BUNDLE;
            if (path == null) {
                throw new Error(`组件 ${(ctor as any).name} 未使用 @game.prefab 装饰器注册，请添加 @game.prefab('path/to/prefab') 装饰器或手动传入路径参数`);
            }
        }

        let node: Node;

        // 跟随父节点释放自动释放当前资源
        if (parent instanceof GameComponent) {
            node = await parent.createPrefabNode(path, bundleName);
            const comp = node.getComponent(ctor);
            if (comp) this.add(comp as unknown as ecs.Comp);
            node.parent = parent.node;
        }
        // 手动内存管理
        else {
            node = await ViewUtil.createPrefabNodeAsync(path, bundleName);
            const comp = node.getComponent(ctor);
            if (comp) this.add(comp as unknown as ecs.Comp);
            node.parent = parent;
        }

        return node;
    }

    /**
     * 添加视图层组件
     * @param ctor     界面逻辑组件（支持 CCView 或使用 gui.register 注册的 GameComponent 子类）
     * @param params   界面参数
     * @returns 界面节点
     */
    async addUi<T extends GUIView>(ctor: UICtor<T>, params?: UIParam): Promise<Node> {
        const key = gui.internal.getKey(ctor);
        if (!key) {
            throw new Error(`${ctor.name} 界面组件未使用 gui.register 注册`);
        }

        if (params == null) {
            params = { preload: true };
        }
        else {
            params.preload = true;
        }

        if (oops.gui.has(key)) {
            console.warn(`${key} 界面已存在`);
            return oops.gui.get(key);
        }

        const node = await oops.gui.open(key, params);
        const comp = node.getComponent(ctor) as unknown as ecs.Comp;
        if (comp) this.add(comp);

        oops.gui.show(key);
        return node;
    }

    /**
     * 移除视图层组件
     * @param ctor      界面逻辑组件（支持 CCView 或使用 gui.register 注册的 GameComponent 子类）
     */
    removeUi(ctor: UICtor) {
        const key = gui.internal.getKey(ctor);

        if (key) {
            const node = oops.gui.get(key);
            if (node == null) {
                console.warn(`${key} 界面不存在或已关闭`);
                return;
            }

            const layer = node.getComponent(LayerUIElement);
            if (layer) {
                // 处理界面关闭动画播放完成后，移除ECS组件，避免使用到组件实体数据还在动画播放时在使用导致的空对象问题
                layer.onClose = () => {
                    try {
                        const view = node.getComponent(ctor) as unknown as ecs.Comp;
                        if (view) this.remove(ctor as unknown as CompType<ecs.IComp>);
                    }
                    catch (error) {
                        console.error(`移除界面组件失败: ${key}`, error);
                    }
                };
                oops.gui.remove(key);
            }
            else {
                // 没有 LayerUIElement，直接移除
                this.remove(ctor as unknown as CompType<ecs.IComp>);
            }
        }
        else {
            // 组件未使用 gui.register 注册，尝试直接移除
            this.remove(ctor as unknown as CompType<ecs.IComp>);
        }
    }
    //#endregion

    //#region 游戏业务层管理
    /** 模块业务逻辑组件集合（key: 业务类构造函数，value: 业务实例） */
    private businesss: Map<BusinessCtor, CCBusiness<CCEntity>> = null!;

    /**
     * 批量添加业务逻辑组件
     * @param clss 业务逻辑组件类数组
     */
    addBusinesss(...clss: BusinessCtor[]) {
        for (const ctor of clss) {
            this.addBusiness(ctor);
        }
    }

    /**
     * 添加业务逻辑组件
     * @param cls 业务逻辑组件类
     * @returns 业务逻辑组件实例
     */
    addBusiness<T extends CCBusiness<CCEntity>>(cls: BusinessCtor<T>): T {
        if (this.businesss == null) this.businesss = new Map();
        if (this.businesss.has(cls)) {
            console.error(`${cls.name} 业务逻辑组件已存在`);
            return null!;
        }
        const business = new cls();
        business.ent = this;
        //@ts-ignore
        business.init();
        this.businesss.set(cls, business);

        // 将业务逻辑组件直接附加到实体对象身上，方便直接获取
        Reflect.set(this, cls.name, business);

        return business as T;
    }

    /**
     * 获取业务逻辑组件
     * @param cls 业务逻辑组件类
     * @returns 业务逻辑组件实例，不存在则返回 null
     */
    getBusiness<T extends CCBusiness<CCEntity>>(cls: BusinessCtor<T>): T {
        if (!this.businesss) return null!;
        return (this.businesss.get(cls) as T) || null!;
    }

    /**
     * 移除业务逻辑组件
     * @param cls 业务逻辑组件类
     */
    removeBusiness<T extends CCBusiness<CCEntity>>(cls: BusinessCtor<T>): void {
        if (this.businesss) {
            const business = this.businesss.get(cls);
            if (business) {
                business.destroy();
                this.businesss.delete(cls);

                // 清理实体上的业务逻辑组件引用
                Reflect.set(this, cls.name, null);
            }
        }
    }
    //#endregion

    destroy(): void {
        // 1. 先销毁所有子实体，避免内存泄漏
        if (this.singletons) {
            this.singletons.forEach((entity) => {
                if (entity && typeof entity.destroy === 'function') {
                    entity.destroy();
                }
            });
            this.singletons.clear();
            this.singletons = null!;
        }

        // 2. 再销毁所有业务组件
        if (this.businesss) {
            this.businesss.forEach((business) => business.destroy());
            this.businesss.clear();
            this.businesss = null!;
        }

        super.destroy();
    }
}
