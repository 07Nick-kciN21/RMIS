let uiTotal = 1;
let uiCount = 0;
/**
 * 載入功能特性
 * 初始化 UI 系統和容器
 */
// 容器載入 => 內容物載入
function loadFuncs() {
    $("#js-load-left-maptool").load('/gis/html-template/left-toolbar.html', function() {
        uiOk();
    });
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
                });
            }
        });

        if(appGlobal.start && appGlobal.mapOk){
            appGlobal.start();
        }
        appGlobal.uiOK = true;
        console.log("uiOk = true");
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

// 載入介面
loadFuncs();