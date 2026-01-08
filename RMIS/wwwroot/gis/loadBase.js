// ============================================================================
// loadBase.js - 功能載入器模板
// 負責動態載入和管理所有功能模組的生命週期
// ============================================================================
import { PanelController } from './widgets/controller/panelController.js';
import { LayerBarController } from './widgets/controller/leftLayerBarController.js';
import { painterPanel } from './widgets/panel/painter/painterPanel.js';
import { searchPanel } from './widgets/panel/search/searchPanel.js';
import { measurePanel } from './widgets/panel/measure/measurePanel.js';
import { focusPanel } from './widgets/panel/focus/focusPanel.js';
import { flagPanel } from './widgets/panel/flag/flagPanel.js';
import { searchPropPanel } from './widgets/panel/searchprop/searchPropPanel.js';
import { facilityLayerList } from './map/init/menu.js';
// 功能實例中心
let objCenter = [];

// UI 容器陣列
let leftBag = [];      // 左側主面板（支援分頁）
let rightBag = [];     // 右側主面板（支援分頁）
let topBag = [];        // 頂部面板
let bottomBag = [];     // 底部面板（支援s分頁）
let fullBag = [];       // 全屏面板
let modalBag = [];      // 模態對話框面板
let popoverBag = [];    // 彈出視窗面板
let swipableBag = [];   // 滑動面板（移動端）

// ============================================================================
// 主要載入器物件
// ============================================================================

var loadBase = {
    /**
     * 初始化功能載入器
     * @param {Object} appCore - 應用程式核心物件
     */
    init: function (appCore) {
        console.log("開始載入功能模組...");
        var panelController = new PanelController();
        var layerBarController = new LayerBarController();
        // ====================================================================
        // 地圖工具模組初始化區塊
        // ====================================================================
        // 面板初始化
        // ====================================================================
        objCenter.push(facilityLayerList.set(appCore));
        
        objCenter.push(painterPanel.set(appCore));
        objCenter.push(searchPanel.set(appCore));
        objCenter.push(measurePanel.set(appCore));
        objCenter.push(focusPanel.set(appCore));
        objCenter.push(flagPanel.set(appCore));
        objCenter.push(searchPropPanel.set(appCore));
        console.log(objCenter);
        // 定義panel觸發事件
        $.each(objCenter, function (i, func) {
            let funcId = func.id;
            let tbId = "tb-" + funcId;
            let instance = getFuncInstance(funcId);
            let content = func.content || {};            
            // -------------------------
            // panel 類型（有 HTML + CSS）
            // -------------------------
            console.log(instance, funcId);
            let $panel = $("#panel-box").find("#" + funcId);
            let divId = $panel.attr("id");
            panelController.register({
                funcId: funcId,
                buttonId: tbId,
                divId: divId,
                openFunc: () => instance.open(),
                closeFunc: () => instance.close()
            });
            if (func.box === 'panel') {
                console.log(instance, funcId);
                let $panel = $("#panel-box").find("#" + funcId);
                let divId = $panel.attr("id");
                panelController.register({
                    funcId: funcId,
                    buttonId: tbId,
                    divId: divId,
                    openFunc: () => instance.open(),
                    closeFunc: () => instance.close()
                });
            }
            // -------------------------
            // action 類型（無 HTML / CSS）
            // -------------------------
        });

        function getFuncInstance(id){
            let instance;
            $.each(objCenter, function (i, obj) {
                if (obj.id === id) {
                    instance = obj;
                    return false;
                }
            });
            return instance;
        }

        appCore.layerList = new Proxy({}, {
            set(target, key, value) {
                target[key] = value;
                layerBarController.add(key, value.name, value.datas, value.metaData);
                return true;
            },
            deleteProperty(target, key) {
                if (key in target) {
                    layerBarController.remove(key);
                    delete target[key];
                    return true;
                }
                return false;
            }
        });
    }
};  

export { loadBase };