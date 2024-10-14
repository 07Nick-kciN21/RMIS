import { getIndexMap } from './map.js'

let $indexMap;
let borderColor = '#FF0000';
let fillColor = '#FF0000';
let painterLayer = {};
let drawControl;
export function initPainterPanel() {
    $indexMap = getIndexMap();
    const $painterPanel = $('#painterPanel');
    const $panelCloseBtn = $painterPanel.find('.closeButton');
    let layerCount = 0;
    $('#borderColor').on('input', function () {
        borderColor = $(this).val(); // 更新選擇的顏色
    });
    $('#fillColor').on('input', function () {
        fillColor = $(this).val(); // 更新選擇的顏色
    });

    const drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            remove: false,
        },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true
        }

    });

    $indexMap.on(L.Draw.Event.CREATED, function (e) {
        var layerId = 'layer-' + layerCount++;
        var layer = e.layer;
        if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
            layer.setStyle({
                color: borderColor,
                weight: 2,
                opacity: 1,
                fillColor: fillColor,
                fillOpacity: 1
            });
            var area = getArea(layer);
            console.log('Area:', area, 'square meters');

            // 您也可以將面積顯示在地圖上
            var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
            layer.bindPopup(popupContent).openPopup();
        }
        else if (e.layerType === 'circle') {
            layer.setStyle({
                color: borderColor,
                weight: 2,
                opacity: 1,
                fillColor: fillColor,
                fillOpacity: 1
            });
            // 計算圓形的面積
            var radius = layer.getRadius(); // 獲取半徑，單位為米
            var area = Math.PI * Math.pow(radius, 2); // 計算圓形的面積

            console.log('Circle Area:', area, 'square meters');

            // 顯示面積信息在地圖上
            var popupContent = "面積: " + area.toFixed(2) + " 平方公尺";
            layer.bindPopup(popupContent).openPopup();
        }
        else {
            // 如果是 marker，可以選擇設置圖標或其他屬性
            console.log('Marker added at:', layer.getLatLng());
        }
        drawnItems.addLayer(layer);
        addItem(layerId, layer);
    });
    observePainterPanel()
}

function getArea(layer) {
    // 取得多邊形的經緯度
    var latlngs = layer.getLatLngs()[0]; // 獲取多邊形的第一組經緯度

    // 確保多邊形是閉合的：檢查第一個和最後一個點是否相同，如果不是，添加第一個點到結尾
    if (!latlngs[0].equals(latlngs[latlngs.length - 1])) {
        latlngs.push(latlngs[0]);
    }

    // 使用 turf.js 計算面積
    var polygon = turf.polygon([latlngs.map(function (latlng) {
        return [latlng.lng, latlng.lat];
    })]);

    var area = turf.area(polygon);
    return area;
}

function addItem(layerId, layer) {
    const $painterList = $('#painterList');

    const item = `<div id=${layerId} class="searchBar panelResult">
        ${layerId}
        <div class="right-elements">
            <div class="eye eyeOpen" id="eye_${layerId}"></div>
            <div class="layerRemove" id="layerRemove_${layerId}"></div>
        </div>
    </div>`
    $painterList.append(item);

    const $eye = $(`#eye_${layerId}`);
    $eye.on('click', function () {
        if ($eye.hasClass('eyeOpen')) {
            $indexMap.removeLayer(layer);
            $eye.removeClass('eyeOpen');
            $eye.addClass('eyeClosed');
        } else {
            $indexMap.addLayer(layer);
            $eye.removeClass('eyeClosed');
            $eye.addClass('eyeOpen');
        }
    })
    const $layerRemove = $(`#layerRemove_${layerId}`);
    $layerRemove.on('click', function () {
        // 刪除圖層
        $indexMap.removeLayer(layer);
        // 刪除對應的列表項
        $(`#${layerId}`).remove();
    });
}

// 監聽painterPanel，綁定顯示
function observePainterPanel() {
    const $painterPanel = $('#painterPanel');

    const config = {
        attributes: true,
        attributeFilter: ['class']
    };
    const callback = function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes') {
                if ($painterPanel.hasClass('hide')) {
                    console.log("hide");
                    drawControl.remove();
                } else {
                    drawControl.addTo($indexMap);
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe($painterPanel[0], config);
}