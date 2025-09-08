let map;
let markerGroup;
const coordinates = [];
$(document).ready(function () {
    initMap();
});

function initMap() {
    map = L.map('map').setView([24.956387, 121.219068], 13); // 預設為中壢區
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    // 地圖點擊事件
    map.on('click', function (e) {
        addCoordinate(e.latlng.lat, e.latlng.lng);
    });
}

function addCoordinate(lat, lng) {
    const $list = $('#coordinate-list');

    // 新增座標到列表
    coordinates.push({ lat, lng });
    const $listItem = $('<li>').text(`緯度: ${lat.toFixed(5)}, 經度: ${lng.toFixed(5)}`);
    $list.append($listItem);

    // 新增座標到地圖
    const marker = L.marker([lat, lng]);
    marker.addTo(markerGroup);
}

function submitCoordinates() {
    // 傳送座標資料至主頁面
    window.opener.postMessage(
        JSON.stringify({ type: "range" , data: coordinates}), 
        window.location.origin
    );

    // 關閉視窗
    window.close();
}