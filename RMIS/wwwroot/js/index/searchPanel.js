export function initSearchPanel() {
    const $panelSearchBtn = $('#searchPanel').find(".searchPanelBtn");
    $panelSearchBtn.on("click", () => {
        handleSearch(panelId);
    })
}

function handleSearch(panelId) {
    const $searchInput = $(`.${panelId}Input`);
    const $searchList = $(`.${panelId}List`);
    const query = $searchInput.val().trim()
    if (query) {
        $.ajax({
            url: `/api/MapAPI/GetRoadbyName?name=${query}`,
            method: 'POST',
            success: function (result) {
                try {
                    $searchList.empty();
                    result.forEach(road => {
                        $searchList.append(`<li id="panel_${road.id}" class="panelResult">${road.name}</li>`);
                        $(`#panel_${road.id}`).on('click', function () {
                            $(`.${panelId}List li`).removeClass("selected");
                            $(this).addClass("selected");
                            addRoadLayer(road.id);
                            console.log(road.id);
                        })
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }
        })
    }
}
function addRoadLayer(id) {
    var indexMap = getIndexMap();
    $.ajax({
        url: `/api/MapAPI/GetPointsbyLayerId?LayerId=${id}`,
        method: 'POST',
        success: function (result) {
            try {
                if (roadlayer) {
                    indexMap.removeLayer(roadlayer); // 移除舊的圖層
                }
                let points = result.points.map(point => [point.latitude, point.longitude]);
                if (points.length > 0) {
                    roadlayer = L.polyline(points, { color: 'blue' }).addTo(indexMap); // 添加新的圖層
                    indexMap.setView(points[0], 15); // 移動視角到第一個點
                }
                console.log("Add Layer Success");
            } catch (err) {
                console.error('Add Layer Fail', err);
            }
        },
        error: function (err) {
            console.error('Call API Fail', err);
        }
    });
}
