import { Map } from '../map_test.js';
import { addMarkersToLayer, addLineToLayer, addPolygonToLayer, addArrowlineToLayer } from './utils.js';
import { showLoading, hideLoading } from '../../loading.js';

export let layerProps = {};
// pipeline下的各種圖層
export let layers = {};
let _indexMap;
let _globalListenersBound = false;

// ── Loading 狀態管理 ───────────────────────────────────────────────
// 兩個獨立計數器：
//   _bgLoadingCount  — 背景屬性載入（GetAreasByLayer），同時禁用地圖互動
//   _tileLoadingCount — VectorGrid 磚片請求（vtile），只顯示遮罩不禁用互動

let _bgLoadingCount   = 0;
let _tileLoadingCount = 0;
const _HANDLERS = ['dragging', 'scrollWheelZoom', 'touchZoom', 'doubleClickZoom', 'boxZoom', 'keyboard'];
let _savedHandlerStates = {};

function _anyLoading()  { return _bgLoadingCount > 0 || _tileLoadingCount > 0; }

// 屬性載入：顯示遮罩 + 禁用地圖互動
function _incBgLoading(n) {
    if (_bgLoadingCount === 0) {
        showLoading('圖資屬性載入中...', '.div0');
        if (_indexMap) {
            _HANDLERS.forEach(function (h) {
                if (_indexMap[h]) {
                    _savedHandlerStates[h] = _indexMap[h].enabled();
                    _indexMap[h].disable();
                }
            });
        }
    }
    _bgLoadingCount += n;
}
function _decBgLoading(n) {
    _bgLoadingCount = Math.max(0, _bgLoadingCount - n);
    if (_bgLoadingCount === 0) {
        // 還原互動
        if (_indexMap) {
            _HANDLERS.forEach(function (h) {
                if (_indexMap[h] && _savedHandlerStates[h]) _indexMap[h].enable();
            });
            _savedHandlerStates = {};
        }
        // 若磚片仍在載入，遮罩繼續顯示（僅更換文字）
        if (_tileLoadingCount > 0) {
            showLoading('圖磚載入中...', '.div0');
        } else {
            hideLoading('.div0');
        }
    }
}

// 磚片載入：只顯示遮罩，不禁用互動
function _incTileLoading() {
    _tileLoadingCount++;
    if (_tileLoadingCount === 1 && _bgLoadingCount === 0) {
        showLoading('圖磚載入中...', '.div0');
    }
}
function _decTileLoading() {
    _tileLoadingCount = Math.max(0, _tileLoadingCount - 1);
    if (_tileLoadingCount === 0 && _bgLoadingCount === 0) {
        hideLoading('.div0');
    }
}

function _buildVTStyle(ldata, zoom = 15) {
    const color = ldata.color || '#3388ff';
    const weight = zoom >= 18 ? 4 : zoom >= 16 ? 3 : 2;
    switch (ldata.kind) {
        case 'plane':
            return { weight: 1, color: '#000', fillColor: color, fill: true, fillOpacity: 0.5, opacity: 1 };
        default: // line, arrowline
            return { weight, color, opacity: 1 };
    }
}

function _createVTPopup(prop, layerName) {
    let formProp = {};
    if (typeof prop === 'string' && prop.trim() !== '') {
        try { formProp = JSON.parse(prop.replace(/NaN/g, 'null')) || {}; } catch (e) { }
    }
    let rows = Object.keys(formProp)
        .map(k => `<tr><th style="white-space:nowrap;padding:3px 6px;">${k}</th><td style="padding:3px 6px;">${formProp[k] ?? ''}</td></tr>`)
        .join('');
    return `<div style="font-size:15px;"><b style="font-size:18px;">圖層：${layerName}</b><table style="margin-top:6px;border-collapse:collapse;">${rows}</table></div>`;
}

function _ensureGlobalListeners() {
    if (_globalListenersBound || !_indexMap) return;
    _globalListenersBound = true;

    _indexMap.on('zoomend', function () {
        Object.values(layers).forEach(function (layer) {
            if (!layer._isVisible) return;
            const opacity = layer._originalOpacity || 1;
            // VectorGrid (L.GridLayer) 直接有 setOpacity
            if (typeof layer.setOpacity === 'function' && !layer.eachLayer) {
                layer.setOpacity(opacity);
            } else if (typeof layer.eachLayer === 'function') {
                layer.eachLayer(function (sub) {
                    if (!sub._isVisible) return;
                    const op = sub._originalOpacity || 1;
                    if (sub instanceof L.Marker) sub.setOpacity(op);
                    else if (sub instanceof L.Polygon) sub.setStyle({ opacity: op, fillOpacity: op });
                    else if (sub instanceof L.Polyline) sub.setStyle({ opacity: op });
                });
            }
        });
    });

    $("#tb-propEnabled").on('activeChange', function (event, isActive) {
        Object.values(layers).forEach(function (layer) {
            if (!_indexMap.hasLayer(layer)) return;
            // 只有 LayerGroup（point viewport）有 eachLayer + SVG path
            if (typeof layer.eachLayer !== 'function') return;
            layer.eachLayer(function (sub) {
                if (sub instanceof L.Polyline || sub instanceof L.Polygon) {
                    const path = sub._path;
                    if (path) path.style.pointerEvents = isActive ? 'auto' : 'none';
                }
            });
        });
    });
}

// viewport 模式管理：僅 point 圖層使用
const _viewportLayers = {}; // layerId -> { svg, name, pipelineId, leafletLayer, _abortController }
let _viewportTimer = null;

function _onMapViewChanged() {
    clearTimeout(_viewportTimer);
    _viewportTimer = setTimeout(() => {
        if (_indexMap.getZoom() < 15) {
            Object.values(_viewportLayers).forEach(vl => vl.leafletLayer.clearLayers());
            return;
        }
        Object.keys(_viewportLayers).forEach(layerId => {
            if (_indexMap.hasLayer(_viewportLayers[layerId].leafletLayer)) {
                _loadViewportPoints(layerId);
            }
        });
    }, 400);
}

async function _loadViewportPoints(layerId) {
    const vl = _viewportLayers[layerId];
    if (!vl) return;
    if (_indexMap.getZoom() < 15) {
        vl.leafletLayer.clearLayers();
        return;
    }

    // 取消上一個尚未完成的請求，避免舊回應覆蓋新結果
    if (vl._abortController) {
        vl._abortController.abort();
    }
    vl._abortController = new AbortController();
    const signal = vl._abortController.signal;

    const bounds = _indexMap.getBounds();
    _incTileLoading();
    try {
        const res = await fetch('/api/MapAPI/GetPointsByViewport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                layerId,
                minLat: bounds.getSouth(),
                maxLat: bounds.getNorth(),
                minLon: bounds.getWest(),
                maxLon: bounds.getEast()
            })
        });
        const data = await res.json();
        if (!data.success) return;

        vl.leafletLayer.clearLayers();
        const pipelineId = vl.pipelineId;
        if (layerProps[pipelineId] == null) layerProps[pipelineId] = [];

        const points = data.points.map(p => {
            let item2 = null;
            if (p.property && p.property.trim() !== '') {
                try { item2 = JSON.parse(p.property.replace(/NaN/g, 'null')); } catch (e) { }
            }
            const merged = { '座標': [p.latitude, p.longitude], ...item2 };
            if (item2 != null) layerProps[pipelineId].push(merged);
            return [[p.latitude, p.longitude], p.property, merged, null];
        });
        addMarkersToLayer(points, vl.leafletLayer, data.svg, data.layerName);
        console.log(`Viewport loaded ${data.total} points for layer ${layerId}`);
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('Viewport load failed', e);
    } finally {
        _decTileLoading();
    }
}

// var layers = {
//     set: function(map){
//         _indexMap = map;
//     }
// }

// 將圖層加入地圖
export function addLayer2Map(id ,LayerData) {
    _indexMap = Map.getIndexMap();
    if (!_indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    const pipelineId = id;
    console.log(`pipelineId：${pipelineId} addLayer2Map`);
    if (layerProps[pipelineId] == null) {
        layerProps[pipelineId] = [];
        console.log(`layerProps[${pipelineId}]： is null`);
    }
    if (!layerProps[pipelineId]) {
        layerProps[pipelineId] = [];
    }

    _ensureGlobalListeners();

    // 確保地圖移動事件只綁一次
    if (!_indexMap._viewportListenerBound) {
        _indexMap.on('moveend zoomend', _onMapViewChanged);
        _indexMap._viewportListenerBound = true;
    }

    const bgFetches = [];   // 收集背景屬性載入的 Promise

    LayerData.forEach(function (Ldata) {
        // point 圖層改用 viewport 模式
        if (Ldata.kind === 'point') {
            const leafletLayer = L.layerGroup();
            _indexMap.addLayer(leafletLayer);
            layers[Ldata.id] = leafletLayer;
            _viewportLayers[Ldata.id] = {
                svg: Ldata.svg,
                name: Ldata.name,
                pipelineId,
                leafletLayer
            };
            _loadViewportPoints(Ldata.id);
            return;
        }

        // line / plane / arrowline 改用 Vector Tiles
        const vtLayer = L.vectorGrid.protobuf(
            `/api/MapAPI/vtile/${Ldata.id}/{z}/{x}/{y}`,
            {
                vectorTileLayerStyles: { 'layer': (properties, zoom) => _buildVTStyle(Ldata, zoom) },
                interactive: true,
                getFeatureId: f => f.properties.areaId,
                updateWhenZooming: false,
                updateWhenIdle: true,
                keepBuffer: 2,
                minZoom: 15,
                maxZoom: 22
            }
        );
        vtLayer.on('click', function (e) {
            if (!Map.popupEnabled) return;
            const content = _createVTPopup(e.layer.properties.prop, Ldata.name);
            L.popup({ maxWidth: 350, maxHeight: 450 })
                .setLatLng(e.latlng)
                .setContent(content)
                .openOn(_indexMap);
        });
        vtLayer.on('loading', _incTileLoading);
        vtLayer.on('load',    _decTileLoading);

        vtLayer._isVisible = true;
        vtLayer._originalOpacity = 1;
        _indexMap.addLayer(vtLayer);
        layers[Ldata.id] = vtLayer;

        // 背景載入屬性資料
        bgFetches.push(
            $.ajax({
                url: `/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`,
                method: 'POST',
                success: function (result) {
                    if (!result.areas) return;
                    result.areas.forEach(function (area) {
                        (area.points || []).forEach(function (point) {
                            let item2 = null;
                            if (point.prop && point.prop.trim() !== '') {
                                try { item2 = JSON.parse(point.prop.replace(/NaN/g, 'null')); } catch (e) {}
                            }
                            if (item2) {
                                layerProps[pipelineId].push({ '座標': [point.latitude, point.longitude], ...item2 });
                            }
                        });
                    });
                }
            })
        );
    });

    // 背景屬性載入：地圖 loading 遮罩 + layerBar 小 spinner
    if (bgFetches.length > 0) {
        _incBgLoading(bgFetches.length);

        const $spinner = $('<span class="spinner-border spinner-border-sm text-secondary ms-1" role="status" title="屬性資料載入中" style="vertical-align:middle;"></span>');
        $(`#layerBar_${pipelineId} .layerName`).append($spinner);

        $.when(...bgFetches).always(function () {
            $spinner.remove();
            _decBgLoading(bgFetches.length);
        });
    }
}

// 建立新物件的圖層
function createNewLayer(result, pipelineId) {
    var newLayer = L.layerGroup();
    if (!_indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    console.log("createNewLayer");
    console.log(result.name);
    result.areas.forEach(function (area) {
        // 跳過空的 points 陣列
        if (!area.points || area.points.length === 0) {
            console.warn('Skipping area with empty points:', area.id);
            return;
        }
        // item1: 該點座標
        // item2: 點的屬性資料，如果為plane或arrowline，則只有第一個點有屬性資料需要儲存
        let points = area.points.map(function (point) {
            var item = { "座標": [point.latitude, point.longitude] };
            var item2 = null;
            if (point.prop != null && point.prop.trim() !== '') {
                try {
                    item2 = JSON.parse(point.prop.replace(/NaN/g, 'null'));
                } catch (e) {
                    console.error('JSON parse error for prop:', point.prop, e);
                }
            }
            const merged = { ...item, ...item2 } 
            if(item2 != null){
                layerProps[pipelineId].push(merged);
            }
            return [[point.latitude, point.longitude], point.prop, merged, null];
        });
        if (result.type === "point") {
            addMarkersToLayer(points, newLayer, result.svg, result.name);
        } else if (result.type === "line") {
            addLineToLayer(points, newLayer, result.color, result.name);
        } else if (result.type === "plane") {
            addPolygonToLayer(points, newLayer, result.color, result.name);
        } else if(result.type === "arrowline"){
            addArrowlineToLayer(points, newLayer, result.color, result.name);
        }
    });
    return newLayer;
}

function setPointerEvents(targetLayer, isActive) {
    if (targetLayer instanceof L.LayerGroup) {
        targetLayer.eachLayer(function (layer) {
            if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
                const path = layer._path; // 直接取底層 SVG 路徑
                if (path) {
                    path.style.pointerEvents = isActive ? 'auto' : 'none';
                }
            } else if (layer instanceof L.PolylineDecorator) {
                // 如果是 L.polylineDecorator，取出裝飾的基礎圖層
                console.log("L.PolylineDecorator");
            }
        });
    }
    
}

export function removeLayer2Map(id) {
    if (!_indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    console.log(`Remove layer [${id}]`);
    if (layers[id]) {
        _indexMap.removeLayer(layers[id]);
        delete layers[id];
        if (_viewportLayers[id]) {
            if (_viewportLayers[id]._abortController) {
                _viewportLayers[id]._abortController.abort();
            }
            delete _viewportLayers[id];
        }
        console.log("Remove layer success", id);
    } else {
        console.log("Layer not found for id:", id);
    }
}

export function addFocusLayer2Map(id, ofType, LayerData, startDate, endDate){
    _indexMap = Map.getIndexMap();
    if (!_indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    const pipelineId = id;
    console.log(`pipelineId：${pipelineId} addLayer2Map`);
    if (layerProps[pipelineId] == null) {
        layerProps[pipelineId] = [];
        console.log(`layerProps[${pipelineId}]： is null`);
    }
    layerProps[pipelineId].length = 0;

    LayerData.map(function (Ldata) {
        var formData = new FormData();
        formData.append('id', Ldata.id);
        formData.append('ofType', ofType);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        fetch(`/api/MapAPI/GetAreasByFocusLayer`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            console.log(`/api/MapAPI/GetAreasByFocusLayer`, Ldata.id, startDate, endDate);
            try {
                var areas = result.datas.areas;
                console.log(result.datas);
                if (areas != null) {
                    var newLayer = createNewLayer(result.datas, pipelineId);
                    _indexMap.addLayer(newLayer);
                    setPointerEvents(newLayer, Map.popupEnabled);
                    layers[result.datas.id] = newLayer;
                    console.log("Add Layer Success", result.datas);
                }
            }
            catch (err) {
                console.error('Add Layer Fail', err)
            }
        });
    });
}

export function getLayerProps(id) {
    return new Promise((resolve, reject) => {
        // 檢查 layerProps 是否已經有數據
        if (layerProps[id] && layerProps[id].length > 0) {
            resolve(layerProps[id]);
        } else {
            // 監聽 layerProps 的變化（使用 setTimeout 模擬非同步輪詢）
            let attempts = 0;
            const interval = setInterval(() => {
                if (layerProps[id] && layerProps[id].length > 0) {
                    clearInterval(interval);
                    resolve(layerProps[id]);
                }
                if (++attempts > 20) { // 最多等待 2 秒 (100ms * 20)
                    clearInterval(interval);
                    reject(new Error(`超時：未能獲取 layerProps[${id}]`));
                }
            }, 100);
        }
    });
}

export function deleteLayerProps(id) {
    return new Promise((resolve, reject) => {
        if (layerProps[id]) {
            delete layerProps[id];
            console.log(`layerProps[${id}] 已刪除`);
            resolve(`layerProps[${id}] 刪除成功`);
        } else {
            resolve(`layerProps[${id}] 不存在`);
        }
    });
}