import { layers } from './layers.js';
import { Map } from '../map_test.js';
// opacity: 0~100

export function opacityLayer(opacity, layersId) {
    var $indexMap = Map.getIndexMap();
    opacity = opacity/100;
    console.log("opacityLayer", opacity, layersId);

    var idList = layersId;
    console.log("idList", idList);
    // 從layersId中找到圖層。修改透明度
    idList.forEach(function (id) {
        if (layers[id]) {
            // 檢查當前縮放層級
            if ($indexMap.getZoom() > 15) {
                displayLayer(id, opacity);
            } else {
                closeLayer(id);
            }
        }
    });
}

export function displayLayer(id, opacity) {
    layers[id].eachLayer(function (layer) {
        if(!layer._isVisible){
            return;
        }
        // 保存原始透明度
        layer._originalOpacity = opacity;
        if (layer instanceof L.Marker) {
            layer.setOpacity(opacity); // 恢復透明度
        } else if (layer instanceof L.Polygon) {
            layer.setStyle({
                opacity: opacity, // 邊框透明度
                fillOpacity: opacity // 填充透明度同步
            });
        } else if (layer instanceof L.Polyline) {
            layer.setStyle({ opacity: opacity }); // 恢復透明度
        }
    });
}

export function closeLayer(id) {
    layers[id].eachLayer(function (layer) {
        if(layer._isVisible){
            return;
        }
        if (layer instanceof L.Marker) {
            layer.setOpacity(0); // 設置不可見
        } else if (layer instanceof L.Polygon) {
            layer.setStyle({
                opacity: 0,       // 邊框透明度
                fillOpacity: 0    // 填充透明度同步
            });
        } else if (layer instanceof L.Polyline) {
            layer.setStyle({ opacity: 0 }); // 設置不可見
        }
    });
};