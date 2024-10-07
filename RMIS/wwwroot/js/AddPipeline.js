function addLayer2Map(LayerData) {
    LayerData.forEach(function (Ldata) {
        fetchLayerData(Ldata.id)
            .then(function (result) {
                if (result.areas != null) {
                    var newLayer = createNewLayer(result);
                    indexMap.addLayer(newLayer);
                    layers[result.id] = newLayer; // �N�ϼh�[�� layers
                }
            })
            .catch(function (err) {
                console.error('Error fetching road data', err);
            });
    });
}

// ���ΥX fetchLayerData �禡�A�M���t�d Ajax �ШD
function fetchLayerData(layerId) {
    return $.ajax({
        url: `/api/MapAPI/GetAreasByLayer?LayerId=${layerId}`,
        method: 'POST',
    });
}

// createNewLayer �禡�A�ھڦ^�Ǹ�ƨӥͦ��s�ϼh
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
            // �B�z�u�ϼh�޿�
            addLineToLayer(points, newLayer);
        } else if (area.type === "polygon") {
            // �B�z�h��ιϼh�޿�
            addPolygonToLayer(points, newLayer);
        }
    });
    return newLayer;
}

// �B�z�K�[�аO�I
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

// �B�z�u���ϼh�޿�
function addLineToLayer(points, newLayer) {
    let polyline = L.polyline(points, { color: 'blue' }).addTo(newLayer);
}

// �B�z�h��Ϊ��ϼh�޿�
function addPolygonToLayer(points, newLayer) {
    let polygon = L.polygon(points, { color: 'green' }).addTo(newLayer);
}
