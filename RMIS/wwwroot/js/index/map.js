export let popupEnabled = false;
let dtreetViewEnabled = false;
let indexMap;
// 初始化地图
export function initMap(mapId) {
    indexMap = L.map(mapId, { zoomControl: false, doubleClickZoom: false }).setView([24.957276277371435, 121.21903318892302], 15);
    
    createBaseLayers();

    var $offcanvasElement = $('#layerListBlock');
    var $indexMapElement = $('#indexMap');
    let coordinateSwitch = 0;
    
    // 當 offcanvas 開啟時壓縮地圖
    $offcanvasElement.on('shown.bs.offcanvas', function () {
        var offcanvasWidth = $offcanvasElement.outerWidth();
        $indexMapElement.css({
            'transition': 'margin-left 0.3s ease, width 0.3s ease',
            'margin-left': offcanvasWidth + 'px',
            'width': 'calc(100% - ' + offcanvasWidth + 'px)'
        });

        // 當動畫完成後更新地圖尺寸
        $indexMapElement.on('transitionend', function () {
            indexMap.invalidateSize(); // 更新地圖顯示
        });
    });

    // 當 offcanvas 關閉時恢復地圖
    $offcanvasElement.on('hidden.bs.offcanvas', function () {
        // 恢復地圖容器的大小
        $indexMapElement.css({
            'margin-left': '0',
            'width': '100%'
        });

        // 當動畫完成後更新地圖尺寸
        $indexMapElement.on('transitionend', function () {
            indexMap.invalidateSize(); // 更新地圖顯示
        });
    });

    $('.map-controls').on('click', function (e) {
        e.stopPropagation();
    });

    $('.map-footer').on('click', function (e) {
        e.stopPropagation();
    });

    // 綁定自訂縮放按鈕
    $('#tb-zoomIn').on('click', function () {
        indexMap.zoomIn(); // 放大地圖
        // 取得縮放等級
    });

    $('#tb-zoomOut').on('click', function () {
        indexMap.zoomOut(); // 縮小地圖
    });

    // google街景功能，與屬性資料互斥
    $('#tb-streetView').on('click', function (e) {
        
        // 如果另一個功能開啟，先關閉它
        if (popupEnabled) {
            popupEnabled = false;
            $('#tb-propEnabled').removeClass('active');
        }
        
        // 切換街景功能
        dtreetViewEnabled = !dtreetViewEnabled;
        $indexMapElement.css('cursor', dtreetViewEnabled ? 'pointer' : 'default');
        
        if (dtreetViewEnabled) {
            $('#tb-streetView').addClass('active');
        } else {
            $('#tb-streetView').removeClass('active');
        }
    });
    // 屬性資料功能，與google街景互斥
    $('#tb-propEnabled').on('click', function () {
        // 如果另一個功能開啟，先關閉它
        if (dtreetViewEnabled) {
            dtreetViewEnabled = false;
            $('#tb-streetView').removeClass('active');
            $indexMapElement.css('cursor', 'default'); // 恢復鼠標樣式
        }
        
        // 切換屬性功能
        popupEnabled = !popupEnabled;
        
        if (popupEnabled) {
            $('#tb-propEnabled').addClass('active');
        } else {
            $('#tb-propEnabled').removeClass('active');
        }
    });
    
    // 目前位置
    $('#tb-location').on('click', function () {
        // 取得使用者的位置，並將地圖移至該位置，直接縮放為22
        indexMap.locate({ setView: false, maxZoom: 22 });
    });
    
    // 當定位成功時進一步設置縮放級別
    indexMap.on('locationfound', function (e) {
        indexMap.setView(e.latlng, 22); // 強制設置縮放級別為 22
        L.marker(e.latlng).addTo(indexMap) // 添加標記顯示當前位置
    });

    indexMap.on('click', function (e) {
        // streetviewenabled
        if(dtreetViewEnabled){
            const latlng = e.latlng; // WGS84 經緯度
            // 開啟街景
            window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}`);
        }
    });

    $('#zoom-level').on('input', function () {
        const zoomlevel = parseInt($(this).val(), 10);
        console.log(zoomlevel);
        if (zoomlevel >= 1 && zoomlevel <= 18) {
            indexMap.setZoom(zoomlevel);
        }
    })
    
    $('#map-Coordinate').on('click', function () {
        $('#coordinateSelect').toggleClass('hide');
    });
    
    
    $('#coordinateSelect').on('click', '.coordinate-item', function (e) {
        const id = $(this).data('type');
        coordinateSwitch = id;
        if(id == 0){
            $("#map-coord").html(`X: 0, Y: 0`);
        }
        else if(id == 1){
            $("#map-coord").html(`緯度: 0, 經度: 0`);
        }
    });

    $('#map-basemapCtrl').on('click', function () {
        $('#mapSelect').toggleClass('hide');   
    });

    $indexMapElement.css('cursor', 'default');

    // 監聽地圖的縮放和移動事件，更新比例尺
    indexMap.on('zoomend moveend', updateCustomScale);

    indexMap.on('zoom', function () {
        // 切換回縮放等級
        $('#zoom-level').val(-1);
    });
    // 初始化比例尺顯示
    updateCustomScale();

    indexMap.on('mousemove', function (e) {
        const latlng = e.latlng; // WGS84 經緯度
        const lat = parseFloat(latlng.lat); // 確保為數字
        const lng = parseFloat(latlng.lng);

        if (isNaN(lat) || isNaN(lng)) {
            console.error("Invalid coordinates:", lat, lng);
            return; // 跳過轉換，避免錯誤
        }
        // 為TWD97 
        if(coordinateSwitch == 0){
            // 將 WGS84 經緯度轉換為 TWD97
            const {x, y} = convertWgs84ToTwd97(lat, lng);

            // 更新 HTML 顯示滑鼠位置的 TWD97 座標
            $("#map-coord").html(`X: ${x.toFixed(3)} , Y: ${y.toFixed(3)}`);
        }
        // 為WGS84
        else if(coordinateSwitch == 1){
            $("#map-coord").html(`緯度: ${lat.toFixed(6)} , 經度: ${lng.toFixed(6)}`);
        }
        
    });


    indexMap.on('contextmenu', function (e) {
        const latlng = e.latlng; // WGS84 經緯度
        const lat = parseFloat(latlng.lat); // 確保為數字
        const lng = parseFloat(latlng.lng);
        const {x, y} = convertWgs84ToTwd97(lat, lng);
        const popupContent = `
            <h1>座標資訊</h1>
            <div style="background: rgba(255, 255, 255, 0.5); padding: 10px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2);">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <tr>
                        <td style="padding: 5px;">WGS84：</td>
                        <td style="padding: 5px;">${lat.toFixed(6)} , ${lng.toFixed(6)}</td>
                        <td style="padding: 5px;"><span class="darkBtn" data-clipboard-target="#twd97Pt">複製</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px;">TWD97：</td>
                        <td style="padding: 5px;">${x.toFixed(3)} , ${y.toFixed(3)}</td>
                        <td style="padding: 5px;"><span class="darkBtn" data-clipboard-target="#twd97Pt">複製</span></td>
                    </tr>
                </table>
            </div>
        `;
        L.popup({
                maxWidth: 300, // 最大寬度
                minWidth: 200, // 最小寬度
                maxHeight: 200, // 最大高度
            })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(indexMap);
    });

    return indexMap;
}

// 轉換wgs84成twd97
function convertWgs84ToTwd97(lat, lng) {
    // 定義 WGS84 和 TWD97 座標系統
    proj4.defs([
        ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"], // WGS84
        ["EPSG:3826", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +datum=WGS84 +units=m +no_defs"] // TWD97
    ]);

    // 將 WGS84 經緯度轉換為 TWD97
    const [x, y] = proj4("EPSG:4326", "EPSG:3826", [lng, lat]);

    return { x, y };
}

// 計算自定義比例尺
function updateCustomScale() {
    // 假設 1 公分 = 37.8 像素 (96 DPI 的標準顯示器)
    var cmInPixels = 37.8;

    // 獲取地圖的中心點
    var center = indexMap.getCenter();

    // 獲取中心點右側偏移 1 公分距離的地理位置
    var point2 = indexMap.containerPointToLatLng([indexMap.getSize().x / 2 + cmInPixels, indexMap.getSize().y / 2]);

    // 計算地理距離 (米)
    var distance = indexMap.distance(center, point2);
    const zoomlevel = indexMap.getZoom();
    if (distance < 1000) {
        $("#scale-control").html(`(${zoomlevel}) 1cm : ${distance.toFixed(0)}m`);
    }
    else {
        distance /= 1000;
        $("#scale-control").html(`(${zoomlevel}) 1cm : ${distance.toFixed(1)}km`);
    }
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
    var GoogleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}&hl=zh_TW', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    }).addTo(indexMap);
    //google衛星
    var GoogleSatellite = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}&hl=zh_TW', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    });
    //google地形
    var GoogleTerrain = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}&hl=zh_TW', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    });

    //google混和
    var GoogleHybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}&hl=zh_TW', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        pane: 'basePane'
    });

    //openstreet
    var OpenStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 22,
        attribution: '&copy; OpenStreetMap contributors',
        pane: 'basePane'
    });

    //SP2006NC_3857
    var SP2006NC_3857 = L.tileLayer('https://data.csrsr.ncu.edu.tw/SP/SP2006NC_3857/{z}/{x}/{y}.png', {
        maxZoom: 22,
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
        "SP2006NC_3857": SP2006NC_3857,
    };

    // 把基本圖層加入#baseMapSelect
    for(let name in baseMaps){
        $('#baseMapSelector').append(`<li class="coordinate-item" value="${name}"><span>${name}</span></li>`);
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
                    pane: source.type,
                    maxZoom: 22
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
            L.control.layers(baseMaps, overlayMaps, { position: 'bottomright' }).addTo(indexMap);
            
            for(let name in overlayMaps){
                $('#overlayMapSelector').append(`<li class="coordinate-item" value="${name}">${name}</li>`);
            }
        },
        error: function (error) {
            console.error('Error fetching map sources:', error);
        }
    });
}

export function getIndexMap() {
    return indexMap;
}