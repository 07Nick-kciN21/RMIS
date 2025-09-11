let map;
let markerGroup;
const coordinates = [];

$(document).ready(function () {
    initMap();
});

function initMap() {
    console.log("initMap");
    map = L.map('map').setView([24.956387, 121.219068], 13); // 預設為中壢
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markerGroup = L.layerGroup().addTo(map);

    // 地圖點擊事件
    map.on('click', function (e) {
        addCoordinate(e.latlng.lat, e.latlng.lng);
    });
}

// 座標和照片會回傳
function addCoordinate(lat, lng) {
    const $list = $('#coordinate-list');

    // 添加座標到數據列表
    const coordinate = { lat, lng, photo: null, photoName: null };
    coordinates.push(coordinate);

    // 動態更新座標列表
    const $listItem = $('<li></li>');
    $listItem.html(`
        <div>緯度: ${lat.toFixed(5)}, 經度: ${lng.toFixed(5)}</div>
        <input type="file" accept="image/*" onchange="attachPhoto(${coordinates.length - 1}, event)">
    `);
    $list.append($listItem);

    // 新增座標到地圖
    const marker = L.marker([lat, lng]);
    marker.addTo(markerGroup);
}


function attachPhoto(index, event) {
    const photo = event.target.files[0];
    if (photo) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const base64String = event.target.result; // 取得 Base64 字串
            coordinates[index].photo = base64String;
            coordinates[index].photoName = photo.name;
        };
        reader.readAsDataURL(photo); // 將檔案讀取為 Base64
    }
}

function submitCoordinates() {
    // 傳送座標資料至主頁面
    window.opener.postMessage(
        JSON.stringify({ type: "photo" , data: coordinates}), 
        window.location.origin,
        );
    // 關閉視窗
    window.close();
}