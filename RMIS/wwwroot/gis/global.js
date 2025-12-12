// ============================================================================
// global.js - 全域初始化模板
// 負責 ArcGIS API 載入、設備檢測和全域物件初始化
// ============================================================================

var appGlobal = {};

/**
 * 檢查當前網頁是否為行動裝置
 * @returns {boolean} 是否為行動裝置
 */
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

// ============================================================================
// 設備類型檢測和 CSS 類別設定
// ============================================================================
if (isMobileDevice()) {
    if($(window).width() < 576){
        appGlobal.mapDevice = "mobile";
        $('body').addClass('is-mobile');
    }else{
        appGlobal.mapDevice = "desktop";
    }
}else{
    appGlobal.mapDevice = "desktop";
}