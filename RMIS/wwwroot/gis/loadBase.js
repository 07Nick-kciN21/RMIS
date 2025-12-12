// ============================================================================
// loadBase.js - 功能載入器模板
// 負責動態載入和管理所有功能模組的生命週期
// ============================================================================
import { initFunc } from './widgets/initFunc.js';
import { PanelController } from './widgets/controller/panelController.js';
import { LayerBarController } from './widgets/controller/leftLayerBarController.js';
import { painterPanel } from './widgets/panel/painter/painterPanel.js';
import { searchPanel } from './widgets/panel/search/searchPanel.js';
import { measurePanel } from './widgets/panel/measure/measurePanel.js';
import { focusPanel } from './widgets/panel/focus/focusPanel.js';
import { flagPanel } from './widgets/panel/flag/flagPanel.js';
import { searchPropPanel } from './widgets/panel/searchprop/searchPropPanel.js';
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
let uiTotal = 1;
let uiCount = 0;
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
        // ====================================================================
        // 面板初始化
        // ====================================================================
        objCenter.push(painterPanel.set(appCore));
        objCenter.push(searchPanel.set(appCore));
        objCenter.push(measurePanel.set(appCore));
        objCenter.push(focusPanel.set(appCore));
        objCenter.push(flagPanel.set(appCore));
        objCenter.push(searchPropPanel.set(appCore));
        // 載入介面
        loadFuncs();

        /**
         * 載入功能特性
         * 初始化 UI 系統和容器
         */
        // 容器載入 => 內容物載入
        function loadFuncs() {
            console.log("初始化 UI 容器系統...", objCenter);
            $("#js-load-left-maptool").load('/gis/html-template/left-toolbar.html', function() {
                uiOk();
            });
            // $("#js-load-panel-features").load('/gis/html-template/panel-box.html', function () {
            //     uiOk();
            // });
        };
        function uiOk(){
            uiCount++;
            console.log("ui 準備中...");
            if(uiCount == uiTotal){
                console.log("ui 初始化完成");
                let Template = $.templates("#template_left_toolbar");
                let HtmlOutput = Template.render(initFunc);
                $("#left_toolBar").append(HtmlOutput);
                // UI 建立器初始化
                $.each(initFunc.config_func, function (i, func) {
                    let funcId = func.funcId;
                    let tbId = "tb-" + funcId;
                    let instance = getFuncInstance(funcId);
                    let content = func.content || {};

                    // -------------------------
                    // panel 類型（有 HTML + CSS）
                    // -------------------------
                    if (func.box === 'panel') {

                        $.get(content.url, function (html) {

                            // append panel HTML
                            $("#panel-box").append(html);
                            $("#" + funcId).hide();

                            // load CSS (如果有)
                            if (content.css && $(`link[href="${content.css}"]`).length === 0) {
                                $("<link/>", {
                                    rel: "stylesheet",
                                    type: "text/css",
                                    href: content.css
                                }).appendTo("head");
                                console.log("CSS 已載入:", content.css);
                            }

                            // panel div
                            let $panel = $("#panel-box").find(".panel").last();
                            let divId = $panel.attr("id");

                            panelController.register({
                                funcId: funcId,
                                buttonId: tbId,
                                divId: divId,
                                openFunc: () => instance.open(),
                                closeFunc: () => instance.close()
                            });
                        });
                    }

                    // -------------------------
                    // action 類型（無 HTML / CSS）
                    // -------------------------
                    else if (func.box === 'action') {

                        panelController.register({
                            funcId: funcId,
                            buttonId: tbId,
                            divId: null, // 沒面板
                            openFunc: () => instance.open(),
                            closeFunc: () => instance.close ? instance.close() : null
                        });

                    }

                });

                
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
    }
};  

export { loadBase };