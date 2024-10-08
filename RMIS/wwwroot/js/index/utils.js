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
        let marker = L.marker(point, { icon: icon }).addTo(newLayer);
        marker.bindPopup(area.constructionUnit);
    });
    console.log("Create Maker");
}

export function addLineToLayer(points, color, area, newLayer) {
    console.log("Create Line"); 
    let marker = L.polyline(points, { color: color }).addTo(newLayer);
    marker.bindPopup(area.constructionUnit);
}

export function addPolygonToLayer(points, color, area, newLayer) {
    console.log("Create Polygon");
    let marker = L.polygon(points, { color: color }).addTo(newLayer);
    marker.bindPopup(area.constructionUnit);
}
