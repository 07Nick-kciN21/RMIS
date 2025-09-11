// ============================================================================
// loadBase.js - 功能載入器模板
// 負責動態載入和管理所有功能模組的生命週期
// ============================================================================
import { initFunc } from './widgets/initFunc.js';
import { PanelController } from './widgets/controller/panelController.js';
import { painterPanel } from './widgets/panel/painter/painterPanel.js';
import { searchPanel } from './widgets/panel/search/searchPanel.js';
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
        // ====================================================================
        // 地圖工具模組初始化區塊
        // ====================================================================
        // ====================================================================
        // 面板初始化
        // ====================================================================
        objCenter.push(painterPanel.set(appCore));
        objCenter.push(searchPanel.set(appCore));
        // 載入介面
        loadFuncs();

        /**
         * 載入功能特性
         * 初始化 UI 系統和容器
         */
        function loadFuncs() {
            console.log("初始化 UI 容器系統...");
            $("#js-load-left-maptool").load('/gis/html-template/left-toolbar.html', function() {});
            // 先load templete
            $("#js-load-panel-features").load('/gis/html-template/panel-box.html', function () {});

            // UI 建立器初始化
            // concatenate.init();
            $.each(initFunc.config_func, function (i, func) {
                var url = func.url;
                console.log(func);
                if(func.box == 'panel'){
                    let divId = "p_" + func.funcId;
                    let tbId = "tb-" + func.funcId; // e.g. tb-searchPanel
                    $("#panel-box").append(`<div id=${divId}>load</div>`);
                    $(`#${divId}`).hide();
                    $(`#${divId}`).load(func.url, function () {
                        // head 載入css
                        if ($(`link[href="${func.css}"]`).length === 0) {
                            $("<link/>", {
                                rel: "stylesheet",
                                type: "text/css",
                                href: func.css
                            }).appendTo("head");
                            console.log("CSS 已載入:", func.css);
                        };
                        console.log(func.funcId, tbId, divId);
                        panelController.register({
                            funcId: func.funcId,
                            buttonId: tbId,
                            divId: divId,
                            openFunc: () => console.log(func.funcId + "開啟"),
                            closeFunc: () => console.log(func.funcId + "關閉"),
                        });  
                    });
                };
            });
        };  
    }
};  

export { loadBase };