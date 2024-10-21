// utils.js

// 
export function addMarkersToLayer(points, area, newLayer, svg) {
    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    points.forEach(function (point) {
        let marker = L.marker(point[0], { icon: icon }).addTo(newLayer);
        marker.bindPopup(`
                          <div>
                            <b>單點資訊</b><br>
                            ${point[1]}
                          </div>`);
    });
    console.log("Create Maker");
}

export function addLineToLayer(points, color, area, newLayer) {
    console.log("Create Line"); 
    for (var i = 0; i < points.length - 1; i++) {
        var startPoint = points[i];
        var endPoint = points[i + 1];

        // 創建線段
        var segment = L.polyline([startPoint[0], endPoint[0]], { color: color }).addTo(newLayer);

        // 為每個線段綁定 Popup，顯示其起點和終點座標
        segment.bindPopup(`
                          <div>
                            <b>線段資訊</b><br>
                            ${startPoint[1]}
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
        })
    }
}
export function addPolygonToLayer(points, color, area, newLayer) {
    console.log("Create Polygon");
    let marker = L.polygon(points, { color: color }).addTo(newLayer);
    marker.bindPopup(`<b>${area.constructionUnit}</b>`);
}
