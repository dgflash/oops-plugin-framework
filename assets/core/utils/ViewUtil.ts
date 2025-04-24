/*
 * @Author: dgflash
 * @Date: 2021-08-16 09:34:56
 * @LastEditors: dgflash
 * @LastEditTime: 2023-01-19 14:52:12
 */
import { Animation, AnimationClip, EventTouch, instantiate, Node, Prefab, Size, UITransform, v3, Vec3 } from "cc";
import { resLoader } from "../common/loader/ResLoader";

/** 显示对象工具 */
export class ViewUtil {
    /**
     * 把Node当前的节点树结构根据Node命名转成一个js对象,重名的组件会覆盖，
     * Node的name不应该包含空格键，否则将跳过
     * @param parent 被遍历的Node组件
     * @param obj    绑定的js对象 (可选)
     */
    static nodeTreeInfoLite(parent: Node, obj?: Map<string, Node>): Map<string, Node> | null {
        let map: Map<string, Node> = obj || new Map();
        let items = parent.children;
        for (let i = 0; i < items.length; i++) {
            let _node = items[i];
            if (_node.name.length > 0) {
                if (map.has(_node.name))
                    console.error(`使用ViewUtil.nodeTreeInfoLite方法时发现重复的节点名称【${_node.name}】`);
                else
                    map.set(_node.name, _node);
            }
            ViewUtil.nodeTreeInfoLite(_node, map);
        }
        return map;
    }

    /**
     * 正则搜索节点名字,符合条件的节点将会返回
     * @param reg     正则表达式
     * @param parent  要搜索的父节点
     * @param nodes   返回的数组（可选）
     */
    static findNodes(reg: RegExp, parent: Node, nodes?: Array<Node>): Array<Node> {
        let ns: Array<Node> = nodes || [];
        let items = parent.children;
        for (let i = 0; i < items.length; i++) {
            let _name: string = items[i].name;
            if (reg.test(_name)) {
                ns.push(items[i]);
            }
            ViewUtil.findNodes(reg, items[i], ns);
        }
        return ns;
    };

    /**
     * 节点之间坐标互转
     * @param a         A节点
     * @param b         B节点
     * @param aPos      A节点空间中的相对位置
     */
    static calculateASpaceToBSpacePos(a: Node, b: Node, aPos: Vec3): Vec3 {
        const world: Vec3 = a.getComponent(UITransform)!.convertToWorldSpaceAR(aPos);
        return b.getComponent(UITransform)!.convertToNodeSpaceAR(world);
    }

    /**
     * 屏幕转空间坐标
     * @param event 触摸事件
     * @param space 转到此节点的坐标空间
     */
    static calculateScreenPosToSpacePos(event: EventTouch, space: Node): Vec3 {
        const uil = event.getUILocation();
        const worldPos: Vec3 = v3(uil.x, uil.y);
        return space.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
    }

    /**
     * 显示对象等比缩放
     * @param targetWidth       目标宽
     * @param targetHeight      目标高
     * @param defaultWidth      默认宽
     * @param defaultHeight     默认高
     */
    static uniformScale(targetWidth: number, targetHeight: number, defaultWidth: number, defaultHeight: number) {
        const widthRatio = defaultWidth / targetWidth;
        const heightRatio = defaultHeight / targetHeight;
        let ratio;
        widthRatio < heightRatio ? ratio = widthRatio : ratio = heightRatio;
        return new Size(Math.floor(targetWidth * ratio), Math.floor(targetHeight * ratio));
    }

    /**
     * 从资源缓存中找到预制资源名并创建一个显示对象（建议使用GameComponent里的同名方法，能自动管理内存施放）
     * @param path        资源路径
     * @param bundleName  资源包名
     */
    static createPrefabNode(path: string, bundleName: string = resLoader.defaultBundleName): Node {
        const p = resLoader.get(path, Prefab, bundleName);
        if (p) {
            return instantiate(p);
        }
        return null!;
    }

    /**
     * 加载预制并创建预制节点（建议使用GameComponent里的同名方法，能自动管理内存施放）
     * @param path        资源路径
     * @param bundleName  资源包名
     */
    static createPrefabNodeAsync(path: string, bundleName: string = resLoader.defaultBundleName): Promise<Node> {
        return new Promise(async (resolve, reject) => {
            const p = await resLoader.loadAsync(bundleName, path, Prefab);
            if (p) {
                resolve(instantiate(p));
            }
            else {
                console.error(`名为【${path}】的资源加载失败`);
                resolve(null!);
            }
        });
    }

    /**
     * 添加节点动画
     * @param path              资源路径
     * @param node              目标节点
     * @param onlyOne           是否唯一
     * @param isDefaultClip     是否播放默认动画剪辑
     */
    static addNodeAnimation(path: string, node: Node, onlyOne: boolean = true, isDefaultClip: boolean = false) {
        if (!node || !node.isValid) {
            return;
        }

        let anim = node.getComponent(Animation);
        if (anim == null) {
            anim = node.addComponent(Animation);
        }

        const clip = resLoader.get(path, AnimationClip) as AnimationClip;
        if (!clip) {
            return;
        }

        if (onlyOne && anim.getState(clip.name) && anim.getState(clip.name).isPlaying) {
            return;
        }

        if (isDefaultClip) {
            anim.defaultClip = clip;
            anim.play();
            return;
        }

        // 播放完成后恢复播放默认动画
        anim.once(Animation.EventType.FINISHED, () => {
            if (anim!.defaultClip) {
                anim!.play();
            }
        }, this);

        if (anim.getState(clip.name)) {
            anim.play(clip.name);
            return
        }
        anim.createState(clip, clip!.name);
        anim.play(clip!.name);
    }
}