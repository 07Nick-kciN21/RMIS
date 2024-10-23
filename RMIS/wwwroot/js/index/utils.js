import { getIndexMap } from './map.js'; 


export function addMarkersToLayer(points, newLayer, svg, name) {
    var $indexMap = getIndexMap();
    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    points.forEach(function (point) {

        let marker = L.marker(point[0], { icon: icon }).addTo(newLayer);
        marker.bindPopup(`
                          <div class="data" style="display: none">${point[1]}</div>
                          <div>
                            <h4>圖層：${name}</h4><br>
                            ${popUpForm(point[1])}
                          </div>`);
        marker.on('click', function (e) {
            const latLng = e.latlng; // 取得點擊事件中的座標
            console.log("latlng：", latLng);
            $indexMap.setView(latLng, $indexMap.getZoom()); // 將地圖的中央移動到該點，保持當前縮放級別
        })
    });
    console.log("Create Maker");
}

export function addLineToLayer(points, newLayer,  color, name) {
    var $indexMap = getIndexMap();
    console.log("Create Line"); 
    for (var i = 0; i < points.length - 1; i++) {
        var startPoint = points[i][0];
        var endPoint = points[i + 1][0];
        var prop = points[i][1];
        // 創建線段
        var segment = L.polyline([startPoint, endPoint], { color: color }).addTo(newLayer);

        // 為每個線段綁定 Popup，顯示其起點和終點座標
        segment.bindPopup(`
                          <div>
                            <h4>圖層：${name}</h4><br>
                            ${popUpForm(prop)}
                          </div>
                        `);

        segment.on('click', function (e) {
            newLayer.eachLayer(function (layer) {
                if (layer instanceof L.Polyline) {
                    layer.setStyle({ color: color });
                }
            });
            // 將當前點擊的線段設置為白色
            this.setStyle({
                color: 'white'
            });
            // 移動地圖中央到點擊的點
            
            const latLng = e.latlng; // 取得點擊事件中的座標
            console.log("latlng：", latLng);
            $indexMap.setView(latLng, $indexMap.getZoom()); // 將地圖的中央移動到該點，保持當前縮放級別
        })
    }
}
export function addPolygonToLayer(points, newLayer,  color, name) {
    console.log("Create Polygon");
    let marker = L.polygon(points, { color: color }).addTo(newLayer);
    marker.bindPopup(`<b>${name}</b>`);
}

function popUpForm(prop) {
    if (typeof prop === 'string') {
        prop = prop.replace(/NaN/g, 'null');
        try {
            prop = JSON.parse(prop);
        } catch (e) {
            console.error("無法解析 JSON:", e);
            return "無效的 JSON 資料";
        }
    }

    let table = '<table class="popup-table-content"  cellpadding="5" cellspacing="0">';

    Object.keys(prop).forEach(key => {
        table += `<tr><th>${key}</th><td>${prop[key]}</td></tr>`;
    });

    table += '</table>';

    return `
        <div class="popup-table">
            ${table}
        </div>
    `;
}