/*
 * @Author: dgflash
 * @Date: 2022-09-01 18:03:51
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-06 17:27:03
 */

// 该文件用作typedoc的入口点模块——我们的API生成器
// 注：为避免项目代码中引用到生成API文档的TS文件，所以后缀加了.x避免VsCode提示导入，生成文档时去掉.x即可

/** core/common */
export * from './assets/core/common/audio/AudioEffect';
export * from './assets/core/common/audio/AudioManager';
export * from './assets/core/common/audio/AudioMusic';
export * from './assets/core/common/event/EventDispatcher';
export * from './assets/core/common/event/EventMessage';
export * from './assets/core/common/event/MessageManager';
export * from './assets/core/common/loader/ResLoader';
export * from './assets/core/common/log/Logger';
export * from './assets/core/common/manager/RandomManager';
export * from './assets/core/common/manager/TimerManager';
export * from './assets/core/common/storage/StorageManager';
/** core/game */
export * from './assets/core/game/GameCollision';
export * from './assets/core/game/GameComponent';
export * from './assets/core/game/GameManager';
/** core/gui */
export * from './assets/core/gui/GUI';
export * from './assets/core/gui/layer/Defines';
export * from './assets/core/gui/layer/DelegateComponent';
export * from './assets/core/gui/layer/LayerDialog';
export * from './assets/core/gui/layer/LayerManager';
export * from './assets/core/gui/layer/LayerNotify';
export * from './assets/core/gui/layer/LayerPopup';
export * from './assets/core/gui/layer/LayerUI';
export * from './assets/core/gui/layer/UIMap';
export * from './assets/core/gui/prompt/CommonPrompt';
export * from './assets/core/gui/prompt/LoadingIndicator';
export * from './assets/core/gui/prompt/Notify';
export * from './assets/core/Oops';
export * from './assets/core/Root';
/** core/utils */
export * from './assets/core/utils/ArrayUtil';
export * from './assets/core/utils/CameraUtil';
export * from './assets/core/utils/EncryptUtil';
export * from './assets/core/utils/ImageUtil';
export * from './assets/core/utils/JsonUtil';
export * from './assets/core/utils/LayerUtil';
export * from './assets/core/utils/MathUtil';
export * from './assets/core/utils/ObjectUtil';
export * from './assets/core/utils/PhysicsUtil';
export * from './assets/core/utils/PlatformUtil';
export * from './assets/core/utils/RegexUtil';
export * from './assets/core/utils/RotateUtil';
export * from './assets/core/utils/StringUtil';
export * from './assets/core/utils/Vec3Util';
export * from './assets/core/utils/ViewUtil';
/** libs/ecs */
export * from './assets/libs/ecs/ECS';
export * from './assets/libs/ecs/ECSComp';
export * from './assets/libs/ecs/ECSEntity';
export * from './assets/libs/ecs/ECSSystem';
/** module/ecs */
export * from './assets/module/common/CCComp';
export * from './assets/module/common/CCVMParentComp';
/** module/config */
export * from './assets/module/config/Config';
export * from './assets/module/config/GameConfig';
export * from './assets/module/config/GameQueryConfig';