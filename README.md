<!--
 * @Author: dgflash
 * @Date: 2022-09-01 18:00:28
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-02 15:13:41
-->
#### 介绍
Oops Framework 基于 Cocos Creato 3.x 开发的一款游戏框架。
1. 提供游戏常用功能库，提高开发效率
2. 提供业务模块代码模板，降低程序设计难度
3. 框架内置模块低耦合，可自行删减不需要的模块，适应不同类型的游
4. 框架提供游戏常用插件工具
    - 热更新配置生成插件
    - 策划Excel配置表生成Json格式与配套ts代码插件

#### 技术文档
- [oops-framework](https://dgflash.gitee.io/oops-plugin-framework/)
- [ecs](https://gitee.com/dgflash/oops-framework/tree/master/doc/ecs/ecs.md)
- [mvvm](https://gitee.com/dgflash/oops-framework/tree/master/doc/mvvm)

#### 使用说明
1. 下载教程项目
```
git clone https://gitee.com/dgflash/oops-framework.git
```

2. 下载框架插件
    ##### windows
    执行根目录下的 update-oops-plugin-framework.bat 下载最新版本框架插件
    
    ##### mac
    项目下载后执行 update-oops-plugin-framework.sh 下载最新版本框架插件

#### 在线演示
- [框架部分功能演示](https://oops-1255342636.cos-website.ap-shanghai.myqcloud.com/oops-framework/)
- [全栈解决方案 oops-moba](https://store.cocos.com/app/detail/3814)
- [游戏地图模块 oops-rpg-2d](https://store.cocos.com/app/detail/3675)
- [游戏地图模块 oops-rpg-3d](https://oops-1255342636.cos-website.ap-shanghai.myqcloud.com/oops-solution/?type=2)
- [新手引导模块 oops-guide](https://store.cocos.com/app/detail/3653)
- [开源框架 oops-framework gitee](https://gitee.com/dgflash/oops-framework)
- [开源框架 oops-framework github](https://github.com/dgflash/oops-framework)

### 框架目录结构
```
core               - 框加核心技术库
    common             - 游戏公共模块
        audio              - 音频模块
        event              - 全局事件
        loader             - 加载模块
        log                - 日志模块
        manager            - 时间管理、随机管理
        storage            - 本地存储
    game               - 游戏世界类
    gui                - 游戏界面类
        layer              - 多层界面、窗口管理
        prompt             - 公共提示窗口
    utils              - 游戏各类工具库
    Oops.ts            - 框架功能访问接口
    Root.ts            - 框架视图层根节点管理组件
libs               - 框架中可选技术库
    animator           - 动画状态机
    animator-effect    - 动画特效组件
    animator-move      - 动画移动组件
    behavior-tree      - 行为树框架
    camera             - 三维摄像机控制组件
    collection         - 数据集合处理
    ecs                - ECS框架
    gui                - 界面组件
        badge              - 红点提示组件
        button             - 按钮组件
        label              - 标签组件
        language           - 多语言组件
    model-view         - MVVM框架
    network            - 网络模块
    render-texture     - 渲染纹理组件
    security           - 安全组件
module             - 游戏通用模块
    common             - 公共模块
    config             - 配置模块
```

1. 学习交流 QQ 群：798575969

    ![](http://dgflash.gitee.io/oops-full-stack-web/doc/img/qq.png)