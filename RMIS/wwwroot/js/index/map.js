// map.js

let indexMap;
// 初始化地图
export function initMap(mapId) {
    indexMap = L.map(mapId).setView([24.957276277371435, 121.21903318892302], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(indexMap);
    return indexMap;
}
export function getIndexMap() {
    return indexMap;
}