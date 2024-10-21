// map.js

let indexMap;

// 初始化地图
export function initMap(mapId) {
    indexMap = L.map(mapId).setView([24.957276277371435, 121.21903318892302], 13);
    createBaseLayers();
    

    var $offcanvasElement = $('#layerListBlock');
    var $indexMapElement = $('#indexMap');

    L.control.scale({
        position: 'bottomleft',  // 控制比例尺显示的位置
        metric: true,            // 显示公制单位
        imperial: false          // 不显示英制单位
    }).addTo(indexMap);

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

    indexMap.getPane('basePane').style.zIndex = 2;
    indexMap.getPane('overlayPane').style.zIndex = 4;
    indexMap.getPane('photoPane').style.zIndex = 3;


    //google街景
    var GoogleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    }).addTo(indexMap);
    //google衛星
    var GoogleSatellite = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    });
    //google地形
    var GoogleTerrain = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    });

    //google混和
    var GoogleHybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    });

    //openstreet
    var OpenStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        pane: 'basePane'
    });

    // 基本圖層 (單選)
    var baseMaps = {
        "Open Street地圖": OpenStreet,
        "Google 街景地圖": GoogleStreets,
        "Google 衛星地圖": GoogleSatellite,
        "Google 地形圖"  : GoogleTerrain,
        "Google 混和地圖": GoogleHybrid,
    };

    // 疊加圖層 (多選)
    var overlayMaps = {};

    // 從 API 取得地圖來源資料
    $.ajax({
        url: '/api/MapAPI/GetMapSources',
        type: 'POST',
        success: function (mapSources) {
            mapSources.wms.forEach(source => {
                const layer = L.tileLayer.wms(source.url, {
                    layers: source.sourceId,
                    format: source.imageFormat || 'image/png',
                    transparent: true,
                    opacity: source.type === 'basePane' ? 1 : 0.5,
                    attribution: source.attribution,
                    pane: source.type
                });
                if (source.type === 'basePane') {
                    baseMaps[source.name] = layer;
                } else {
                    overlayMaps[source.name] = layer;
                }
            });

            mapSources.wmts.forEach(source => {
                const layer = L.tileLayer(`${source.url}${source.sourceId}/default/EPSG:3857/{z}/{y}/{x}.png`, {
                    attribution: source.attribution,
                    opacity: source.type === 'basePane' ? 1 : 0.5,
                    pane: source.type
                });
                if (source.type === 'basePane') {
                    baseMaps[source.name] = layer;
                } else {
                    overlayMaps[source.name] = layer;
                }
            });

            // 將疊加圖層作為可複選圖層加入地圖控制
            L.control.layers(baseMaps, overlayMaps).addTo(indexMap);
        },
        error: function (error) {
            console.error('Error fetching map sources:', error);
        }
    });
}

export function getIndexMap() {
    return indexMap;
}