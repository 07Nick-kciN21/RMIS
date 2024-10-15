import { getIndexMap } from './map.js'

let $indexMap;
let borderColor = '#FF0000';
let fillColor = '#FF0000';
let painterLayer = {};
let drawControl;
let drawnItems;
export function initPainterPanel() {
    $indexMap = getIndexMap();
    const $painterPanel = $('#painterPanel');
    const $panelCloseBtn = $painterPanel.find('.closeButton');
    let layerCount = 0;
    $('#borderColor').on('input', function () {
        borderColor = $(this).val(); // 更新選擇的顏色
    });
    $('#fillColor').on('input', function () {
        fillColor = $(this).val(); // 更新選擇的顏色
    });

    drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            remove: false,
        },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true
        }

    });
    initDrawMenu();
    $indexMap.on(L.Draw.Event.CREATED, function (e) {
        var layerId = 'layer-' + layerCount++;
        var layer = e.layer;
        if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
            layer.setStyle({
                color: borderColor,
                weight: 2,
                opacity: 1,
                fillColor: fillColor,
                fillOpacity: 1
            });
            var area = getArea(layer);
            console.log('Area:', area, 'square meters');

            // 您也可以將面積顯示在地圖上
            var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
            layer.bindPopup(popupContent).openPopup();
        }
        else if (e.layerType === 'circle') {
            layer.setStyle({
                color: borderColor,
                weight: 2,
                opacity: 1,
                fillColor: fillColor,
                fillOpacity: 1
            });
            // 計算圓形的面積
            var radius = layer.getRadius(); // 獲取半徑，單位為米
            var area = Math.PI * Math.pow(radius, 2); // 計算圓形的面積
            console.log('Circle Area:', area, 'square meters');

            // 顯示面積信息在地圖上
            var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
            layer.bindPopup(popupContent).openPopup();
        }
        else if (e.layerType === 'polyline') {
            layer.setStyle({
                color: borderColor,
                weight: 2,
                opacity: 1,
            });
        }
        drawnItems.addLayer(layer);
        addItem(layerId, layer);
    });
    observePainterPanel()
}

// 計算圖行面積
function getArea(layer) {
    // 取得多邊形的經緯度
    var latlngs = layer.getLatLngs()[0]; // 獲取多邊形的第一組經緯度

    // 確保多邊形是閉合的：檢查第一個和最後一個點是否相同，如果不是，添加第一個點到結尾
    if (!latlngs[0].equals(latlngs[latlngs.length - 1])) {
        latlngs.push(latlngs[0]);
    }

    // 使用 turf.js 計算面積
    var polygon = turf.polygon([latlngs.map(function (latlng) {
        return [latlng.lng, latlng.lat];
    })]);

    var area = turf.area(polygon);
    return area;
}


function initDrawMenu() {
    // 點擊其他地方時隱藏選單
    $(document).click(function () {
        $('#ptbInOut').hide();
    });

    // 點擊選單內的項目時執行對應操作
    $('#ptbInOut li').click(function () {
        // 在這裡添加各個選項的功能
        const $ptbIO = $(this).text();
        switch ($(this).text()) {
            case "匯入Json":
                importGeoJson();
                console.log("匯入Json");
                break;
            case "匯出Json":
                exportLayers();
                break;
            default:
                console.log("nothing");
        }
    });
}

function importGeoJson() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function (event) {
        var file = event.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var jsonData = JSON.parse(e.target.result);
                    importCustomJson(jsonData);
                } catch (error) {
                    console.error('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function importCustomJson(jsonData) {
    clearLayers();
    let layerCount = 0;
    // 遍歷 JSON 數據並將圖層添加到地圖
    jsonData.forEach(function (layerData) {
        var layer;
        const layerId = 'layer-' + layerCount++;
        if (layerData.type === 'Circle') {
            var latlng = L.latLng(layerData.coordinates[0], layerData.coordinates[1]);
            layer = L.circle(latlng, {
                radius: layerData.properties.radius,
                color: layerData.properties.color, // 邊框顏色
                opacity: 1,
                fillColor: layerData.properties.fillColor, // 填滿顏色
                fillOpacity: 1,
            });
        } else if (layerData.type === 'Marker') {
            var latlng = L.latLng(layerData.coordinates[0], layerData.coordinates[1]);
            layer = L.marker(latlng);
        } else if (layerData.type === 'Polygon') {
            var latlngs = layerData.coordinates.map(function (ring) {
                return ring.map(function (latlng) {
                    return L.latLng(latlng[0], latlng[1]);
                });
            });
            layer = L.polygon(latlngs, {
                color: layerData.properties.color, // 邊框顏色
                opacity: 1,
                fillColor: layerData.properties.fillColor, // 填滿顏色
                fillOpacity: 1,
            });
        } else if (layerData.type === 'Polyline') {
            var latlngs = layerData.coordinates.map(function (latlng) {
                return L.latLng(latlng[0], latlng[1]);
            });
            layer = L.polyline(latlngs, {
                color: layerData.properties.color, // 邊框顏色
                opacity: 1,
            });
        }

        if (layer) {
            drawnItems.addLayer(layer);
            addItem(layerId, layer);
        }
    });
}

function clearLayers() {
    drawnItems.clearLayers();
    $('#painterList').empty();
}
function exportLayers() {
    var exportData = [];

    drawnItems.eachLayer(function (layer) {
        var layerData = {
            type: null,
            coordinates: null,
            properties: {}
        };

        if (layer instanceof L.Circle) {
            layerData.type = 'Circle';
            layerData.coordinates = [layer.getLatLng().lat, layer.getLatLng().lng];
            layerData.properties.radius = layer.getRadius();
            layerData.properties.color = layer.options.color; // 邊框顏色
            layerData.properties.fillColor = layer.options.fillColor; // 填滿顏色
        } else if (layer instanceof L.Marker) {
            layerData.type = 'Marker';
            layerData.coordinates = [layer.getLatLng().lat, layer.getLatLng().lng];
        } else if (layer instanceof L.Polygon) {
            layerData.type = 'Polygon';
            layerData.coordinates = layer.getLatLngs().map(function (ring) {
                return ring.map(function (latlng) {
                    return [latlng.lat, latlng.lng];
                });
            });
            layerData.properties.color = layer.options.color; // 邊框顏色
            layerData.properties.fillColor = layer.options.fillColor; // 填滿顏色
        } else if (layer instanceof L.Polyline) {
            layerData.type = 'Polyline';
            layerData.coordinates = layer.getLatLngs().map(function (latlng) {
                return [latlng.lat, latlng.lng];
            });
            layerData.properties.color = layer.options.color; // 邊框顏色
        }

        exportData.push(layerData);
    });

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "drawn_layers_custom.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

//加入圖形表單
function addItem(layerId, layer) {
    const $painterList = $('#painterList');

    const item = `<div id=${layerId} class="searchBar panelResult">
        ${layerId}
        <div class="right-elements">
            <div class="eye eyeOpen" id="eye_${layerId}"></div>
            <div class="layerRemove" id="layerRemove_${layerId}"></div>
        </div>
    </div>`
    $painterList.append(item);

    const $eye = $(`#eye_${layerId}`);
    $eye.on('click', function () {
        if ($eye.hasClass('eyeOpen')) {
            $indexMap.removeLayer(layer);
            $eye.removeClass('eyeOpen');
            $eye.addClass('eyeClosed');
        } else {
            $indexMap.addLayer(layer);
            $eye.removeClass('eyeClosed');
            $eye.addClass('eyeOpen');
        }
    })
    const $layerRemove = $(`#layerRemove_${layerId}`);
    $layerRemove.on('click', function () {
        // 刪除圖層
        $indexMap.removeLayer(layer);
        // 刪除對應的列表項
        $(`#${layerId}`).remove();
    });
}

// 監聽painterPanel，綁定顯示
function observePainterPanel() {
    const $painterPanel = $('#painterPanel');

    const config = {
        attributes: true,
        attributeFilter: ['class']
    };
    const callback = function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes') {
                if ($painterPanel.hasClass('hide')) {
                    console.log("hide");
                    drawControl.remove();
                } else {
                    drawControl.addTo($indexMap);
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe($painterPanel[0], config);
}