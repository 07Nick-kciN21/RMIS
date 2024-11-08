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
            edit: true,
            remove: false,
        },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true,
            circlemarker: true
        }
    });

    $indexMap.addControl(drawControl);
    var toolbar = document.querySelector('.leaflet-draw-toolbar');
    var toobarContainer = document.getElementById('drawTool');
    toobarContainer.append(toolbar);

    // 隱藏工具列的函數
    function hideToolbar() {
        $('#painterPanel').addClass('hide');
    }

    // 顯示工具列的函數
    function showToolbar() {
        $('#painterPanel').removeClass('hide'); // 使用 'flex' 恢復水平排列
    }

    // 監聽繪圖開始事件
    $indexMap.on('draw:drawstart', function () {
        hideToolbar();
    });

    // 監聽繪圖停止事件
    $indexMap.on('draw:drawstop', function () {
        showToolbar();
    });

    // 監聽繪圖創建事件以重新顯示工具列
    $indexMap.on('draw:created', function () {
        showToolbar();
    });

    initInOut();
    $indexMap.on(L.Draw.Event.CREATED, function (e) {
        handleLayerCreation(e, layerCount++);
    });
    observePainterPanel()
}

// 隱藏工具列的函數
function hideToolbar(customContainer) {
    $('#painterPanel').addClass('hide');
}

// 顯示工具列的函數
function showToolbar(customContainer) {
    $('#painterPanel').removeClass('hide');
}



function handleLayerCreation(event, layerCount) {
    var layerId = 'layer-' + layerCount;
    var layer = event.layer;
    applyLayerStyle(layer, event.layerType);
    if (event.layerType === 'polygon' || event.layerType === 'rectangle') {
        displayArea(layer);
    } else if (event.layerType === 'circle') {
        displayCircleArea(layer);
    }
    drawnItems.addLayer(layer);
    addItem(layerId, layer);
}

function applyLayerStyle(layer, layerType) {
    if (layerType != 'marker') {
        let style = {
            color: borderColor,
            weight: 2,
            opacity: 1
        };
        if (layerType === 'polygon' || layerType === 'rectangle' || layerType === 'circle') {
            style.fillColor = fillColor;
            style.fillOpacity = 1;
        }
        layer.setStyle(style);
    }
}

function displayArea(layer) {
    var area = getArea(layer);
    console.log('Area:', area, 'square meters');
    var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
    layer.bindPopup(popupContent).openPopup();
}

function displayCircleArea(layer) {
    var radius = layer.getRadius();
    var area = Math.PI * Math.pow(radius, 2);
    console.log('Circle Area:', area, 'square meters');
    var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
    layer.bindPopup(popupContent).openPopup();
}
// 計算多邊形面積
function getArea(layer) {
    var latlngs = layer.getLatLngs()[0];
    if (!latlngs[0].equals(latlngs[latlngs.length - 1])) {
        latlngs.push(latlngs[0]);
    }
    var polygon = turf.polygon([latlngs.map(function (latlng) {
        return [latlng.lng, latlng.lat];
    })]);
    return turf.area(polygon);
}
function initInOut() {
    $(document).click(function () {
        $('#ptbInOut').hide();
    });

    $('#ptbInOut li').click(function () {
        handleMenuClick($(this).text());
    });
}

function handleMenuClick(option) {
    switch (option) {
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
    jsonData.forEach(function (layerData) {
        var layer;
        const layerId = 'layer-' + layerCount++;
        layer = createLayerFromData(layerData);
        if (layer) {
            drawnItems.addLayer(layer);
            addItem(layerId, layer);
        }
    });
}
function createLayerFromData(layerData) {
    var latlng;
    switch (layerData.type) {
        case 'Circle':
            latlng = L.latLng(layerData.coordinates[0], layerData.coordinates[1]);
            return L.circle(latlng, {
                radius: layerData.properties.radius,
                color: layerData.properties.color,
                opacity: 1,
                fillColor: layerData.properties.fillColor,
                fillOpacity: 1,
            });
        case 'Marker':
            latlng = L.latLng(layerData.coordinates[0], layerData.coordinates[1]);
            return L.marker(latlng);
        case 'Polygon':
            var latlngs = layerData.coordinates.map(function (ring) {
                return ring.map(function (latlng) {
                    return L.latLng(latlng[0], latlng[1]);
                });
            });
            return L.polygon(latlngs, {
                color: layerData.properties.color,
                opacity: 1,
                fillColor: layerData.properties.fillColor,
                fillOpacity: 1,
            });
        case 'Polyline':
            var polylineLatlngs = layerData.coordinates.map(function (latlng) {
                return L.latLng(latlng[0], latlng[1]);
            });
            return L.polyline(polylineLatlngs, {
                color: layerData.properties.color,
                opacity: 1,
            });
    }
}

function clearLayers() {
    console.log("clear Layer");
    drawnItems.clearLayers();
    $('#painterList').empty();
}

function exportLayers() {
    var exportData = [];
    console.log(drawnItems);
    drawnItems.eachLayer(function (layer) {
        var layerData = getLayerData(layer);
        if (layerData) {
            exportData.push(layerData);
        }
    });
    downloadJson(exportData, "drawn_layers_custom.json");
}
function getLayerData(layer) {
    var layerData = {
        type: null,
        coordinates: null,
        properties: {}
    };

    if (layer instanceof L.Circle) {
        layerData.type = 'Circle';
        layerData.coordinates = [layer.getLatLng().lat, layer.getLatLng().lng];
        layerData.properties.radius = layer.getRadius();
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
    } else if (layer instanceof L.Polyline) {
        layerData.type = 'Polyline';
        layerData.coordinates = layer.getLatLngs().map(function (latlng) {
            return [latlng.lat, latlng.lng];
        });
    }
    layerData.properties.color = layer.options.color;
    if (layer.options.fillColor) {
        layerData.properties.fillColor = layer.options.fillColor;
    }
    return layerData;
}

function downloadJson(data, filename) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

//加入圖層表單
function addItem(layerId, layer) {
    const $painterList = $('#painterList');

    const item = `
    <div id=${layerId} class="searchBar panelResult">
        <div id="editable_${layerId}">
            ${layerId}
        </div>    
        <div class="right-elements">
            <div class="eye eyeOpen" id="eye_${layerId}"></div>
            <div class="layerRemove" id="layerRemove_${layerId}"></div>
        </div>
    </div>`
    $painterList.append(item);

    const $eye = $(`#eye_${layerId}`);
    $eye.on('click', function () {
        toggleLayerVisibility($eye, layer);
    });

    const $layerRemove = $(`#layerRemove_${layerId}`);
    $layerRemove.on('click', function () {
        removeLayer(layerId, layer);
    });

    const $editable = $(`#editable_${layerId}`);
    let isEditing = false;
    // 使用事件委派，將事件綁定到一個已經存在的父元素上
    $editable.on('click', function () {
        if (isEditing)
            return;

        isEditing = true;
        var cname = $(this).text().trim();
        $(this).empty().append(`<input id="edit_${layerId}" style="border: none; outline: none;" type="text" value="${cname}"></input>`);
        var newInput = $(`#edit_${layerId}`);
        newInput.focus();
        newInput.on('keyup', function (e) {
            if (e.keyCode == 13) {
                var nvalue = (this.value.length == 0 ? cname : this.value);
                $editable.empty().text(nvalue);
                isEditing = false;
            }
        });
        newInput.on('blur', function (e) {
            var nvalue = (this.value.length == 0 ? cname : this.value);
            $editable.empty().text(nvalue);
            isEditing = false;
        });
    });
}
function toggleLayerVisibility($eye, layer) {
    if ($eye.hasClass('eyeOpen')) {
        $indexMap.removeLayer(layer);
        $eye.removeClass('eyeOpen').addClass('eyeClosed');
    } else {
        $indexMap.addLayer(layer);
        $eye.removeClass('eyeClosed').addClass('eyeOpen');
    }
}

function removeLayer(layerId, layer) {
    drawnItems.removeLayer(layer);
    $(`#${layerId}`).remove();
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