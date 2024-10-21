"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const create_script_1 = require("../create-script");
const GameComponent_1 = require("../template/GameComponent");
const Module_1 = require("../template/Module");
const ModuleBll_1 = require("../template/ModuleBll");
const ModuleModel_1 = require("../template/ModuleModel");
const ModuleView_1 = require("../template/ModuleView");
const ModuleViewVM_1 = require("../template/ModuleViewVM");
const panelDataMap = new WeakMap();
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    ready() {
        var args = arguments;
        let filename = "Default";
        let path = args[0];
        let type = args[1];
        let title = "???";
        let showModule = false;
        let moduleName = "ModuleName";
        switch (type) {
            case "GameComponent":
                title = `i18n:oops-framework.createGameComponent`;
                break;
            case "Module":
                title = `i18n:oops-framework.createModule`;
                break;
            case "Model":
                title = `i18n:oops-framework.createModel`;
                break;
            case "Bll":
                title = `i18n:oops-framework.createBll`;
                showModule = true;
                break;
            case "View":
                title = `i18n:oops-framework.createView`;
                break;
            case "ViewMvvm":
                title = `i18n:oops-framework.createViewMvvm`;
                break;
        }
        // 创建框架配置界面
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            app.component('MyConfig', {
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../static/template/vue/set_file_name.html'), 'utf-8'),
                data() {
                    return {
                        title: title,
                        filename: filename,
                        showModule: showModule
                    };
                },
                methods: {
                    // 记录输入的文件名
                    onInputName(event) {
                        filename = event.target.value;
                    },
                    onModuleName(event) {
                        moduleName = event.target.value;
                    },
                    // 创建文件
                    async onConfirm() {
                        if (filename.trim().length == 0) {
                            await Editor.Dialog.info('请输入文件名');
                            return;
                        }
                        switch (type) {
                            case "GameComponent":
                                await (0, create_script_1.createView)(path, filename, GameComponent_1.TemplateGameComponent, false);
                                break;
                            case "Module":
                                await (0, create_script_1.createScriptModule)(path, filename, Module_1.TemplateModule);
                                break;
                            case "Model":
                                await (0, create_script_1.createScript)(path, filename, ModuleModel_1.TemplateModel);
                                break;
                            case "Bll":
                                await (0, create_script_1.createScriptBll)(path, filename, ModuleBll_1.TemplateBll, moduleName);
                                break;
                            case "View":
                                await (0, create_script_1.createView)(path, filename, ModuleView_1.TemplateView);
                                break;
                            case "ViewMvvm":
                                await (0, create_script_1.createView)(path, filename, ModuleViewVM_1.TemplateViewMvvm);
                                break;
                        }
                        close();
                    }
                },
            });
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
