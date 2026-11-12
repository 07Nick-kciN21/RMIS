import { Map } from './map.js';

let $indexMap;
let borderColor = '#FF0000';
let fillColor = '#FF0000';
let borderWidth = 1;
let drawControl;
let drawnItems;
let layerCount = 0;
let itemMap = {};

let importJsonData = null;
export function initPainterPanel() {
    $indexMap = Map.getIndexMap();

    // painterPanel 為了 position:absolute 定位，DOM 上直接放在 Leaflet 地圖容器內，
    // 面板上的按鈕點擊若不攔截冒泡，會被 Leaflet 當成地圖點擊（例如繪製文字會立刻誤判成已點選座標）
    const painterPanelElement = document.getElementById('painterPanel');
    if (painterPanelElement && typeof L !== 'undefined' && L.DomEvent) {
        L.DomEvent.disableClickPropagation(painterPanelElement);
        L.DomEvent.disableScrollPropagation(painterPanelElement);
    }

    initDraw();

    // 監聽編輯開始
    $indexMap.on('draw:editstart', function () {
        $('#painterPanel').addClass('hide');

        // 提示訊息
        const tooltipMessage = "右鍵退出編輯模式，雙擊文字可修改內容";

        // 創建一個臨時的 Tooltip 並將其添加到地圖
        const tooltip = L.tooltip({
            permanent: false,
            className: 'tip',
            direction: 'right'
        }).setContent(tooltipMessage)
            .setLatLng($indexMap.getCenter())
            .addTo($indexMap);

        // 當鼠標移動時，更新 Tooltip 位置
        function moveTooltip(event) {
            tooltip.setLatLng(event.latlng);
        }

        $indexMap.on('mousemove', moveTooltip);

        // 當編輯模式停止時，移除 Tooltip 並取消鼠標移動事件綁定
        $indexMap.once('draw:editstop', function () {
            $indexMap.removeLayer(tooltip);
            $indexMap.off('mousemove', moveTooltip);
        });
    });

    // 監聽繪圖開始事件：顯示跟隨滑鼠的提示。
    // 繪製時面板保持顯示（同 PPT），可隨時調整樣式或切換工具
    $indexMap.on('draw:drawstart', function (e) {
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
            case 'circlemarker':
                tooltipMessage = '點擊地圖以放置圓形標記';
                break;
            case 'marker':
                tooltipMessage = '點擊地圖以放置標記';
                break;
            case 'text':
                tooltipMessage = '點擊地圖後輸入文字，Enter 完成';
                break;
            case 'clear':
                tooltipMessage = '點擊圖形進行清除'
                break;
            default:
                tooltipMessage = '開始繪製';
                break;
        }

        const tooltip = L.tooltip({
            permanent: false,
            className: 'tip',
            direction: 'right'
        }).setContent(tooltipMessage)
            .setLatLng($indexMap.getCenter())
            .addTo($indexMap);

        function moveTooltip(event) {
            tooltip.setLatLng(event.latlng);
        }

        $indexMap.on('mousemove', moveTooltip);

        // 繪圖結束時移除 tooltip 與滑鼠事件
        $indexMap.once('draw:drawstop', function () {
            $indexMap.removeLayer(tooltip);
            $indexMap.off('mousemove', moveTooltip);
        });
    });

    // 監聽編輯結束
    $indexMap.on('draw:editstop', function () {
        $('#painterPanel').removeClass('hide');
    });

    // 監聽 'draw:created' 並處理圖層創建
    $indexMap.on('draw:created', function (e) {
        console.log("draw Created", layerCount);
        handleLayerCreation(e, layerCount++);
    });

    // 面板關閉時結束進行中的繪製，避免關閉後仍在地圖上繪圖
    $('#tb-painterPanel, #painterPanel .closeButton').on('click', function () {
        if ($('#painterPanel').hasClass('hide')) {
            stopActiveDrawer();
        }
    });

}

let selectTool;
// 目前啟用中的繪製器（點選工具即開始繪製）
let activeDrawer = null;

// 點選即開始繪製的工具，樣式取自共用樣式列
const DIRECT_DRAW_TOOLS = {
    drawPolyline: initPolyline,
    drawPolygon: initPolygon,
    drawRectangle: initRectangle,
    drawCircle: initCircle,
    drawCircleMarker: initCircleMarker,
    drawMarker: initMarker,
    drawText: initText,
};

// 開始繪製
function initDraw() {
    drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    initStyleBar();

    // 繪製完成或取消（Esc）後，結束直接繪製模式並取消工具選取，與 PPT 畫完一個圖形即回到選取狀態一致
    $indexMap.on('draw:drawstop', function () {
        if (activeDrawer) {
            activeDrawer = null;
            $('#colorPickerContent').empty();
            if (selectTool) {
                selectTool.removeClass('active');
                selectTool = null;
            }
        }
    });

    // 使用 jQuery 手動啟用多邊形繪製
    $('.dtBtn').click(function (event) {
        let drawItem = $(this).attr('id');

        // 再點一次正在繪製的工具：取消繪製
        if (activeDrawer && selectTool && selectTool.attr('id') === drawItem) {
            stopActiveDrawer();
            return;
        }
        stopActiveDrawer();

        if (selectTool) {
            selectTool.removeClass('active');
        }
        selectTool = $(this);
        // 切到其他工具時收起匯入/匯出選單；原本是靠這次點擊冒泡到 document 觸發 hideMenu，
        // 但面板現在會攔截冒泡避免誤觸地圖點擊，改成切換工具時直接關閉，不依賴冒泡
        if (drawItem !== "drawIO") {
            $('#ptbInOut').hide();
        }
        if (drawItem == "drawIO") {
            console.log("drawIO click");
            event.stopPropagation();
            $('#ptbInOut').toggle(); // 切換選單顯示和隱藏
            initInOut();
        }
        else if (drawItem == "drawClear") {
            $('#colorPickerContent').empty();
            initClear();
        }
        else if (drawItem == "drawEdit") {
            $('#colorPickerContent').empty();
            initEdit();
        }
        else if (DIRECT_DRAW_TOOLS[drawItem]) {
            renderToolOptions(drawItem);
            DIRECT_DRAW_TOOLS[drawItem]();
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

// 工具專屬選項（共用樣式以外的設定），切換工具後再回來會保留上次的值
const toolOptions = {
    markerSize: 4,               // 1~10，實際像素為 x8
    markerImage: 'markerRectangle',
    fontSize: 2,                 // 1~10，實際像素為 x10
};

// 選擇工具時顯示該工具專屬的選項；顏色、外框、粗細一律使用共用樣式列
function renderToolOptions(drawItem) {
    let content = '';

    if (drawItem == "drawText") {
        content = `
            <div>
                <span>字級</span>
            </div>
            <div>
                <select id="cp_fontSize" class="select2">
                    ${generateOptions(1, 10, toolOptions.fontSize)}
                </select>
            </div>
        `;
    }
    else if (drawItem == "drawMarker") {
        const images = ['markerRectangle', 'markerCircle', 'markerCross'];
        const imageOptions = images.map(function (image) {
            const selected = image === toolOptions.markerImage ? 'selected' : '';
            return `<option value="${image}" data-tag="${image}" ${selected}></option>`;
        }).join('');
        content = `
            <div>
                <span>大小</span>
            </div>
            <div>
                <select id="cp_markerSize" class="select2">
                    ${generateOptions(1, 10, toolOptions.markerSize)}
                </select>
            </div>
            <div>
                <span>樣式</span>
            </div>
            <div class="custom-select">
                <select name="state" id="imageSelect">
                    ${imageOptions}
                </select>
            </div>
        `;
    }

    $('#colorPickerContent').html(content);
    if (!content) {
        return;
    }

    $('#colorPickerContent .select2').select2({
        minimumResultsForSearch: Infinity, // 隱藏搜索框
        dropdownParent: $('#colorPicker'),
    });

    if (drawItem == "drawText") {
        $('#cp_fontSize').on('change', function () {
            toolOptions.fontSize = parseInt(this.value) || 1;
            refreshActiveDrawerStyle();
        });
    }
    else if (drawItem == "drawMarker") {
        $('#imageSelect').select2({
            dropdownParent: $('#colorPicker'),
            templateResult: formatState,
            templateSelection: formatState,
            minimumResultsForSearch: Infinity, // 隱藏搜索框
            width: '55px',
            height: '27px'
        });

        $('#cp_markerSize').on('change', function () {
            toolOptions.markerSize = parseInt(this.value) || 1;
            refreshMarkerIcon();
        });
        $('#imageSelect').on('change', function () {
            toolOptions.markerImage = this.value;
            refreshMarkerIcon();
        });
    }
}

function formatState(option) {
    if (!option.id) {
        return option.text;  // 保留預設的選項顯示（例如空選項）
    }
    var tagId = $(option.element).data('tag');

    // 構建 span 元素
    var span = `<span id="${tagId}" style="display:block"></span>`;
    return $(span);
}

function generateOptions(min, max, selected) {
    let options = '';
    for (let i = min; i <= max; i++) {
        options += `<option value="${i}" ${i === selected ? 'selected' : ''}>${i}</option>`;
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
        layer.setStyle(getShapeStyle(layerType !== 'polyline'));
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

// 綁定共用樣式列，變更時同步到 fillColor / borderColor / borderWidth
function initStyleBar() {
    $('#ds_borderWidth').select2({
        minimumResultsForSearch: Infinity, // 隱藏搜索框
        dropdownParent: $('#drawStyleBar'),
    });

    $('#ds_fillColor').on('input change', function () {
        fillColor = this.value;
        refreshActiveDrawerStyle();
    });
    $('#ds_borderColor').on('input change', function () {
        borderColor = this.value;
        refreshActiveDrawerStyle();
    });
    $('#ds_borderWidth').on('change', function () {
        borderWidth = parseInt(this.value) || 1;
        refreshActiveDrawerStyle();
    });
}

// 依共用樣式列產生圖形樣式；線段只用外框顏色與粗細（同 PPT 線條）
function getShapeStyle(withFill) {
    const style = {
        color: borderColor,
        weight: borderWidth,
        opacity: 1,
    };
    if (withFill) {
        style.fill = true;
        style.fillColor = fillColor;
        style.fillOpacity = 1;
    }
    return style;
}

// 繪製中變更樣式時，同步更新繪製器設定與繪製中的預覽圖形
function refreshActiveDrawerStyle() {
    if (!activeDrawer || !selectTool) {
        return;
    }
    const drawItem = selectTool.attr('id');
    if (drawItem === 'drawMarker') {
        refreshMarkerIcon();
        return;
    }
    if (drawItem === 'drawText') {
        activeDrawer.refreshStyle();
        return;
    }

    const style = getShapeStyle(drawItem !== 'drawPolyline');
    // CircleMarker 的樣式直接放在 options，其餘繪製器放在 options.shapeOptions
    L.extend(activeDrawer.options.shapeOptions || activeDrawer.options, style);
    const preview = activeDrawer._poly || activeDrawer._shape || activeDrawer._marker;
    if (preview && preview.setStyle) {
        preview.setStyle(style);
    }
}

// 結束目前啟用中的直接繪製（disable 會觸發 draw:drawstop）
function stopActiveDrawer() {
    if (activeDrawer) {
        activeDrawer.disable();
    }
}

// 以下各工具建立繪製器後立即啟用；完成後由 draw:created 的 handleLayerCreation 套用樣式並加入 drawnItems

// 線段：以外框顏色與粗細繪製（同 PPT 線條使用外框設定）
function initPolyline() {
    activeDrawer = new L.Draw.Polyline($indexMap, {
        shapeOptions: getShapeStyle(false)
    });
    activeDrawer.enable();
}

function initPolygon() {
    activeDrawer = new L.Draw.Polygon($indexMap, {
        shapeOptions: getShapeStyle(true)
    });
    activeDrawer.enable();
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

    // 點擊其他 ".dtBtn" 元素時退出橡皮擦模式
    $('.dtBtn').not('#drawClear').on('click', exitEraserMode);
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

    // 移除 ".dtBtn" 的事件監聽器
    $('.dtBtn').off('click', exitEraserMode);
}

let activeEditHandler = null;
let activeEditExitHandler = null;

function initEdit() {
    // 若已有編輯工作階段在進行中，先結束前一個，避免事件重複綁定造成 undo 記錄重複寫入
    if (activeEditHandler) {
        $indexMap.off('contextmenu', activeEditExitHandler);
        disableTextContentEditing();
        removeTextResizeHandles();
        activeEditHandler.save();
        activeEditHandler.disable();
    }
    $indexMap.off('draw:edited');

    var editHandler = new L.EditToolbar.Edit($indexMap, {
        featureGroup: drawnItems
    });

    // 進入編輯前，先記錄所有圖層目前的幾何狀態，供結束編輯後比對是否變動並寫入復原堆疊
    var beforeEditSnapshots = {};
    drawnItems.eachLayer(function (layer) {
        beforeEditSnapshots[L.Util.stamp(layer)] = getLayerGeometrySnapshot(layer);
    });

    editHandler.enable(); // 啟動編輯模式
    addTextResizeHandles();
    enableTextContentEditing();

    // 當使用者完成編輯（save() 觸發）時，把實際變動過的圖層寫入復原堆疊
    $indexMap.on('draw:edited', function (e) {
        e.layers.eachLayer(function (layer) {
            var before = beforeEditSnapshots[L.Util.stamp(layer)];
            if (!before) return;
            var after = getLayerGeometrySnapshot(layer);
            saveOperation({ type: 'edit', layer: layer, before: before, after: after });
        });
    });

    activeEditHandler = editHandler;
    activeEditExitHandler = function () {
        // 先完成文字修改並儲存變動（觸發 draw:edited 寫入復原堆疊），再結束編輯模式
        disableTextContentEditing();
        removeTextResizeHandles();
        editHandler.save();
        editHandler.disable();
        $indexMap.off('contextmenu', activeEditExitHandler);
        activeEditHandler = null;
        activeEditExitHandler = null;
    };

    // 右鍵退出編輯模式
    $indexMap.on('contextmenu', activeEditExitHandler);
}

function initCircle() {
    activeDrawer = new L.Draw.Circle($indexMap, {
        shapeOptions: getShapeStyle(true)
    });
    activeDrawer.enable();
}

function initRectangle() {
    activeDrawer = new L.Draw.Rectangle($indexMap, {
        shapeOptions: getShapeStyle(true)
    });
    activeDrawer.enable();
}

function initCircleMarker() {
    // CircleMarker 的樣式設定直接放在 options 而非 shapeOptions
    activeDrawer = new L.Draw.CircleMarker($indexMap, getShapeStyle(true));
    activeDrawer.enable();
}

// 標記 SVG 快取（key: 樣式名稱），變更大小或顏色時不必重新下載
const markerSvgCache = {};

// 依目前的填滿色與標記選項產生圖示，SVG 未快取時會先下載
function getMarkerIcon(callback) {
    const image = toolOptions.markerImage;
    const build = function (svgText) {
        callback(buildMarkerIcon(svgText, toolOptions.markerSize * 8, fillColor));
    };

    if (markerSvgCache[image]) {
        build(markerSvgCache[image]);
        return;
    }
    $.get(`/svg/drawtool/marker/${image}.svg`, function (svgContent) {
        markerSvgCache[image] = new XMLSerializer().serializeToString(svgContent.documentElement);
        build(markerSvgCache[image]);
    }).fail(function () {
        console.error("無法加載選中的圖標文件");
    });
}

function buildMarkerIcon(svgText, size, color) {
    const svgElement = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
    svgElement.setAttribute('width', size);
    svgElement.setAttribute('height', size);
    svgElement.setAttribute('fill', color);

    return L.divIcon({
        html: new XMLSerializer().serializeToString(svgElement),
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2], // 錨點置中
        popupAnchor: [0, -size / 2]
    });
}

function initMarker() {
    getMarkerIcon(function (icon) {
        // 圖示下載期間若已切換到其他工具，就不再啟用
        if (!selectTool || selectTool.attr('id') !== 'drawMarker' || activeDrawer) {
            return;
        }
        activeDrawer = new L.Draw.Marker($indexMap, { icon: icon });
        activeDrawer.enable();
    });
}

// 標記繪製中變更大小、樣式或顏色時，更新跟隨滑鼠的預覽圖示與之後放置的圖示
function refreshMarkerIcon() {
    getMarkerIcon(function (icon) {
        if (!activeDrawer || !selectTool || selectTool.attr('id') !== 'drawMarker') {
            return;
        }
        activeDrawer.options.icon = icon;
        if (activeDrawer._marker) {
            activeDrawer._marker.setIcon(icon);
        }
    });
}

// 文字圖層的內容與樣式存在 layer.textData：{ text, color, fontSize, width, height }
// width 為 null 時依內容自動寬度；有值時固定框寬並自動換行（同 PPT 文字方塊）
// height 為 null 時依內容自動高度；有值時固定框高，文字靠上，超出部分照常顯示
function buildTextIcon(textData) {
    const $text = $('<div class="painter-text">')
        .css({ color: textData.color, 'font-size': `${textData.fontSize}px` })
        .text(textData.text);
    if (textData.width) {
        $text.addClass('fixed-width').css('width', `${textData.width}px`);
    }
    if (textData.height) {
        $text.css('height', `${textData.height}px`);
    }
    return L.divIcon({
        className: 'custom-text-label',
        html: $text.prop('outerHTML'),
        iconSize: null,
    });
}

function createTextMarker(latlng, textData) {
    const marker = L.marker(latlng, { icon: buildTextIcon(textData) });
    marker.textData = textData;
    return marker;
}

// 文字框的拖曳控制點：右側調寬、下方調高、右下角同時調整
const TEXT_RESIZE_HANDLES = [
    { name: 'e', resizeX: true, resizeY: false, title: '拖曳調整文字框寬度' },
    { name: 's', resizeX: false, resizeY: true, title: '拖曳調整文字框高度' },
    { name: 'se', resizeX: true, resizeY: true, title: '拖曳調整文字框大小' },
];

// 編輯模式下，在每個文字框加上拖曳控制點以調整框的大小
function addTextResizeHandles() {
    drawnItems.eachLayer(function (layer) {
        const iconElement = layer.textData && layer.getElement && layer.getElement();
        if (!iconElement) {
            return; // 非文字圖層，或已隱藏不在地圖上
        }
        TEXT_RESIZE_HANDLES.forEach(function (direction) {
            const handle = L.DomUtil.create('div', `painter-text-resize resize-${direction.name}`, iconElement);
            handle.title = direction.title;
            // 攔截按下事件，避免同時觸發標記拖曳（移動位置）
            L.DomEvent.disableClickPropagation(handle);
            L.DomEvent.on(handle, 'pointerdown', function (e) {
                startTextResize(e, layer, handle, direction);
            });
        });
    });
}

function removeTextResizeHandles() {
    $('.painter-text-resize').remove();
}

function startTextResize(e, layer, handle, direction) {
    L.DomEvent.stop(e);

    const textData = layer.textData;
    const textElement = layer.getElement().querySelector('.painter-text');
    const startRect = textElement.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const minSize = textData.fontSize; // 至少容納一個字
    const startTextWidth = textData.width;
    const startTextHeight = textData.height;

    handle.setPointerCapture(e.pointerId);

    function onMove(ev) {
        if (direction.resizeX) {
            const width = Math.max(minSize, Math.round(startRect.width + ev.clientX - startX));
            textElement.classList.add('fixed-width');
            textElement.style.width = `${width}px`;
            textData.width = width;
        }
        if (direction.resizeY) {
            const height = Math.max(minSize, Math.round(startRect.height + ev.clientY - startY));
            textElement.style.height = `${height}px`;
            textData.height = height;
        }
    }

    function onUp() {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        if (textData.width === startTextWidth && textData.height === startTextHeight) {
            return;
        }
        // 只更新 icon 設定、不呼叫 setIcon，避免編輯中重建圖示而失去拖曳與控制點；
        // 之後重新顯示（眼睛開關）時會用新的寬度產生圖示
        layer.options.icon = buildTextIcon(layer.textData);
        // 讓 Leaflet.draw 在結束編輯時把此圖層列入 draw:edited，寫入復原堆疊
        layer.edited = true;
    }

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
}

// 編輯模式下雙擊文字可直接修改內容；記錄進行中的修改，結束編輯模式時先完成它
let activeTextEditCommit = null;

function enableTextContentEditing() {
    drawnItems.eachLayer(function (layer) {
        if (layer.textData) {
            layer.on('dblclick', onTextDblClick);
        }
    });
}

function disableTextContentEditing() {
    if (activeTextEditCommit) {
        activeTextEditCommit();
    }
    drawnItems.eachLayer(function (layer) {
        if (layer.textData) {
            layer.off('dblclick', onTextDblClick);
        }
    });
}

function onTextDblClick(e) {
    L.DomEvent.stop(e.originalEvent);
    startTextContentEdit(e.target);
}

// 在原本的文字框內直接編輯（保留框寬、框高與換行），Enter 或點擊其他位置完成，Esc 取消
function startTextContentEdit(layer) {
    if (activeTextEditCommit) {
        activeTextEditCommit();
    }
    const iconElement = layer.getElement();
    if (!iconElement) {
        return;
    }
    const textElement = iconElement.querySelector('.painter-text');
    const textData = layer.textData;
    const originalText = textData.text;

    // 編輯中停用標記拖曳，滑鼠才能定位游標與選取文字
    const wasDraggable = layer.dragging && layer.dragging.enabled();
    if (wasDraggable) {
        layer.dragging.disable();
    }

    // plaintext-only 可避免貼上或換行時插入 HTML，不支援的瀏覽器退回 true
    textElement.setAttribute('contenteditable', 'plaintext-only');
    if (textElement.contentEditable !== 'plaintext-only') {
        textElement.setAttribute('contenteditable', 'true');
    }
    textElement.classList.add('editing');

    // 攔截滑鼠與按鍵，避免拖動地圖、觸發標記事件或鍵盤平移縮放
    const STOP_EVENTS = 'pointerdown mousedown touchstart click dblclick contextmenu';
    L.DomEvent.on(textElement, STOP_EVENTS, L.DomEvent.stopPropagation);
    textElement.addEventListener('keydown', onKeyDown);
    textElement.addEventListener('blur', commit);

    function onKeyDown(ev) {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
            ev.preventDefault();
            finish(true);
        } else if (ev.key === 'Escape') {
            ev.preventDefault();
            finish(false);
        }
    }

    function commit() {
        finish(true);
    }

    function finish(save) {
        if (activeTextEditCommit !== commit) {
            return; // 已結束
        }
        activeTextEditCommit = null;
        L.DomEvent.off(textElement, STOP_EVENTS, L.DomEvent.stopPropagation);
        textElement.removeEventListener('keydown', onKeyDown);
        textElement.removeEventListener('blur', commit);
        textElement.removeAttribute('contenteditable');
        textElement.classList.remove('editing');
        if (wasDraggable) {
            layer.dragging.enable();
        }

        const newText = textElement.textContent.trim();
        if (save && newText && newText !== originalText) {
            textData.text = newText;
            // 同調整大小：只更新 icon 設定、不呼叫 setIcon，並標記給 Leaflet.draw 寫入復原堆疊
            layer.options.icon = buildTextIcon(textData);
            layer.edited = true;
        }
        // 正規化內容（移除編輯時可能插入的換行元素）；清空或取消時還原原文字
        textElement.textContent = textData.text;
    }

    activeTextEditCommit = commit;
    textElement.focus();
    // 進入編輯時全選文字，方便直接改寫
    const range = document.createRange();
    range.selectNodeContents(textElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// 文字：先點擊地圖決定位置，再於該處的文字框直接輸入（同 PPT 文字方塊），顏色使用填滿色。
// 輸入中可調整面板上的顏色與字級（點面板不會結束輸入）；
// Enter、點擊地圖其他位置或切換工具時完成，Esc 取消。
// 介面與 Leaflet.draw 繪製器相同（disable），讓切換工具、Esc 取消的流程一致
function initText() {
    let enabled = true;
    let editor = null;   // 輸入中的暫時文字框 { marker, input }

    const drawer = {
        disable: function () {
            if (!enabled) {
                return;
            }
            enabled = false;
            commitEditor();
            $indexMap.off('click', onMapClick);
            $(document).off('keydown', onKeyDown);
            $indexMap.fire('draw:drawstop', { layerType: 'text' });
        },
        // 共用樣式列或字級變更時，同步更新輸入中的文字框
        refreshStyle: function () {
            if (editor) {
                $(editor.input).css(getTextCss());
            }
        }
    };

    function getTextCss() {
        return { color: fillColor, 'font-size': `${toolOptions.fontSize * 10}px` };
    }

    function onMapClick(e) {
        // 已在輸入時點擊地圖其他位置，視為完成輸入
        if (editor) {
            drawer.disable();
            return;
        }
        openEditor(e.latlng);
    }

    function openEditor(latlng) {
        const input = $('<input type="text" class="painter-text-editor" size="1" />').css(getTextCss())[0];
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'custom-text-label',
                html: input,
                iconSize: null,
            }),
            keyboard: false,
            zIndexOffset: 1000,
        }).addTo($indexMap);

        // 文字框位於地圖內，攔截點擊與按鍵，避免觸發地圖點擊、拖曳或鍵盤平移縮放
        L.DomEvent.disableClickPropagation(input);
        $(input).on('keydown', function (e) {
            e.stopPropagation();
            if (e.key === 'Enter') {
                drawer.disable();
            } else if (e.key === 'Escape') {
                cancelEditor();
                drawer.disable();
            }
        });
        // 隨內容調整寬度
        $(input).on('input', function () {
            this.size = Math.max(this.value.length, 1);
        });

        editor = { marker: marker, input: input };
        setTimeout(function () {
            input.focus();
        }, 0);
    }

    function cancelEditor() {
        if (editor) {
            $indexMap.removeLayer(editor.marker);
            editor = null;
        }
    }

    // 有輸入文字才建立文字圖層，空白則直接捨棄
    function commitEditor() {
        if (!editor) {
            return;
        }
        const text = editor.input.value.trim();
        const latlng = editor.marker.getLatLng();
        cancelEditor();
        if (!text) {
            return;
        }

        const textMarker = createTextMarker(latlng, {
            text: text,
            color: fillColor,
            fontSize: toolOptions.fontSize * 10,
            width: null,
            height: null,
        });

        // 手動觸發 'draw:created' 事件，確保流程一致
        $indexMap.fire('draw:created', {
            layer: textMarker,
            layerType: 'text'
        });
    }

    // 尚未開始輸入時，Esc 取消文字工具（輸入中的 Esc 由文字框自行處理）
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            drawer.disable();
        }
    }

    activeDrawer = drawer;
    $indexMap.on('click', onMapClick);
    $(document).on('keydown', onKeyDown);
    $indexMap.fire('draw:drawstart', { layerType: 'text' });
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
            console.log("匯入Json");
            importGeoJson();            
            break;
        case "匯出Json":
            console.log("匯出Json");
            exportLayers();
            break;
        case "匯入圖資":
            console.log("匯入圖資");
            importMapdata();
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

function importMapdata() {
    console.log("匯入圖資");
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.kml';
    input.onchange = function (event) {
        var file = event.target.files[0];
        $indexMap = Map.getIndexMap();
        if (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const kmlText = e.target.result;
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
                    const geojson = toGeoJSON.kml(kmlDoc);
                    console.log(geojson);
                    // 清除原圖層（如需要）
                    if (window.kmlLayer) {
                        $indexMap.removeLayer(window.kmlLayer);
                    }

                    // 解析並加到地圖上
                    // 顯示為 geoJSON 圖層
                    const geoJsonLayer = L.geoJSON(geojson, {
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng, {
                                icon: Map.customIcon || L.icon({
                                    iconUrl: '/img/2.png',
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 32],
                                    popupAnchor: [0, -32]
                                })
                            }).bindPopup(feature.properties || '地點');
                        },
                        style: function (feature) {
                            const isLine = feature.geometry.type === 'LineString';
                            const isPolygon = feature.geometry.type === 'Polygon';
                            if (isLine) {
                                return {
                                    color: 'red',
                                    weight: 3
                                };
                            }
                            if (isPolygon) {
                                return {
                                    color: 'red',
                                    weight: 2,
                                    fillColor: 'green',
                                    fillOpacity: 0.5
                                };
                            }
                        },
                        onEachFeature: function (feature, layer) {
                            const p = feature.properties;
                            if (!p) return;

                            // 組合 popup HTML
                            let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
                            for (const key in p) {
                            if (key !== 'name') {
                                html += `<tr><td><b>${key}</b></td><td>${p[key]}</td></tr>`;
                            }
                            }
                            html += '</table>';
                            layer.bindPopup(html);
                        }
                    }).addTo($indexMap);

                    // 儲存為全域變數，方便後續移除
                    window.kmlLayer = geoJsonLayer;

                    if (geoJsonLayer.getBounds && geoJsonLayer.getLayers().length > 0) {
                        $indexMap.fitBounds(geoJsonLayer.getBounds());
                    } else {
                        alert('⚠️ KML 檔案中沒有有效圖形。');
                    }
                } catch (error) {
                    console.error('KML檔案讀取失敗', error);
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

// 操作堆疊
let operationStack = [];
// 取消堆疊
let cancelStack = [];

// 保存操作到操作堆疊並清空取消堆疊
function saveOperation(state) {
    operationStack.push(state);
    cancelStack.length = 0; // 清空取消堆疊
}

// 撤銷操作
function undo() {
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
    if (cancelStack.length > 0) {
        const state = cancelStack.pop();
        excuteRedoOP(state);
        operationStack.push(state); // 將操作重新放回操作堆疊
    } else {
        alert('沒有可以取消復原的操作');
    }

}

// 取得圖層目前的幾何狀態快照（供編輯復原/取消復原使用）
function getLayerGeometrySnapshot(layer) {
    if (layer instanceof L.Circle) {
        return { latlng: layer.getLatLng(), radius: layer.getRadius() };
    } else if (layer.textData) { // 文字：位置與框的大小
        return { latlng: layer.getLatLng(), text: layer.textData.text, width: layer.textData.width, height: layer.textData.height };
    } else if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        return { latlng: layer.getLatLng() };
    } else if (layer instanceof L.Polyline) { // 涵蓋 Polygon、Rectangle（皆繼承自 Polyline）
        return { latlngs: cloneLatLngs(layer.getLatLngs()) };
    }
    return null;
}

// 將圖層還原為指定的幾何快照
function applyLayerGeometrySnapshot(layer, snapshot) {
    if (!snapshot) return;
    if (layer instanceof L.Circle) {
        layer.setLatLng(snapshot.latlng);
        layer.setRadius(snapshot.radius);
    } else if (layer.textData) {
        layer.setLatLng(snapshot.latlng);
        if (snapshot.text !== layer.textData.text || snapshot.width !== layer.textData.width || snapshot.height !== layer.textData.height) {
            layer.textData.text = snapshot.text;
            layer.textData.width = snapshot.width;
            layer.textData.height = snapshot.height;
            layer.setIcon(buildTextIcon(layer.textData));
        }
    } else if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        layer.setLatLng(snapshot.latlng);
    } else if (layer instanceof L.Polyline) {
        layer.setLatLngs(cloneLatLngs(snapshot.latlngs));
    }
}

function cloneLatLngs(latlngs) {
    if (Array.isArray(latlngs)) {
        return latlngs.map(cloneLatLngs);
    }
    return L.latLng(latlngs.lat, latlngs.lng);
}

// 執行返回操作
function excuteUndoOP(state) {

    if (state.type == 'create') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.removeLayer(state.layer);
        $(`#${layer_id}`).remove();
    }
    else if (state.type == 'remove' || state.type == 'delete') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.addLayer(state.layer);
        addItem(layer_id, state.layer);
    }
    else if (state.type == 'import') {
        clearLayers();
    }
    else if (state.type == 'edit') {
        applyLayerGeometrySnapshot(state.layer, state.before);
    }
}

// 執行取消府回操作
function excuteRedoOP(state) {

    if (state.type == 'create') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.addLayer(state.layer);
        addItem(layer_id, state.layer);
    }
    else if (state.type == 'remove' || state.type == 'delete') {
        var layer_id = itemMap[state.layer._leaflet_id];
        drawnItems.removeLayer(state.layer);
        $(`#${layer_id}`).remove();
    }
    else if (state.type == 'import') {
        recoverJson(importJsonData);
    }
    else if (state.type == 'edit') {
        applyLayerGeometrySnapshot(state.layer, state.after);
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