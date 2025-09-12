let _fId = "measurePanel";
let _initFlag = false;
let _apiBaseUrl = "";
let _appCore;
let $indexMap;
let selectTool;
let drawnItems;
let dynamicMarker;
let area;
let latlngs = [];
let labelMarker;
let labelLengths = [];
let measureItem;
let lineVisible = true;
let totalVisible = true;

var instance = {
    id: _fId,
    set: function (appCore) {
        _apiBaseUrl = appCore.environment.url.apiBaseUrl;
        _appCore = appCore;
        return this;
    },
    init: function () {
        console.log(`panel ${_fId} init`);
        $indexMap = _appCore.map.leafletMap;
        initMeasurePanel();
    },
    open: function () {
        if (!_initFlag) { _initFlag = true; instance.init(); }
        console.log(`${_fId} open`);
    },
    close: function () {
        console.log(`${_fId} close`);
    },
};
export { instance as measurePanel };

function initMeasurePanel() {
    initMeasure();
    // 切換到中文
    // $indexMap.pm.setLang('zh');
    $indexMap.pm.setGlobalOptions({ tooltips: false });
    $indexMap.pm.disableDraw();
    
    dynamicMarker = null; // 儲存動態更新的 Marker

    // 繪圖開始事件
    $indexMap.on('pm:drawstart', function (e) {
        if (dynamicMarker) {
            $indexMap.removeLayer(dynamicMarker);
            dynamicMarker = null;
        }
        labelMarker = null;
        labelLengths = [];
        const workingLayer = e.workingLayer;
        if (measureItem == "measurePolygon") {
            $("#measureTip").html(`面積: 0.00 m²`);
        }
        else {
            $("#measureTip").html(`長度: 0.00 m`);
        }
        $("#measureTip").show();

        // 新增頂點時，同時新增長度標籤
        workingLayer.on("pm:vertexadded", (event) => {

            if (latlngs.length >= 2) {
                updateLineLength();
            }
        });
        // 根據滑鼠移動
        workingLayer.on('pm:change', function (event) {
            if (measureItem == "measurePolygon") {
                latlngs = event.latlngs;
                const { lat, lng } = latlngs[latlngs.length - 1]; // 當前滑鼠座標

                // 創建包含滑鼠座標的臨時多邊形座標
                const tempLatlngs = [...latlngs, { lat, lng }];

                // 轉換為 GeoJSON 格式
                const polygon = {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [
                            tempLatlngs.map(({ lat, lng }) => [lng, lat]) // GeoJSON 使用 [lng, lat]
                        ]
                    }
                };

                // 使用 turf.js 計算面積
                area = turf.area(polygon); // 單位：平方米
                $("#measureTip").html(`面積: ${(area).toFixed(2)} m²`);
            }
            else {
            latlngs = event.latlngs;
            const { lat, lng } = latlngs[latlngs.length - 1]; // 當前滑鼠座標
            if(latlngs.length >= 2) {
                    const start = latlngs[latlngs.length - 2];
                    const end = latlngs[latlngs.length - 1];
                    const length = $indexMap.distance(start, end);
                    $("#measureTip").html(`長度: ${ length.toFixed(2) } m`);
                }
            }
        });
    });
    $(document).on('mousemove', function (e) {
        $('#measureTip').css({
            left: e.pageX - 45 + 'px',
            top: e.pageY + 20 + 'px',
        });
    });
    // 繪圖完成事件
    $indexMap.on('pm:create', function (e) {
        const layer = e.layer;
        console.log('繪圖完成:', layer);
        
        layer.labelLengths = labelLengths;
        $("#measureTip").hide();
        $("#measureTip").html("");
        drawnItems.addLayer(layer);

        if (measureItem === "measurePolygon") {
            updateLineLength();
            updatePolygonArea(layer);
        } else if (measureItem === "measurePolyline") {
            updatePolylineLength(layer);
        }
    });

    $('#showLine').on('click', function () {
        lineVisible = !lineVisible;
        if (lineVisible) {
            $('.measureLine').removeClass('hidden');
        } else {
            $('.measureLine').addClass('hidden');
        }
    });

    $('#showTotal').on('click', function () {
        totalVisible = !totalVisible;
        if (totalVisible) {
            $('.measureTotal').removeClass('hidden');
        } else {
            $('.measureTotal').addClass('hidden');
        }
    });
}

function initMeasure() {
    drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    // 初始化 Geoman 插件
    $indexMap.pm.addControls({
        measureControl: true // 啟用測量模式
    });

    $indexMap.pm.removeControls();

    $('.mBtn').on('click', function() {
        if (selectTool) {
            selectTool.removeClass('active');
            $indexMap.pm.disableDraw();
        }
        selectTool = $(this);
        measureItem = selectTool.attr('id');
        if (measureItem === "measurePolygon") {
            console.log("measurePolygon click");
            $(this).addClass('active');
            initPolygon();
        } else if (measureItem === "measurePolyline") {
            console.log("measurePolyline click");
            $(this).addClass('active');
            initPolyline();
        } else if (measureItem === "measureEraser") {
            clearAll();
        }
    });
}

function updateLineLength() {
    const start = latlngs[latlngs.length - 2];
    const end = latlngs[latlngs.length - 1];
    const segmentLength = $indexMap.distance(start, end); // 使用 Leaflet 計算兩點之間的距離

    // 計算線段的中點
    const middleLat = (start.lat + end.lat) / 2;
    const middleLng = (start.lng + end.lng) / 2;

    // 創建長度標籤
    const segmentLabel = L.divIcon({
        className: `measureLine ${lineVisible ? null : 'hidden'}`, // 自訂樣式
        html: `${segmentLength.toFixed(2)} m`,
        iconSize: [200, 50]
    });

    const marker = L.marker([middleLat, middleLng], { icon: segmentLabel }).addTo($indexMap);
    labelLengths.push(marker); // 保存標籤以便後續刪除
}

function updatePolygonArea(layer) {
    const geojson = layer.toGeoJSON(); // 獲取多邊形的 GeoJSON
    const area = turf.area(geojson); // 計算面積，單位：平方米
    const centroid = turf.centroid(geojson); // 計算多邊形的質心

    const centroidCoords = centroid.geometry.coordinates; // 質心經緯度
    const areaText = `${area.toFixed(2)} m²`; // 格式化面積

    // 創建面積標籤
    const areaLabel = L.divIcon({
        className: `measureTotal ${totalVisible ? null : 'hidden'}`, // 自訂樣式類
        html: areaText,
        iconSize: [200, 50]
    });

    // 將面積標籤添加到多邊形中
    const marker = L.marker([centroidCoords[1], centroidCoords[0]], {
        icon: areaLabel
    }).addTo($indexMap);
    layer.labelMarker = marker;
}

function updatePolylineLength(layer) {
    const latlngs = layer.getLatLngs(); // 獲取所有頂點
    let totalLength = 0; // 總長度

    for (let i = 0; i < latlngs.length - 1; i++) {
        totalLength += L.GeometryUtil.length([latlngs[i], latlngs[i + 1]]); // 使用 Leaflet 的 geodesic 計算方式
    }

    // 找出尾端
    const lastLatlng = latlngs[latlngs.length - 1];

    // 創建總長度標籤
    const totalLengthLabel = L.divIcon({
        className: `measureTotal ${totalVisible ? null : 'hidden'}`,
        html: `${totalLength.toFixed(2)} m`,
        iconSize: [200, 50]
    });
    const marker = L.marker(lastLatlng, { icon: totalLengthLabel }).addTo($indexMap);
    layer.labelMarker = marker;
}

function initPolygon() {
    $indexMap.pm.enableDraw('Polygon');
}

function initPolyline() {
    $indexMap.pm.enableDraw('Line');
}

function clearAll() {
    drawnItems.eachLayer(function (layer) {
        if (layer.labelMarker) {
            $indexMap.removeLayer(layer.labelMarker); // 確實刪除標籤
        }
        if (layer.labelLengths) {
            layer.labelLengths.forEach((labelLength) => {
                $indexMap.removeLayer(labelLength);
            });
        }
    });
    drawnItems.clearLayers(); // 清除圖層
    console.log('所有繪圖和標籤已清除');
} 