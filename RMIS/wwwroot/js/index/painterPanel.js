import { getIndexMap } from './map.js'

let $indexMap;
let selectedColor;
let painterLayer = {};
export function initPainterPanel() {
    $indexMap = getIndexMap();
    const $painterPanel = $('#painterPanel');
    const $toolBar = $('#toolBar');
    const $panelCloseBtn = $painterPanel.find('.closeButton');
    let layerCount = 0;
    $('#colorPicker').on('input', function () {
        selectedColor = $(this).val(); // 更新選擇的顏色
    });

    // Initialize Leaflet.draw
    const drawnItems = new L.FeatureGroup();
    $indexMap.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        }

    });

    $indexMap.addControl(drawControl);

    $indexMap.on(L.Draw.Event.CREATED, function (e) {
        var layerId = 'layer-' + layerCount++;
        var layer = e.layer;
        layer.setStyle({ color: selectedColor }); // 應用選擇的顏色
        drawnItems.addLayer(layer);
        addItem(layerId, layer);
    });


    $panelCloseBtn.on('click', () => {
        $painterPanel.hide();
    });
}
function addItem(layerId, layer) {
    const $painterList = $('#painterList');
    const item = `<div id=layer${layerId} class="layerBar">
    ${layerId}
    <div class="layerRemove" id="layerRemove_${layerId}"></div>
    </div>`
    $painterList.append(item);
    $(`#layerRemove_${layerId}`).on('click', function (e) {
        // 刪除圖層
        $indexMap.removeLayer(layer);
        // 刪除對應的列表項
        $(`#layer${layerId}`).remove();
    });
}
