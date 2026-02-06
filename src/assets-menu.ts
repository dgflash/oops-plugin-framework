import { AssetInfo } from "../@types/packages/asset-db/@types/public";
import { compress } from "./tinypng";

/** 资源栏右键菜单 */
export function onAssetMenu(assetInfo: AssetInfo) {
    return [
        {
            label: 'i18n:oops-framework.name',
            submenu: [
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