let RoadMap = null;
let AreaMap = null;


$(document).ready(function () {
    initMap(RoadMap, "RoadMap", "addRoadInput", "RoadPointsContainer");
});


function initMap(map, mapId, inputPrefix, PointsContainer) {
    let pointIndex = 0;
    map = L.map(mapId).setView([24.957276277371435, 121.21903318892302], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('click', function (e) {
        var latitude = e.latlng.lat;
        var longitude = e.latlng.lng;
        console.log("Latitude: " + latitude + ", Longitude: " + longitude + "Index: ", pointIndex);
        var marker = L.marker([latitude, longitude]).addTo(map)
            .bindPopup("Coordinates: " + latitude + ", " + longitude).openPopup();
        addPointToForm(latitude, longitude);
    });
    function addPointToForm(latitude, longitude) {
        var pointsContainer = document.getElementById(PointsContainer);
        var newPointEntry = document.createElement('div');
        newPointEntry.innerHTML = ` <input type="text" step="any" class="form-control" name="Points[${pointIndex}].Latitude" value="${latitude}" required>
                                                    <input type="text" step="any" class="form-control" name="Points[${pointIndex}].Longitude" value="${longitude}" required>
                                                    <input type="Number" step="any"name="Points[${pointIndex}].Index" value="${pointIndex}" required>
                                                  `;
        pointsContainer.appendChild(newPointEntry);
        pointIndex++;
    }
}