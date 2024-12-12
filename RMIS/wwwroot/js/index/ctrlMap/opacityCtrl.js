import { layers } from './layers.js';
import { getIndexMap } from '../map.js';
// opacity: 0~100
export function opacityLayer(opacity, layersId) {
    var $indexMap = getIndexMap();
    opacity = opacity/100;
    console.log("opacityLayer", opacity, layersId);

    var idList = layersId;
    console.log("idList", idList);
    // 從layersId中找到圖層。修改透明度
    idList.forEach(function (id) {
        if (layers[id]) {
            console.log(layers[id]);
            // 如果縮放等級大於15，則顯示圖層
            if($indexMap.getZoom() > 15){
                layers[id].eachLayer(function (layer) {
                    layer._originalOpacity = opacity;
                    layer.setOpacity(opacity);
                });
            }
            else{
                layers[id].eachLayer(function (layer) {
                    layer._originalOpacity = opacity;
                    layer.setOpacity(0);
                });
            }
            
        }
    });
}