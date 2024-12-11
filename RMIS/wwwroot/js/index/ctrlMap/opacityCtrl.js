import { layers } from './layers.js';

// opacity: 0~100
export function opacityLayer(opacity, layersId) {
    opacity = opacity/100;
    console.log("opacityLayer", opacity, layersId);

    var idList = layersId;
    console.log("idList", idList);
    // 從layersId中找到圖層。修改透明度
    idList.forEach(function (id) {
        if (layers[id]) {
            console.log(layers[id]);
            layers[id].eachLayer(function (layer) {
                // 检查是否为 Marker
                if (layer instanceof L.Marker) {
                    // 如果是 Marker，修改其 DOM 元素透明度
                    const markerElement = layer.getElement();
                    if (markerElement) {
                        markerElement.style.opacity = opacity;
                    }
                } else if (layer.setOpacity) {
                    // 如果是其他支持 setOpacity 的图层，直接调用 setOpacity 方法
                    layer.setOpacity(opacity);
                }
            });
        }
    });
}