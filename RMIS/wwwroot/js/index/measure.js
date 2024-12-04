﻿import { getIndexMap } from './map.js'

let $indexMap;
let selectTool;
let drawnItems;
let dynamicMarker;
let area;
let latlngs = [];
export function initMeasurePanel() {
    $indexMap = getIndexMap();
    initMeasure();

    // 設定中文語言
    $indexMap.pm.setLang('zh', {
        tooltips: {
            placeMarker: '點擊放置標記',
            firstVertex: '點擊開始繪製',
            continueLine: '點擊繼續繪製線段',
            finishLine: '點擊完成繪製線段',
            finishPoly: '點擊完成繪製多邊形',
            finishRect: '點擊完成繪製矩形',
            startCircle: '點擊並拖動繪製圓形',
            finishCircle: '釋放滑鼠完成圓形繪製',
            placeCircleMarker: '點擊放置圓標記'
        },
        actions: {
            finish: '完成',
            cancel: '取消',
            removeLastVertex: '移除最後一個頂點'
        },
        buttonTitles: {
            drawMarkerButton: '繪製標記',
            drawPolylineButton: '繪製線段',
            drawPolygonButton: '繪製多邊形',
            drawRectangleButton: '繪製矩形',
            drawCircleButton: '繪製圓形',
            drawCircleMarkerButton: '繪製圓標記',
            editModeButton: '編輯圖層',
            dragModeButton: '拖曳圖層',
            cutPolygonButton: '剪切多邊形',
            removalModeButton: '刪除圖層'
        }
    });

    // 切換到中文
    $indexMap.pm.setLang('zh');
    $indexMap.pm.enableGlobalRemovalMode();

    dynamicMarker = null; // 儲存動態更新的 Marker

    // 繪圖開始事件
    $indexMap.on('pm:drawstart', function (e) {
        if (dynamicMarker) {
            $indexMap.removeLayer(dynamicMarker);
            dynamicMarker = null;
        }

        // 對正在製作的圖層進行編輯
        const workingLayer = e.workingLayer;
        $("#measureTip").toggle();
        workingLayer.lengthMarkers = [];
        workingLayer.lengths = [];
        // 新增頂點時，同時新增長度標籤
        workingLayer.on("pm:vertexadded", (event) => {
            console.log("pm:vertexadded", latlngs);

            if (latlngs.length >= 2) {
                const start = latlngs[latlngs.length - 2];
                const end = latlngs[latlngs.length - 1];
                const length = $indexMap.distance(start, end);
                updateLineLength(start, end, workingLayer.lengthMarkers);
                console.log("pm:vertexadded");
            }
        });
        // 根據滑鼠移動
        workingLayer.on('pm:change', function (event) {
            const measureItem = selectTool.attr('id');
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
                    $("#measureTip").html(`長度: ${ length.toFixed(2) } m²`);
                }
            }
        });
$(document).on('mousemove', function (e) {
    $('#measureTip')
        .css({
            left: e.pageX + 10 + 'px',
            top: e.pageY - 20 + 'px',
        });
});
    });

// 繪圖完成事件
$indexMap.on('pm:create', function (e) {
    const layer = e.layer;
    console.log('繪圖完成:', layer);
    $("#measureTip").toggle();
    drawnItems.addLayer(layer);
    const measureItem = selectTool.attr('id');

    if (measureItem === "measurePolygon") {
        console.log(`多邊形面積: ${ area.toFixed(2) } 平方米`);
        updatePolygonArea(layer);
    } else if (measureItem === "measurePolyline") {
        console.log(`線段總長度: ${ length.toFixed(2) } 公里`);
        updatePolylineLength(layer);
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

    $('.mBtn').click(function (event) {
        if (selectTool) {
            selectTool.removeClass('active');
            $indexMap.pm.disableDraw();
        }

        selectTool = $(this);
        const measureItem = selectTool.attr('id');
        if (measureItem === "measurePolygon") {
            console.log("measurePolygon click");
            initPolygon();
        } else if (measureItem === "measurePolyline") {
            console.log("measurePolyline click");
            initPolyline();
        } else {
            clearAll();
        }
        $(this).addClass('active');
    });
}

function updateLineLength(start, end, lengthMarkers) {
    const segmentLength = $indexMap.distance(start, end); // 使用 Leaflet 計算兩點之間的距離

    // 計算線段的中點
    const middleLat = (start.lat + end.lat) / 2;
    const middleLng = (start.lng + end.lng) / 2;

    // 創建長度標籤
    const segmentLabel = L.divIcon({
        className: 'measureLabel', // 自訂樣式
        html: `${ segmentLength.toFixed(2) } m`,
        iconSize: [200, 50]
    });

    const marker = L.marker([middleLat, middleLng], { icon: segmentLabel }).addTo($indexMap);
    lengthMarkers.push(marker); // 保存標籤以便後續刪除
}

function updatePolygonArea(layer) {
    const geojson = layer.toGeoJSON(); // 獲取多邊形的 GeoJSON
    const area = turf.area(geojson); // 計算面積，單位：平方米
    const centroid = turf.centroid(geojson); // 計算多邊形的質心

    const centroidCoords = centroid.geometry.coordinates; // 質心經緯度
    const areaText = `${ area.toFixed(2)} m²`; // 格式化面積

    // 創建面積標籤
    const areaLabel = L.divIcon({
        className: 'measureLabel', // 自訂樣式類
        html: areaText,
        iconSize: [200, 50]
    });

    // 將面積標籤添加到多邊形中
    const labelMarker = L.marker([centroidCoords[1], centroidCoords[0]], {
        icon: areaLabel
    }).addTo($indexMap);
    layer.labelMarker = labelMarker;
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
        className: 'measureLabel',
        html: `總長度: ${(totalLength / 1000).toFixed(2)} km`,
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
        if (layer.lengthMarkers) {
            layer.lengthMarkers.forEach((lengthMarker) => {
                $indexMap.removeLayer(lengthMarker);
            });
        }
    });
    drawnItems.clearLayers(); // 清除圖層
    console.log('所有繪圖和標籤已清除');
}