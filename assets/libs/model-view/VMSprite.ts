import { assetManager, error, ImageAsset, Sprite, SpriteFrame, Texture2D, _decorator } from 'cc';
import { oops } from '../../core/Oops';
import { VMBase } from './VMBase';
import { VMEnv } from './VMEnv';

const { ccclass, property, menu, executeInEditMode } = _decorator;

/**
 *  [VM-Sprite]
 *  专门处理 Sprite 相关 的组件
 */
@ccclass
@executeInEditMode
@menu('ModelViewer/VMSprite(图片VM)')
export default class VMSprite extends VMBase {
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

    setLabelValue(path: string) {
        var self = this;
        if(path.indexOf("http") >= 0){
            if (path.slice(path.length - 4) == ".png") {
                // 远程 url 带图片后缀名
                assetManager.loadRemote<ImageAsset>(path, function (err, imageAsset) {
                    if (!err) {
                        const spriteFrame = new SpriteFrame();
                        const texture = new Texture2D();
                        texture.image = imageAsset;
                        spriteFrame.texture = texture;

                        if (self.node.isValid) {
                            self.node.getComponent(Sprite)!.spriteFrame = spriteFrame;
                        }
                    } else {
                        console.log("图片加载失败");
                    }
                });
            } else {
                // 远程 url 不带图片后缀名，此时必须指定远程图片文件的类型
                assetManager.loadRemote<ImageAsset>(path, {ext: '.png'}, function (err, imageAsset) {
                    if (!err) {
                        const spriteFrame = new SpriteFrame();
                        const texture = new Texture2D();
                        texture.image = imageAsset;
                        spriteFrame.texture = texture;

                        if(self.node.isValid){
                            self.node.getComponent(Sprite)!.spriteFrame = spriteFrame;
                        }
                    } else {
                        console.log("加载头像失败");
                    }
                });
            }
        }else{
            if(!path){
                self.node!.getComponent(Sprite)!.spriteFrame = null;
                return;
            }
            
            oops.res.load(`${path}/spriteFrame`, SpriteFrame, (err: Error, sp: SpriteFrame) => {
                if (err) {
                    console.error(`加载【${`${path}/spriteFrame`}】的 图片 资源不存在`);
                    return;
                }
                if (!self.node || !self.node.isValid) return;
                self.node!.getComponent(Sprite)!.spriteFrame = sp;
                sp.addRef();
            });
        }
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
