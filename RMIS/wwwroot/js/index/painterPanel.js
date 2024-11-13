import { getIndexMap } from './map.js'

let $indexMap;
let borderColor = '#FF0000';
let fillColor = '#FF0000';
let borderWidth = 1;
let painterLayer = {};
let drawControl;
let drawnItems;
let layerCount = 0;
export function initPainterPanel() {
    $indexMap = getIndexMap();

    initDraw();

    // 監聽繪圖開始事件
    $indexMap.on('draw:drawstart', function () {
        $('#painterPanel').addClass('hide');
    });

    // 監聽繪圖停止事件
    $indexMap.on('draw:drawstop', function () {
        $('#painterPanel').removeClass('hide');
    });

    // 監聽繪圖創建事件以重新顯示工具列
    $indexMap.on('draw:created', function () {
        $('#painterPanel').removeClass('hide');
    });

    // 監聽 L.Draw.Event.CREATED 並處理圖層創建
    $indexMap.on(L.Draw.Event.CREATED, function (e) {
        console.log("draw Created", layerCount);
        handleLayerCreation(e, layerCount++);
    });

    $('.goDraw').on('click', function (e) {
        draw();
    });

    // observePainterPanel()
}

let selectTool;
function initDraw() {
    drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    // 使用 jQuery 手動啟用多邊形繪製
    $('.drawMenu').click(function (event) {
        if (selectTool) {
            selectTool.removeClass('active');
        }
        selectTool = $(this);
        let drawItem = selectTool.attr('id');
        if (drawItem == "drawIO") {
            console.log("drawIO click");
            event.stopPropagation();
            $('#ptbInOut').toggle(); // 切換選單顯示和隱藏
            initInOut();
        }
        else {
            initColorPicker(drawItem);
            $(this).addClass('active');
        }
    });
}

function initColorPicker(drawItem) {
    let colorPickerContent = '';
    if (drawItem == "drawPolyline") {
        colorPickerContent = `
            <div>
                <span>填滿</span>
            </div>
            <div>
                <input type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>線段粗細</span>
            </div>
            <div>
                <select id="cp_lineThick" name="colorPicker">
                    ${generateOptions(1, 10)}
                </select>
            </div>
        `;
    }
    else if (drawItem == "drawPolygon" || drawItem == "drawRectangle" || drawItem == "drawCircle" || drawItem == "drawCircleMarker") {
        colorPickerContent = `
            <div>
                <span>填滿</span>
            </div>
            <div>
                <input type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>外框</span>
            </div>
            <div>
                <input type="color" id="cp_borderColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>外框粗細</span>
            </div>
            <div>
                <select id="cp_borderWidth" name="colorPicker">
                    ${generateOptions(1, 10)}
                </select>
            </div>
        `;
    }
    else if (drawItem == "drawText") {
        colorPickerContent = `
            <div>
                <span>顏色</span>
            </div>
            <div>
                <input type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>字級</span>
            </div>
            <div>
                <select id="cp_fontSize" name="colorPicker">
                    ${generateOptions(1, 10)}
                </select>
            </div>
            <div style="width:100%">
                <input id="cp_text" type="text" style="width:100%" placeholder="輸入文字..." />
            </div>
        `;
    }
    else if (drawItem == "drawMarker") {
        colorPickerContent = `
            <div>
                <span>顏色</span>
            </div>
            <div>
                <input type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>樣式</span>
            </div>
            <div>
                <select></select>
            </div>
            <div>
                <span>大小</span>
            </div>
            <div>
                <input type="color" id="cp_size" name="colorPicker" value="#ff0000">
            </div>
        `;
    }
    $('#colorPickerContent').html(colorPickerContent);
}

function generateOptions(min, max) {
    let options = '';
    for (let i = min; i <= max; i++) {
        options += `<option value="${i}">${i}</option>`;
    }
    return options;
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
    if (layerType != 'marker' && layerType != 'text') {
        let style = {
            color: borderColor,
            weight: borderWidth,
            opacity: 1,
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
function draw() {
    if (selectTool.attr('id') == "drawPolyline") {
        initPolyline();
    }
    if (selectTool.attr('id') == "drawPolygon") {
        initPolygon();
    }
    if (selectTool.attr('id') == "drawRectangle") {
        initRectangle();
    }
    if (selectTool.attr('id') == "drawCircle") {
        initCircle();
    }
    if (selectTool.attr('id') == "drawMarker") {
        initMarker();
    }
    if (selectTool.attr('id') == "drawCircleMarker") {
        initCircleMarker();
    }
    if (selectTool.attr('id') == "drawText") {
        initText();
    }
}
function getShapeOption1() {
    const fillColor = $('#cp_fillColor').val();
    const borderColor = $('#cp_borderColor').val();
    const borderWidth = $('#cp_borderWidth').val();
    return {
        color: borderColor,
        fillColor: fillColor,
        weight: borderWidth
    };
}
function getShapeOption2() {
    // 從 colorPicker_2 中獲取設置的值
    const fillColor = $('#cp_fillColor').val();
    const lineThick = $('#cp_lineThick').val();

    return {
        fillColor: fillColor,
        weight: parseInt(lineThick) || 1, // 線段粗細，確保為數字並設置默認值為 1
        color: fillColor, // 使用填滿顏色作為邊框顏色
    };
}
function getShapeOption3() {
    // 從 colorPicker_3 中獲取設置的值
    const fillColor = $('#cp_fillColor').val();
    const fontSize = $('#cp_fontSize').val();
    console.log(fillColor, fontSize);
    return {
        fontSize: parseInt(fontSize) * 10, // 將字級轉換為合理的 px 大小，例如字級 1~10 轉為 2px ~ 20px
        fillColor: fillColor,
    };
}
function initPolyline() {

    // 手動觸發繪圖開始事件
    $indexMap.fire('draw:drawstart');

    // 創建折線工具
    const polylineDrawer = new L.Draw.Polyline($indexMap, {
        shapeOptions: {
            color: '#0000FF', // 可以更改為你想要的顏色
            weight: 3,        // 線的寬度
            opacity: 1.0
        }
    });

    // 啟用折線繪製模式
    polylineDrawer.enable();
    // 使用一次性事件監聽器，只在繪製完成後處理一次
    $indexMap.once(L.Draw.Event.CREATED, function (event) {
        if (event.layerType === 'polyline') {
            const layer = event.layer;

            layer.setStyle(getShapeOption2())
            // 添加到地圖
            $indexMap.addLayer(layer);

            console.log("Polyline created");

            // 停止繪製
            polylineDrawer.disable();

            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop');
        }
    });
}
function initPolygon() {
    // 手動觸發繪圖開始事件
    $indexMap.fire('draw:drawstart');

    // 創建多邊形工具
    const polygonDrawer = new L.Draw.Polygon($indexMap, {
        shapeOptions: getShapeOption1()
    });

    // 啟用多邊形繪製模式
    polygonDrawer.enable();

    // 使用一次性事件監聽器，只在繪製完成後處理一次
    $indexMap.once(L.Draw.Event.CREATED, function (event) {
        if (event.layerType === 'polygon') {
            const layer = event.layer;

            // 更新多邊形的樣式為最新的 shapeOptions
            layer.setStyle(getShapeOption1());

            // 添加到地圖
            $indexMap.addLayer(layer);

            console.log("Polygon created", getShapeOption1());

            // 停止繪製
            polygonDrawer.disable();

            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop');
        }
    });
}
function initCircle() {
    // 手動觸發繪圖開始事件
    $indexMap.fire('draw:drawstart');

    // 創建圓形工具
    const circleDrawer = new L.Draw.Circle($indexMap, {
        shapeOptions: {
            color: '#00FF00', // 可以更改為你想要的顏色
            weight: 3,        // 線的寬度
            opacity: 1.0
        }
    });

    // 啟用圓形繪製模式
    circleDrawer.enable();

    // 使用一次性事件監聽器，只在繪製完成後處理一次
    $indexMap.once(L.Draw.Event.CREATED, function (event) {
        if (event.layerType === 'circle') {
            const layer = event.layer;

            layer.setStyle(getShapeOption1());
            // 添加到地圖
            $indexMap.addLayer(layer);

            console.log("Circle created");

            // 停止繪製
            circleDrawer.disable();

            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop');
        }
    });
}
function initMarker() {
    // 手動觸發繪圖開始事件
    $indexMap.fire('draw:drawstart');
    // 創建標記工具
    const markerDrawer = new L.Draw.Marker($indexMap, {
        icon: new L.Icon.Default() // 可以更改為你想要的圖標
    });
    // 啟用標記繪製模式
    markerDrawer.enable();

    // 使用一次性事件監聽器，只在繪製完成後處理一次
    $indexMap.once(L.Draw.Event.CREATED, function (event) {
        if (event.layerType === 'marker') {
            const layer = event.layer;
            // 添加到地圖
            $indexMap.addLayer(layer);
            console.log("Marker created");
            // 停止繪製
            markerDrawer.disable();
            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop');
        }
    });
}
function initRectangle() {
    // 手動觸發繪圖開始事件
    $indexMap.fire('draw:drawstart');

    // 創建矩形工具
    const rectangleDrawer = new L.Draw.Rectangle($indexMap, {
        shapeOptions: {
            color: '#FFA500', // 可以更改為你想要的顏色
            weight: 3,        // 線的寬度
            opacity: 1.0
        }
    });

    // 啟用矩形繪製模式
    rectangleDrawer.enable();

    // 使用一次性事件監聽器，只在繪製完成後處理一次
    $indexMap.once(L.Draw.Event.CREATED, function (event) {
        if (event.layerType === 'rectangle') {
            const layer = event.layer;
            layer.setStyle(getShapeOption1());
            // 添加到地圖
            $indexMap.addLayer(layer);

            console.log("Rectangle created");

            // 停止繪製
            rectangleDrawer.disable();

            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop');
        }
    });
}
function initCircleMarker() {
    // 手動觸發繪圖開始事件
    $indexMap.fire('draw:drawstart');

    // 創建圓形標記工具
    const circleMarkerDrawer = new L.Draw.CircleMarker($indexMap, {
        shapeOptions: {
            color: '#800080', // 可以更改為你想要的顏色
            weight: 3,        // 線的寬度
            opacity: 1.0,
            radius: 10        // 圓形標記的半徑大小
        }
    });

    // 啟用圓形標記繪製模式
    circleMarkerDrawer.enable();

    // 使用一次性事件監聽器，只在繪製完成後處理一次
    $indexMap.once(L.Draw.Event.CREATED, function (event) {
        if (event.layerType === 'circlemarker') {
            const layer = event.layer;
            layer.setStyle(getShapeOption1());
            // 添加到地圖
            $indexMap.addLayer(layer);

            console.log("CircleMarker created");

            // 停止繪製
            circleMarkerDrawer.disable();

            // 手動觸發繪圖停止事件，重新顯示工具面板
            $indexMap.fire('draw:drawstop');
        }
    });
}

// 初始化添加文字的功能
function initText() {
    $indexMap.fire('draw:drawstart');
    // 讓用戶點擊地圖來添加文字
    $indexMap.once('click', function (e) {
        const latlng = e.latlng;
        console.log(latlng);
        const text = $('#cp_text').val();
        if (text) {
            const { fontSize, fillColor } = getShapeOption3();
            const textMarker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-text-label',
                    html: `<b style="color:${fillColor}; font-size:${fontSize}px">${text}</b>`,
                    iconSize: null,
                }),
            })

            $indexMap.addLayer(textMarker);
            // 手動觸發 L.Draw.Event.CREATED 事件，確保流程一致
            $indexMap.fire(L.Draw.Event.CREATED, {
                layer: textMarker,
                layerType: 'text'
            });
        }
        // 移除輸入框
        input.remove();

        // 手動觸發繪圖停止事件，重新顯示工具面板
        $indexMap.fire('draw:drawstop');
    });
}

function initInOut() {
    // 解除先前的事件監聽器，以避免重複綁定
    $(document).off('click', hideMenu);
    $("#ptbInOut").off('click', 'li', handleMenuClickWrapper);

    // 重新綁定事件監聽器
    $(document).on('click', hideMenu);
    $("#ptbInOut").on('click', 'li', handleMenuClickWrapper);
}

// 將隱藏選單的函數提取出來，方便解除和綁定
function hideMenu() {
    $('#ptbInOut').hide();
}

// 為 click 事件提供一個包裝函數
function handleMenuClickWrapper(event) {
    console.log("ptbInOut click");
    handleMenuClick($(event.currentTarget).text());
}

// 匯入匯出事件
function handleMenuClick(option) {
    switch (option) {
        case "匯入Json":
            importGeoJson();
            console.log("匯入Json");
            break;
        case "匯出Json":
            console.log("匯出Json");
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
        <div id="point_${layerId}" class="point_on_map"></div>
        <div id="editable_${layerId}" class="editableBox">
            ${layerId}
        </div>    
        <div class="right-elements">
            <div class="eye eyeOpen" id="eye_${layerId}"></div>
            <div class="layerRemove" id="layerRemove_${layerId}"></div>
        </div>
    </div>`
    $painterList.append(item);

    const $point = $(`#point_${layerId}`);
    
    $point.on('click', function () {
        let center = null;
        if (layer instanceof L.Polygon || layer instanceof L.Rectangle || layer instanceof L.Polyline) {
            const bounds = layer.getBounds();
            center = bounds.getCenter();
            console.log('中央座標:', center); // 顯示中央座標
        }
        else if (layer instanceof L.Marker) {
            center = layer.getLatLng();
        } else if (layer instanceof L.Circle) {
            center = layer.getLatLng();
        }
        $indexMap.setView(center, 18);
    });

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
                    console.log("關閉leaflet draw");
                    drawControl.remove();
                } else {
                    drawControl.addTo($indexMap);
                    $('.leaflet-draw').css('display', 'none');
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe($painterPanel[0], config);
}