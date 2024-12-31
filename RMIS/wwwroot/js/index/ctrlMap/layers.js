import { getIndexMap } from '../map.js';
import { addMarkersToLayer, addLineToLayer, addPolygonToLayer, addArrowlineToLayer } from './utils.js';

export let layerProps = {};
// pipeline下的各種圖層
export let layers = {};
let indexMap;

// 將圖層加入地圖
export function addLayer2Map(id ,LayerData) {
    indexMap = getIndexMap();
    if (!indexMap) {
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
    const ajaxCalls = LayerData.map(function (Ldata) {
        return $.ajax({
            url: `/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`,
            method: 'POST',
            success: function (result) {
                console.log(`/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`);
                try {
                    var areas = result.areas;
                    if (areas != null) {
                        var newLayer = createNewLayer(result, pipelineId);
                        indexMap.addLayer(newLayer);
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
    if (!indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    console.log(result.name);
    result.areas.forEach(function (area) {
        // item1: 該點座標
        // item2: 點的屬性資料，如果為plane或arrowline，則只有第一個點有屬性資料需要儲存
        let points = area.points.map(function (point) {
            var item = { "座標": [point.latitude, point.longitude] };
            var item2 = point.prop != null ? JSON.parse(point.prop.replace(/NaN/g, 'null')) : null;
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
    indexMap.on('zoomend', function () {
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
    return newLayer;
}

export function removeLayer2Map(id) {
    if (!indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    console.log(`layers[${id}]`);
    if (layers[id]) {
        indexMap.removeLayer(layers[id]);
        delete layers[id];
        console.log("Remove layer success", id);
    } else {
        console.log("Layer not found for id:", id);
    }
}
