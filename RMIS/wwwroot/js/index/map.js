// map.js

let indexMap;
// 初始化地图
export function initMap(mapId) {
    indexMap = L.map(mapId).setView([24.957276277371435, 121.21903318892302], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(indexMap);

    var $offcanvasElement = $('#layerListBlock');
    var $indexMapElement = $('#indexMap');

    // 當 offcanvas 開啟時壓縮地圖
    $offcanvasElement.on('shown.bs.offcanvas', function () {
        var offcanvasWidth = $offcanvasElement.outerWidth();
        $indexMapElement.css({
            'transition': 'all 0.3s ease-in-out',
            'margin-left': offcanvasWidth + 'px',
            'width': 'calc(100% - ' + offcanvasWidth + 'px)'
        });
    });

    // 當 offcanvas 關閉時恢復地圖
    $offcanvasElement.on('hidden.bs.offcanvas', function () {
        $indexMapElement.css({
            'margin-left': '0',
            'width': '100%'
        });
    });

    return indexMap;
}
export function getIndexMap() {
    return indexMap;
}