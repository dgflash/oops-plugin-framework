import { assetManager, error, ImageAsset, Sprite, SpriteFrame, Texture2D, _decorator } from 'cc';
import { oops } from '../../core/Oops';
import { VMBase } from './VMBase';
import { VMEnv } from './VMEnv';
import { SpriteAtlas } from 'cc';

const { ccclass, property, menu, executeInEditMode } = _decorator;

/**
 *  [VM-Sprite]
 *  专门处理 Sprite 相关 的组件
 */
@ccclass
@executeInEditMode
@menu('ModelViewer/VMAtlasSprite(图片VM)')
export default class VMAtlasSprite extends VMBase {
    @property({
        tooltip: "监视对象路径"
    })
    watchPath: string = '';

    /** 按照匹配参数顺序保存的 path 数组 （固定） */
    protected watchPathArr: string[] = [];

    /** 按照路径参数顺序保存的 值的数组（固定）*/
    protected templateValueArr: any[] = [];

    onRestore() {
        this.checkLabel();
    }

    onLoad() {
        super.onLoad();
        this.checkLabel();

        if (VMEnv.editor) return;
    }

    start() {
        if (VMEnv.editor) return;

        this.onValueInit();
    }

    /** 初始化获取数据 */
    onValueInit() {
        this.setLabelValue(this.VM.getValue(this.watchPath));
    }

    /** 监听数据发生了变动的情况 */
    onValueChanged(n: any, o: any, pathArr: string[]) {
        this.setLabelValue(n);
    }

    setLabelValue(path: string[]) {
        var self = this;
        var node = self.node;
        if(!path){
            node.active = false
            return
        }

        node.active = true

        const [atlasPath, frameKey] = path//path.split(",");
        oops.res.load(atlasPath, SpriteAtlas, null, (err: Error, atlas: SpriteAtlas) => {
            if (err) {
                console.error(`加载【${`${atlasPath}`}】的 图片 资源不存在`, node?.name);
                return;
            }
            if (!node || !node.isValid) return;
            if(!atlas.getSpriteFrame(frameKey)) console.warn("没有找到对应的图片", frameKey, atlasPath);
            node!.getComponent(Sprite)!.spriteFrame = atlas.getSpriteFrame(frameKey);
            atlas.addRef();
        })
    }

    private checkLabel() {
        let comp = this.node.getComponent(Sprite);
        if (comp) {
            return true;
        }

        error('没有挂载任何Sprite组件');

        return false;
    }
}
