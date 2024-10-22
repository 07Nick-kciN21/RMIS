// layers.js

import { getIndexMap } from './map.js';
import { addMarkersToLayer, addLineToLayer, addPolygonToLayer } from './utils.js';

export let layers = {};
let indexMap;
export function addLayer2Map(LayerData) {
    indexMap = getIndexMap();
    if (!indexMap) {
        console.error('indexMap is not initialized.');
        return;
    }
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
            return [[point.latitude, point.longitude], point.prop];
        });
        if (result.type === "point") {
            addMarkersToLayer(points, newLayer, result.svg, result.name);
        } else if (result.type === "line") {
            addLineToLayer(points, newLayer, result.color, result.name);
        } else if (result.type === "polygon") {
            addPolygonToLayer(points, newLayer, result.color, result.name);
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
