import { AssetInfo } from "../@types/packages/asset-db/@types/public";
import { compress } from "./tinypng";

/** 资源栏右键菜单 */
export function onAssetMenu(assetInfo: AssetInfo) {
    return [
        {
            label: 'i18n:oops-framework.name',
            submenu: [
                {
                    label: `i18n:oops-framework.script`,
                    submenu: [
                        {
                            label: `i18n:oops-framework.createGameComponent`,
                            click() {
                                Editor.Panel.open("oops-framework.set_file_name", assetInfo.file, "GameComponent");
                            },
                        },
                        {
                            type: `separator`,
                        },
                        {
                            label: `i18n:oops-framework.createModule`,
                            click() {
                                Editor.Panel.open("oops-framework.set_file_name", assetInfo.file, "Module");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createModel`,
                            click() {
                                Editor.Panel.open("oops-framework.set_file_name", assetInfo.file, "Model");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createBll`,
                            click() {
                                Editor.Panel.open("oops-framework.set_file_name", assetInfo.file, "Bll");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createView`,
                            click() {
                                Editor.Panel.open("oops-framework.set_file_name", assetInfo.file, "View");
                            },
                        },
                        {
                            label: `i18n:oops-framework.createViewMvvm`,
                            click() {
                                Editor.Panel.open("oops-framework.set_file_name", assetInfo.file, "ViewMvvm");
                            },
                        },
                    ]
                },
                {
                    label: `i18n:oops-framework.tools_asset_menu`,
                    submenu: [
                        {
                            label: `i18n:oops-framework.tools_compress`,
                            click() {
                                compress(assetInfo.file);
                            },
                        }
                    ]
                }
            ],
        },
    ];
};