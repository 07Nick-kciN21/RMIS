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
    const layer = layers[id];
    if (!layer) return;

    if (typeof layer.setOpacity === 'function' && !layer.eachLayer) {
        // VectorGrid
        layer._originalOpacity = opacity;
        layer.setOpacity(opacity);
    } else if (typeof layer.eachLayer === 'function') {
        // LayerGroup（point viewport 圖層）
        layer.eachLayer(function (sub) {
            if (!sub._isVisible) return;
            sub._originalOpacity = opacity;
            if (sub instanceof L.Marker) sub.setOpacity(opacity);
            else if (sub instanceof L.Polygon) sub.setStyle({ opacity, fillOpacity: opacity });
            else if (sub instanceof L.Polyline) sub.setStyle({ opacity });
        });
    }
}

export function closeLayer(id) {
    const layer = layers[id];
    if (!layer) return;

    if (typeof layer.setOpacity === 'function' && !layer.eachLayer) {
        // VectorGrid
        layer.setOpacity(0);
    } else if (typeof layer.eachLayer === 'function') {
        // LayerGroup
        layer.eachLayer(function (sub) {
            if (sub instanceof L.Marker) sub.setOpacity(0);
            else if (sub instanceof L.Polygon) sub.setStyle({ opacity: 0, fillOpacity: 0 });
            else if (sub instanceof L.Polyline) sub.setStyle({ opacity: 0 });
        });
    }
}