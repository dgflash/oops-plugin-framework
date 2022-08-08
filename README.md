<!--
 * @Author: dgflash
 * @Date: 2022-08-03 10:30:57
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-08 10:00:46
-->
#### 介绍
oops-plugin-framework 是基于 Cocos Creator 3.x 以插件形式使用的游戏框架，此版本框架代码与游戏具体业务逻辑代码分离，方便在项目开发过程随时更新框架最新版本代码。

#### 技术文档
- [oops-framework update](https://gitee.com/dgflash/oops-framework/tree/master/doc/using.md)
- [oops-framework](https://gitee.com/dgflash/oops-framework/tree/master/doc/core)
- [ecs](https://gitee.com/dgflash/oops-framework/tree/master/doc/ecs/ecs.md)
- [mvvm](https://gitee.com/dgflash/oops-framework/tree/master/doc/mvvm)

#### 使用说明
##### 第一次安装框架插件
###### windows
```
md extensions
cd extensions
git clone -b master https://gitee.com/dgflash/oops-plugin-framework.git
git pull
```

###### mac
```
mkdir -p extensions
cd extensions
git clone -b master https://gitee.com/dgflash/oops-plugin-framework.git
git pull
```

##### 后续更新框架插件新版本
```
git pull        // 对插件目录执行下列命令
```

#### 学习交流 QQ 群：798575969
![](http://dgflash.gitee.io/oops-full-stack-web/doc/img/qq.png)

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