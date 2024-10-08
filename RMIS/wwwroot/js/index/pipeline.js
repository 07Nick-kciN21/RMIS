// pipeline.js

import { addLayer2Map, removeLayer2Map } from './layers.js';

// 根据Pipeline新增图层
export function addPipeline(id) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/MapAPI/GetLayersByPipeline?pipelineId=${id}`,
            method: 'POST',
            success: function (result) {
                console.log("Add layer success");
                resolve(result);
            },
            error: function (err) {
                console.error('Error fetching layer data', err);
                reject(err);
            }
        });
    });
}

// 创建新图层
export function createNewLayer(result) {
    var newLayer = L.layerGroup();
    console.log(result.type);
    result.areas.forEach(function (area) {
        let points = area.points.map(function (point) {
            return [point.latitude, point.longitude];
        });
        console.log(points);
        if (result.type === "point") {
            addMarkersToLayer(points, area, newLayer, result.svg);
        } else if (result.type === "line") {
            addLineToLayer(points, area, newLayer);
        } else if (result.type === "polygon") {
            addPolygonToLayer(points, area, newLayer);
        }
    });
    return newLayer;
}

// 移除Pipeline及其图层
export function removePipeline(id) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/MapAPI/GetLayerIdByPipeline?PipelineId=${id}`,
            method: 'POST',
            success: function (result) {
                var layerIds = result.layerIdList;
                layerIds.forEach(function (layerId) {
                    removeLayer2Map(layerId);
                })
                console.log("Remove Pipeline success", id);
                resolve(result);
            },
            error: function (err) {
                console.error('Error fetching layer IDs', err);
                reject(err);
            }
        });
    });
}
