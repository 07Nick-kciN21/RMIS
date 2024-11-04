import { getIndexMap } from './map.js';
import { addMarkersToLayer, addLineToLayer, addPolygonToLayer } from './utils.js';

export let layerProps = {};
export let layers = {};
let indexMap;
let pipelineId;
export function addLayer2Map(id ,LayerData) {
    indexMap = getIndexMap();
    if (!indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    pipelineId = id;

    if (layerProps[pipelineId] == null) {
        layerProps[pipelineId] = [];
    }
    layerProps[pipelineId].length = 0;
    

    LayerData.forEach(function (Ldata) {
        $.ajax({
            url: `/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`,
            method: 'POST',
            success: function (result) {
                console.log(`/api/MapAPI/GetAreasByLayer?LayerId=${Ldata.id}`);
                try {
                    var areas = result.areas;
                    if (areas != null) {
                        var newLayer = createNewLayer(result);
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

export function createNewLayer(result) {
    var newLayer = L.layerGroup();
    if (!indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
    console.log(result.name);
    result.areas.forEach(function (area) {
        let points = area.points.map(function (point) {
            var item = { "座標": [point.latitude, point.longitude] };
            var item2 = JSON.parse(point.prop.replace(/NaN/g, 'null'));
            const merged = { ...item, ...item2 } 
            layerProps[pipelineId].push(merged);
            return [[point.latitude, point.longitude], point.prop, merged, null];
        });
        
        if (result.type === "point") {
            addMarkersToLayer(points, newLayer, result.svg, result.name);
        } else if (result.type === "line") {
            addLineToLayer(points, newLayer, result.color, result.name);
        } else if (result.type === "polygon") {
            addPolygonToLayer(points, newLayer, result.color, result.name);
        }
    });
    // 添加縮放事件來控制圖層顯示
    indexMap.on('zoomend', function () {
        var currentZoom = indexMap.getZoom();

        // 圖層在縮放層級小於 15 時變得不可見，在縮放層級大於等於 15 時顯示
        if (currentZoom >= 15) {
            newLayer.eachLayer(function (layer) {
                if (layer.setOpacity) {
                    layer.setOpacity(1); // 設置圖層為全可見
                }
            });
        } else {
            newLayer.eachLayer(function (layer) {
                if (layer.setOpacity) {
                    layer.setOpacity(0); // 設置圖層為不可見
                }
            });
        }
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
