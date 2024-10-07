function addLayer2Map(LayerData) {
    LayerData.forEach(function (Ldata) {
        fetchLayerData(Ldata.id)
            .then(function (result) {
                if (result.areas != null) {
                    var newLayer = createNewLayer(result);
                    indexMap.addLayer(newLayer);
                    layers[result.id] = newLayer; // 將圖層加至 layers
                }
            })
            .catch(function (err) {
                console.error('Error fetching road data', err);
            });
    });
}

// 分割出 fetchLayerData 函式，專門負責 Ajax 請求
function fetchLayerData(layerId) {
    return $.ajax({
        url: `/api/MapAPI/GetAreasByLayer?LayerId=${layerId}`,
        method: 'POST',
    });
}

// createNewLayer 函式，根據回傳資料來生成新圖層
function createNewLayer(result) {
    var newLayer = L.layerGroup();
    result.areas.forEach(function (area) {
        let points = area.points.map(function (point) {
            return [point.latitude, point.longitude];
        });
        console.log(points);
        if (result.type === "point") {
            addMarkersToLayer(points, area, newLayer, result.svg);
        } else if (area.type === "line") {
            // 處理線圖層邏輯
            addLineToLayer(points, newLayer);
        } else if (area.type === "polygon") {
            // 處理多邊形圖層邏輯
            addPolygonToLayer(points, newLayer);
        }
    });
    return newLayer;
}

// 處理添加標記點
function addMarkersToLayer(points, area, newLayer, svg) {
    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    console.log(`/img/${svg}`);
    points.forEach(function (point) {
        let marker = L.marker(point, { icon: icon }).addTo(newLayer);
        marker.bindPopup(area.constructionUnit);
    });
}

// 處理線的圖層邏輯
function addLineToLayer(points, newLayer) {
    let polyline = L.polyline(points, { color: 'blue' }).addTo(newLayer);
}

// 處理多邊形的圖層邏輯
function addPolygonToLayer(points, newLayer) {
    let polygon = L.polygon(points, { color: 'green' }).addTo(newLayer);
}
