// map.js

let indexMap;
let currentOverlay;
let isAddPhotoEnabled = false; // 開關，用於控制是否啟用 addPHOTO

// 初始化地图
export function initMap(mapId) {
    indexMap = L.map(mapId).setView([24.957276277371435, 121.21903318892302], 13);
    createBaseLayers();
    

    var $offcanvasElement = $('#layerListBlock');
    var $indexMapElement = $('#indexMap');


    // 當 offcanvas 開啟時壓縮地圖
    $offcanvasElement.on('shown.bs.offcanvas', function () {
        var offcanvasWidth = $offcanvasElement.outerWidth();
        $indexMapElement.css({
            'transition': 'all 0.3s ease-in-out',
            'margin-left': offcanvasWidth + 'px',
            'width': 'calc(100% - ' + offcanvasWidth + 'px)'
        });
    });

    // 當 offcanvas 關閉時恢復地圖
    $offcanvasElement.on('hidden.bs.offcanvas', function () {
        $indexMapElement.css({
            'margin-left': '0',
            'width': '100%'
        });
    });

    return indexMap;
}

function createBaseLayers() {
    // 創建不同的 pane 來控制圖層順序
    indexMap.createPane('basePane');
    indexMap.createPane('overlayPane');
    indexMap.createPane('photoPane');

    indexMap.getPane('basePane').style.zIndex = 200;
    indexMap.getPane('overlayPane').style.zIndex = 400;
    indexMap.getPane('photoPane').style.zIndex = 300;

    var GoogleRoad = L.gridLayer.googleMutant({
        type: "roadmap", // valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
        pane: 'basePane'
    }).addTo(indexMap);

    var OpenStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        pane: 'basePane'
    });

    var EMAP = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms',
        {
            layers: 'EMAP',  // WMS 圖層名稱
            format: 'image/png',  // 圖片格式
            transparent: true,    // 是否透明背景
            attribution: "Map data © WMS provider",
            pane: 'basePane'
        });

    var LANDSECT = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms',
        {
            layers: 'LANDSECT',  // WMS 圖層名稱
            format: 'image/png',  // 圖片格式
            transparent: true,    // 是否透明背景
            attribution: "Map data © WMS provider",
            pane: 'overlayPane'
        });


    //var PHOTO2 = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms',
    //    {
    //        layers: 'PHOTO2',  // WMS 圖層名稱
    //        format: 'image/png',  // 圖片格式
    //        transparent: true,    // 是否透明背景
    //        attribution: "Map data © WMS provider",
    //        pane: 'photoPane'
    //    });

    var CITY = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms',
        {
            layers: 'CITY',  // WMS 圖層名稱
            format: 'image/png',  // 圖片格式
            transparent: true,    // 是否透明背景
            attribution: "Map data © WMS provider",
            pane: 'overlayPane'
        });

    var TOWN = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms',
        {
            layers: 'TOWN',      // 圖層名稱
            format: 'image/png',
            transparent: true,
            attribution: "WMS layer 2",
            pane: 'overlayPane'
        });

    var LUIMAP = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms', {
        layers: 'LUIMAP',      // 圖層名稱
        format: 'image/png',
        transparent: true,
        attribution: "WMS layer 3",
        pane: 'overlayPane'
    });


    var Village = L.tileLayer.wms('https://wms.nlsc.gov.tw/wms', {
        layers: 'Village',      // 圖層名稱
        format: 'image/png',
        transparent: true,
        attribution: "WMS layer 3",
        pane: 'overlayPane'
    });

    // 基本圖層 (單選)
    var baseMaps = {
        "Open Street地圖": OpenStreet,
        "Google 街景地圖": GoogleRoad,
        "臺灣通用電子地圖": EMAP,
    };

    // 疊加圖層 (多選)
    var overlayMaps = {
        "地段圖": LANDSECT,
        "縣市界": CITY,
        "鄉鎮區界": TOWN,
        "村里界": Village,
        "國土利用現況調查成果圖": LUIMAP
    };

    L.control.layers(baseMaps, overlayMaps).addTo(indexMap);
}

//function addPHOTO(e) {
//    if (currentOverlay) {
//        indexMap.removeLayer(currentOverlay);
//    }

//    var latlng = e.latlng;
//    var bounds = [
//        [latlng.lat - 0.01, latlng.lng - 0.01],
//        [latlng.lat + 0.01, latlng.lng + 0.01]
//    ];

//    currentOverlay = L.imageOverlay('https://wms.nlsc.gov.tw/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=PHOTO2&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=true&BBOX='
//        + bounds[0][1] + ',' + bounds[0][0] + ',' + bounds[1][1] + ',' + bounds[1][0] + '&WIDTH=1024&HEIGHT=1024&SRS=EPSG:4326',
//        bounds, { pane: 'photoPane', interactive: false }).addTo(indexMap);
//}
export function getIndexMap() {
    return indexMap;
}