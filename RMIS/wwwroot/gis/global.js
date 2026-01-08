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

require([
        'leaflet',
        'leaflet-geoman',
        'leaflet-draw',
        'leaflet-polylinedecorator',
        'leaflet-markercluster',
        'togeojson',
        'leaflet-omnivore',
        'leaflet-googlemutant',
        'leaflet-pip',
        'leaflet-geometryutil',
        'leaflet-editable',
        'proj4'
    ], function(L, geoman, draw, decorator, markercluster, toGeoJSON, omnivore, googlemutant, pip, geometryutil, editable, proj4) {
        
        console.log('✅ 所有 Leaflet 模組載入完成');
        
        // 確保全局可用（如果需要）
        appGlobal.L = L;
        appGlobal.proj4 = proj4;
        appGlobal.toGeoJSON = toGeoJSON;
        
        // 觸發自定義事件表示載入完成
        appGlobal.leafletReady = true;
        window.dispatchEvent(new CustomEvent('leaflet-ready', {
            detail: { L, proj4, toGeoJSON }
        }));
        
        if(appGlobal.start && appGlobal.uiOK){
            appGlobal.start();
        }
        appGlobal.mapOK = true;
        console.log("mapOK = true");
    });


// uiOK 
console.log(appGlobal.mapDevice);