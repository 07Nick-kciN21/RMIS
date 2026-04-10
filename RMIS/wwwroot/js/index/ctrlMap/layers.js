import { Map } from '../map_test.js';
import { addMarkersToLayer, addLineToLayer, addPolygonToLayer, addArrowlineToLayer } from './utils.js';

export let layerProps = {};
// pipeline下的各種圖層
export let layers = {};
let _indexMap;

// viewport 模式管理：僅 point 圖層使用
const _viewportLayers = {}; // layerId -> { svg, name, pipelineId, leafletLayer }
let _viewportTimer = null;

function _onMapViewChanged() {
    clearTimeout(_viewportTimer);
    _viewportTimer = setTimeout(() => {
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
    const bounds = _indexMap.getBounds();
    try {
        const res = await fetch('/api/MapAPI/GetPointsByViewport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        console.error('Viewport load failed', e);
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

    // 確保地圖移動事件只綁一次
    if (!_indexMap._viewportListenerBound) {
        _indexMap.on('moveend zoomend', _onMapViewChanged);
        _indexMap._viewportListenerBound = true;
    }

    const ajaxCalls = LayerData.map(function (Ldata) {
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
            console.log(`[Viewport] point layer ${Ldata.id}`);
            return;
        }

        // 其他類型（line / plane / arrowline）保持原有全量載入
        return $.ajax({
            url: `/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`,
            method: 'POST',
            success: function (result) {
                console.log(`/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`);
                try {
                    var areas = result.areas;
                    if (areas != null) {
                        var newLayer = createNewLayer(result, pipelineId);
                        _indexMap.addLayer(newLayer);
                        setPointerEvents(newLayer, Map.popupEnabled);
                        layers[result.id] = newLayer;
                    }
                    console.log("Add Layer Success");
                }
                catch (err) {
                    console.error('Add Layer Fail', err)
                }
            },
            error: function (err) {
                console.error('Call API Fail', err);
            }
        });
    });
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
    // 添加縮放事件來控制圖層顯示
    _indexMap.on('zoomend', function () {
        newLayer.eachLayer(function (layer) {
            if(!layer._isVisible){
                return;
            }
            const opacity = layer._originalOpacity || 1;
            if (layer instanceof L.Marker) {
                layer.setOpacity(opacity); // 設置 Marker 為全可見
            }
            else if (layer instanceof L.Polygon) {
                layer.setStyle({ opacity: opacity, fillOpacity: opacity });
            } else if (layer instanceof L.Polyline) {
                layer.setStyle({ opacity: opacity });
            }
        });
    });
    // 追蹤popupEnabled參數 如果為false，則interactive為false， 如果為true，則interactive為true
    $("#tb-propEnabled").on('activeChange', (event, isActive) => {
        // 檢查indexMap中有沒有該圖層
        console.log("popupEnabled", isActive);
        if (_indexMap.hasLayer(newLayer)) {
            newLayer.eachLayer(function (layer) {
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