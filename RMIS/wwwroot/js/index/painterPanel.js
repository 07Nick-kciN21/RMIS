import { getIndexMap } from './map.js'

let $indexMap;
let borderColor = '#FF0000';
let fillColor = '#FF0000';
let borderWidth = 1;
let drawControl;
let drawnItems;
let layerCount = 0;
let itemMap = {};
// 操作堆疊
let operationStack = [];
// 取消堆疊
let cancelStack = [];
let importJsonData = null;
export function initPainterPanel() {
    $indexMap = getIndexMap();

    initDraw();

    // 監聽繪圖開始事件
    $indexMap.on('draw:drawstart', function (e) {
        $('#painterPanel').addClass('hide');

        const type = e.layerType;
        let tooltipMessage;

        switch (type) {
            case 'polygon':
                tooltipMessage = '開始繪製多邊形，雙擊或點選起點完成';
                break;
            case 'polyline':
                tooltipMessage = '開始繪製折線，雙擊完成';
                break;
            case 'rectangle':
                tooltipMessage = '點擊並拖動以繪製矩形';
                break;
            case 'circle':
                tooltipMessage = '點擊並拖動以繪製圓形';
                break;
            case 'marker':
                tooltipMessage = '點擊地圖以放置標記';
                break;
            case 'text':
                tooltipMessage = '點擊地圖以放置文字';
                break;
            case 'clear':
                tooltipMessage = '點擊圖形進行清除'
                break;
            default:
                tooltipMessage = '開始繪製';
        }

        const tooltip = L.tooltip({
            permanent: false,
            className: 'custom-tooltip',
            direction: 'top'
        }).setContent(tooltipMessage)
          .setLatLng($indexMap.getCenter())
          .addTo($indexMap);

        $indexMap.on('mousemove', function (event) {
            tooltip.setLatLng(event.latlng);
        });

        // 移除 Tooltip 当绘图结束
        $indexMap.on('draw:drawstop', function () {
            $indexMap.removeLayer(tooltip);
        });
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

}

let selectTool;

// 開始繪製
function initDraw() {
    drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    // 使用 jQuery 手動啟用多邊形繪製
    $('.dtPan').click(function (event) {
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
        else if (drawItem == "drawClear") {
            $('#colorPickerContent').empty();
            $('.goDraw').css('display', 'none');
            initClear();
        }
        else {
            initColorPicker(drawItem);
        }
        $(this).addClass('active');
    });
    $('#drawUndo').click(function () {
        undo();
    });
    $('#drawRedo').click(function () {
        redo();
    })
}

// 選擇工具時創造對應的選項
function initColorPicker(drawItem) {
    let colorPickerContent;
    
    if (drawItem == "drawPolyline") {
        colorPickerContent = `
            <div>
                <span>填滿</span>
            </div>
            <div class="custom-color-picker">
                <input class="color-box" type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>線段粗細</span>
            </div>
            <div>
                <select id="cp_lineThick" class="select2">
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
            <div class="custom-color-picker">
                <input class="color-box" type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>外框</span>
            </div>
            <div class="custom-color-picker">
                <input class="color-box" type="color" id="cp_borderColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>外框粗細</span>
            </div>
            <div>
                <select id="cp_borderWidth" class="select2">
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
            <div class="custom-color-picker">
                <input class="color-box" type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>字級</span>
            </div>
            <div>
                <select id="cp_fontSize" class="select2">
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
            <div class="custom-color-picker">
                <input class="color-box" type="color" id="cp_fillColor" name="colorPicker" value="#ff0000">
            </div>
            <div>
                <span>大小</span>
            </div>
            <div>
                <select id="cp_fontSize" class="select2">
                    ${generateOptions(1, 10)}
                </select>
            </div>
            <div>
                <span>樣式</span>
            </div>
            <div class="custom-select">
                <select name="state" id="imageSelect" class="select2">
                    <option value="markerRectangle" data-tag="markerRectangle"></option>
                    <option value="markerCircle" data-tag="markerCircle"></option>
                    <option value="markerCross" data-tag="markerCross"></option>
                </select>
            </div>
        `;
    }
    if (colorPickerContent) {
        $('#colorPickerContent').html(colorPickerContent);
        $('.goDraw').css('display', 'block');

        // 初始化所有的 select 為 select2
        $('.select2').select2({
            minimumResultsForSearch: Infinity, // 隱藏搜索框
        });
    }

    if (drawItem == "drawMarker") {
        $('#imageSelect').select2({
            templateResult: formatState,
            templateSelection: formatState,
            minimumResultsForSearch: Infinity, // 隱藏搜索框
            width: '55px',
            height: '27px'
        });

        function formatState(option) {
            if (!option.id) {
                return option.text;  // 保留預設的選項顯示（例如空選項）
            }
            var tagId = $(option.element).data('tag');

            // 構建 span 元素
            var span = `<span id="${tagId}" style="display:block"></span>`;
            return $(span);
        }
    }
}

function generateOptions(min, max) {
    let options = '';
    for (let i = min; i <= max; i++) {
        options += `<option value="${i}">${i}</option>`;
    }
    return options;
}

// 生成繪畫物件
function handleLayerCreation(event, layerCount) {
    var layerId = 'layer-' + layerCount;
    var layer = event.layer;
    var action = {
        type: 'create',
        layer: layer
    }
    saveOperation(action);
    applyLayerStyle(layer, event.layerType);
    if (event.layerType === 'polygon' || event.layerType === 'rectangle') {
        displayArea(layer);
    } else if (event.layerType === 'circle') {
        displayCircleArea(layer);
    }
    drawnItems.addLayer(layer);
    addItem(layerId, layer);
}

// 物件加入設定
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
    layer.bindPopup(popupContent, {
        maxWidth: 200, // 最大寬度
        maxHeight: 50 // 最大高度
    }).openPopup();
}

function displayCircleArea(layer) {
    var radius = layer.getRadius();
    var area = Math.PI * Math.pow(radius, 2);
    console.log('Circle Area:', area, 'square meters');
    var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
    layer.bindPopup(popupContent, {
        maxWidth: 200, // 最大寬度
        maxHeight: 50 // 最大高度
    }).openPopup();
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
    const fillColor = $('#cp_fillColor').val();
    const lineThick = $('#cp_lineThick').val();
    return {
        fillColor: fillColor,
        weight: parseInt(lineThick) || 1, // 線段粗細，確保為數字並設置默認值為 1
        color: fillColor, // 使用填滿顏色作為邊框顏色
    };
}
function getShapeOption3() {
    const fillColor = $('#cp_fillColor').val();
    const fontSize = $('#cp_fontSize').val();
    console.log(fillColor, fontSize);
    return {
        fontSize: parseInt(fontSize) * 10, // 將字級轉換為合理的 px 大小，例如字級 1~10 轉為 2px ~ 20px
        fillColor: fillColor,
    };
}

function getShapeOption4() {
    // 取得選中圖標的值（例如標記的 ID）
    var image = $('#imageSelect').val();
    var fontSize = $('#cp_fontSize').val();
    var fillColor = $('#cp_fillColor').val();
    console.log(fillColor, fontSize);
    return {
        image: image,
        fontSize: parseInt(fontSize) * 8, // 將字級轉換為合理的 px 大小，例如字級 1~10 轉為 2px ~ 20px
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


var eraserMode = false;
function initClear() {
    // 啟用橡皮擦模式
    eraserMode = true;
    console.log("eraser on")
    // 改變地圖樣式提示用戶進入橡皮擦模式
    $($indexMap.getContainer()).css('cursor', 'not-allowed');

    // 監聽所有圖層的點擊事件來刪除圖層
    drawnItems.eachLayer(function (layer) {
        $(layer).on('click', function () {
            if (eraserMode) {
                drawnItems.removeLayer(layer); // 刪除被點擊的圖層
                var layerId = itemMap[layer._leaflet_id];
                $(`#${layerId}`).remove();
            }
        });
    });

    // 點擊其他 ".dtPan" 元素時退出橡皮擦模式
    $('.dtPan').not('#drawClear').on('click', exitEraserMode);
}

// 退出橡皮擦模式的函數
function exitEraserMode() {
    eraserMode = false;

    // 恢復地圖光標樣式
    $($indexMap.getContainer()).css('cursor', '');

    // 移除每個圖層上的刪除事件，防止誤刪除
    drawnItems.eachLayer(function (layer) {
        $(layer).off('click');
    });

    // 移除 ".dtPan" 的事件監聽器
    $('.dtPan').off('click', exitEraserMode);
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
    const { image, fontSize, fillColor } = getShapeOption4();

    // 如果沒有選擇圖標，則不繼續執行
    if (!image) {
        console.error("請先選擇一個圖標");
        return;
    }
    // 加载 SVG 文件
    $.get(`/svg/drawtool/marker/${image}.svg`, function (svgContent) {
        const svgElement = svgContent.documentElement;
        svgElement.setAttribute('width', fontSize);
        svgElement.setAttribute('height', fontSize);
        svgElement.setAttribute('fill', fillColor);
        
        const customIcon = new L.DivIcon({
            html: new XMLSerializer().serializeToString(svgElement),
            className: '',
            iconAnchor: [16, 16], // 设置锚点
            popupAnchor: [0, -16] // 设置弹出窗口锚点
        });

        // 手動觸發繪圖開始事件
        $indexMap.fire('draw:drawstart');

        // 創建標記工具
        const markerDrawer = new L.Draw.Marker($indexMap, {
            icon: customIcon // 使用自定義圖標
        });

        // 啟用標記繪製模式
        markerDrawer.enable();

        // 使用一次性事件監聽器，只在繪製完成後處理一次
        $indexMap.once(L.Draw.Event.CREATED, function (event) {
            if (event.layerType === 'marker') {
                const layer = event.layer;

                // 將自定義圖標應用於繪製的標記
                layer.setIcon(customIcon);

                // 添加到地圖
                $indexMap.addLayer(layer);
                // 停止繪製
                markerDrawer.disable();

                // 手動觸發繪圖停止事件，重新顯示工具面板
                $indexMap.fire('draw:drawstop');
            }
        });
    }).fail(function () {
        console.error("無法加載選中的圖標文件");
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
                    cancelStack.length = 0;
                    operationStack.length = 0;
                    var jsonData = JSON.parse(e.target.result);
                    importCustomJson(jsonData);
                    importJsonData = jsonData;
                } catch (error) {
                    alert('Json檔案讀取失敗');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// 從還原操作中復原json
function recoverJson(jsonData) {
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

function importCustomJson(jsonData) {
    clearLayers();
    let layerCount = 0;
    
    var action = { type: 'import' };
    saveOperation(action);
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

// 清空當前的物件列表
function clearLayers() {
    console.log("clear Layer");
    drawnItems.clearLayers();
    $('#painterList').empty();
}

// 匯出物件
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

// 取得物件資訊
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
    console.log(`layer._leaflet_id: ${layer._leaflet_id}`);
    itemMap[layer._leaflet_id] = layerId;

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
        $indexMap.setView(center, 15);
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
    var action = {
        type: 'delete',
        layer: layer
    }
    saveOperation(action);
    drawnItems.removeLayer(layer);
    $(`#${layerId}`).remove();
}

// 保存操作到操作堆疊並清空取消堆疊
function saveOperation(state) {
    operationStack.push(state);
    cancelStack.length = 0; // 清空取消堆疊
}

// 撤銷操作
function undo() {
    console.log("operationStack：", operationStack);
    console.log("cancelStack：", cancelStack);
    if (operationStack.length > 0) {
        const state = operationStack.pop();
        excuteUndoOP(state);
        cancelStack.push(state);
    }
    else {
        alert('沒有可以復原的操作');
    }
}

// 取消撤銷
function redo() {
    console.log("operationStack：", operationStack);
    console.log("cancelStack：", cancelStack);
    if (cancelStack.length > 0) {
        const state = cancelStack.pop();
        excuteRedoOP(state);
        operationStack.push(state); // 將操作重新放回操作堆疊
    } else {
        alert('沒有可以取消復原的操作');
    }

}

// 執行返回操作
function excuteUndoOP(state) {
    
    if (state.type == 'create') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.removeLayer(state.layer);
        $(`#${layer_id}`).remove();
    }
    else if (state.type == 'remove') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.addLayer(state.layer);
        addItem(layer_id, state.layer);
    }
    else if (state.type == 'import') {
        clearLayers();
    }
}

// 執行取消府回操作
function excuteRedoOP(state) {
    
    if (state.type == 'create') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.addLayer(state.layer);
        addItem(layer_id, state.layer);
    }
    else if (state.type == 'remove') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.removeLayer(state.layer);
        $(`#${layer_id}`).remove();
    }
    else if (state.type == 'import') {
        recoverJson(importJsonData);
    }
    
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

