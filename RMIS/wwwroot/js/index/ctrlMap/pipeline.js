import { removeLayer2Map } from './layers.js';

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

// 
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


export function addFocusPipeline(ofType) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/api/MapAPI/GetLayersByFocusPipeline?ofType=${ofType}`,
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