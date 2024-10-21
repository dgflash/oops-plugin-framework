import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { App, createApp } from 'vue';
import { createScript, createScriptBll, createScriptModule, createView } from '../create-script';
import { TemplateGameComponent } from '../template/GameComponent';
import { TemplateModule } from '../template/Module';
import { TemplateBll } from '../template/ModuleBll';
import { TemplateModel } from '../template/ModuleModel';
import { TemplateView } from '../template/ModuleView';
import { TemplateViewMvvm } from '../template/ModuleViewVM';

const panelDataMap = new WeakMap<any, App>();

module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    ready() {
        var args = arguments as any;
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
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            app.component('MyConfig', {
                template: readFileSync(join(__dirname, '../../static/template/vue/set_file_name.html'), 'utf-8'),
                data() {
                    return {
                        title: title,
                        filename: filename,
                        showModule: showModule
                    };
                },
                methods: {
                    // 记录输入的文件名
                    onInputName(event: any) {
                        filename = event.target.value;
                    },
                    onModuleName(event: any) {
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
                                await createView(path, filename, TemplateGameComponent, false);
                                break;
                            case "Module":
                                await createScriptModule(path, filename, TemplateModule);
                                break;
                            case "Model":
                                await createScript(path, filename, TemplateModel);
                                break;
                            case "Bll":
                                await createScriptBll(path, filename, TemplateBll, moduleName);
                                break;
                            case "View":
                                await createView(path, filename, TemplateView);
                                break;
                            case "ViewMvvm":
                                await createView(path, filename, TemplateViewMvvm);
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
