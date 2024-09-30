function GetRoadbyPipelin(id, map) {
    $.ajax({
        url: `/api/MapAPI/GetRoadbyPipeline?pipeId=${id}`,
        method: 'POST',
        success: function (data) {
            let latlngs = [];
            data.forEach(function (road) {
                road.points.forEach(function (point) {
                    latlngs.push([point.latitude, point.longitude]);
                });
            });
            var polyline = L.polyline(latlngs, { color: data.color });
            polyline.addTo(map);
            console.log("add layer success", latlngs, data.color);

        },
        error: function (err) {
            console.error('Error fetching road data', err);
        }
    });
}

