// 该文件用作typedoc的入口点模块——我们的API生成器
// 注：为避免项目代码中引用到生成API文档的TS文件，所以后缀加了.x避免VsCode提示导入，生成文档时去掉.x即可
// npx typedoc

/** core/common */
export * from './assets/core/common/audio/AudioEffect';
export * from './assets/core/common/audio/AudioEffectPool';
export * from './assets/core/common/audio/AudioManager';
export * from './assets/core/common/audio/AudioMusic';
export * from './assets/core/common/event/EventDispatcher';
export * from './assets/core/common/event/EventMessage';
export * from './assets/core/common/event/MessageManager';
export * from './assets/core/common/loader/ResLoader';
export * from './assets/core/common/log/Logger';
export * from './assets/core/common/random/RandomManager';
export * from './assets/core/common/random/SeedRandom';
export * from './assets/core/common/storage/StorageManager';
export * from './assets/core/common/storage/StorageSecuritySimple';
export * from './assets/core/common/timer/Timer';
export * from './assets/core/common/timer/TimerManager';
/** core/game */
export * from './assets/core/game/GameManager';
/** core/gui */
export * from './assets/core/gui/layer/Defines';
export * from './assets/core/gui/layer/DelegateComponent';
export * from './assets/core/gui/layer/LayerDialog';
export * from './assets/core/gui/layer/LayerManager';
export * from './assets/core/gui/layer/LayerNotify';
export * from './assets/core/gui/layer/LayerPopup';
export * from './assets/core/gui/layer/LayerUI';
export * from './assets/core/gui/prompt/CommonPrompt';
export * from './assets/core/gui/prompt/LoadingIndicator';
export * from './assets/core/gui/prompt/Notify';
// export * from './assets/core/Oops';
// export * from './assets/core/Root';
/** core/utils */
export * from './assets/core/utils/ArrayUtil';
export * from './assets/core/utils/CameraUtil';
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
/** libs/animator-effect */
// export * from './assets/libs/animator-effect/Effect2DFollow3D';
// export * from './assets/libs/animator-effect/EffectDelayRelease';
// export * from './assets/libs/animator-effect/EffectFinishedRelease';
// export * from './assets/libs/animator-effect/EffectSingleCase';
/** libs/collection */
export * from './assets/libs/collection/AsyncQueue';
export * from './assets/libs/collection/Collection';
/** libs/ecs */
export * from './assets/libs/ecs/ECS';
export * from './assets/libs/ecs/ECSComp';
export * from './assets/libs/ecs/ECSEntity';
export * from './assets/libs/ecs/ECSSystem';
/** libs/model-view */
export * from './assets/libs/model-view/JsonOb';
export * from './assets/libs/model-view/StringFormat';
export * from './assets/libs/model-view/ui/BhvButtonGroup';
export * from './assets/libs/model-view/ui/BhvFrameIndex';
export * from './assets/libs/model-view/ui/BhvRollNumber';
export * from './assets/libs/model-view/ui/BhvSwitchPage';
export * from './assets/libs/model-view/ViewModel';
export * from './assets/libs/model-view/VMBase';
export * from './assets/libs/model-view/VMCompsEdit';
export * from './assets/libs/model-view/VMCustom';
export * from './assets/libs/model-view/VMEvent';
export * from './assets/libs/model-view/VMLabel';
export * from './assets/libs/model-view/VMModify';
export * from './assets/libs/model-view/VMParent';
export * from './assets/libs/model-view/VMProgress';
export * from './assets/libs/model-view/VMState';

/** module/network */
export * from './assets/libs/network/HttpRequest';
export * from './assets/libs/network/NetInterface';
export * from './assets/libs/network/NetManager';
export * from './assets/libs/network/NetNode';
export * from './assets/libs/network/NetProtocolPako';
export * from './assets/libs/network/WebSock';
/** module/ecs */
export * from './assets/module/common/CCComp';
export * from './assets/module/common/CCVMParentComp';
export * from './assets/module/common/GameCollision';
export * from './assets/module/common/GameComponent';
export * from './assets/module/common/ModuleUtil';
/** module/config */
export * from './assets/module/config/Config';
export * from './assets/module/config/GameConfig';
export * from './assets/module/config/GameQueryConfig';
