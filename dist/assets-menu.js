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
                    label: `i18n:oops-framework.tools_asset_menu`,
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
