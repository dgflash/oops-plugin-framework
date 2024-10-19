"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetMenu = void 0;
const tinypng_1 = require("./tinypng");
/** 资源栏右键菜单 */
function onAssetMenu(assetInfo) {
    return [
        {
            label: 'i18n:oops-framework.name',
            submenu: [
                {
                    label: `i18n:oops-framework.script`,
                    submenu: [
                        {
                            label: `i18n:oops-framework.createGameComponent`,
                            async click() {
                                localStorage.setItem('create_path', assetInfo.file);
                                localStorage.setItem('create_type', "GameComponent");
                                Editor.Panel.open("oops-framework.set_file_name");
                            },
                        },
                        {
                            type: `separator`,
                        },
                        {
                            label: `i18n:oops-framework.createModule`,
                            click() {
                                localStorage.setItem('create_path', assetInfo.file);
                                localStorage.setItem('create_type', "Module");
                                Editor.Panel.open("oops-framework.set_file_name");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createModel`,
                            click() {
                                localStorage.setItem('create_path', assetInfo.file);
                                localStorage.setItem('create_type', "Model");
                                Editor.Panel.open("oops-framework.set_file_name");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createBll`,
                            click() {
                                localStorage.setItem('create_path', assetInfo.file);
                                localStorage.setItem('create_type', "Bll");
                                Editor.Panel.open("oops-framework.set_file_name");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createView`,
                            click() {
                                localStorage.setItem('create_path', assetInfo.file);
                                localStorage.setItem('create_type', "View");
                                Editor.Panel.open("oops-framework.set_file_name");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createViewMvvm`,
                            click() {
                                localStorage.setItem('create_path', assetInfo.file);
                                localStorage.setItem('create_type', "ViewMvvm");
                                Editor.Panel.open("oops-framework.set_file_name");
                            },
                        },
                    ]
                },
                {
                    label: `i18n:oops-framework.tools`,
                    submenu: [
                        {
                            label: `i18n:oops-framework.tools_compress`,
                            click() {
                                (0, tinypng_1.compress)(assetInfo.file);
                            },
                        }
                    ]
                }
            ],
        },
    ];
}
exports.onAssetMenu = onAssetMenu;
;
