let _fId = "searchPanel";
let _initFlag = false;
let _apiBaseUrl = "";
let _appCore;
let $indexMap;
var instance = {
    id: _fId,
    set: function (appCore) {
        _apiBaseUrl = appCore.environment.url.apiBaseUrl;
        _appCore = appCore;
        return this;
    },
    init: function () {
        console.log(`panel ${_fId} init`);
        $indexMap = _appCore.map.leafletMap;
        initSearchPanel();
        // initEstateBuildItem();
    },
    open: function () {
        if (!_initFlag) { _initFlag = true; instance.init(); }
        console.log(`${_fId} open`);
    },
    close: function () {
        console.log(`${_fId} close`);
    },
};
export { instance as searchPanel };


let roadlayer;
function initSearchPanel() {
    const $panelSearchBtn = $('#searchPanel').find(".searchPanelBtn");
    $panelSearchBtn.on("click", () => {
        console.log(_appCore.layerList);
        handleSearch();
    })

    $('#search_Close').on('click', () => {
        if (roadlayer) {
            $indexMap.removeLayer(roadlayer);
        }
    })
}

function handleSearch() {
    const $searchInput = $(".searchPanelInput");
    const $searchList = $("#searchList");
    const query = $searchInput.val().trim()
    console.log(query);
    if (query) {
        $.ajax({
            url: `/api/MapAPI/GetRoadbyName?name=${query}`,
            method: 'POST',
            success: function (result) {
                try {
                    $searchList.empty();
                    result.forEach(road => {
                        var $li = $(`<li class="panelResult">${road.name}</li>`).on('click', function () {
                            $(`#searchList li`).removeClass("selected");
                            $(this).addClass("selected");
                            addRoadLayer(road.id);
                            console.log(road.id);
                        });
                        $searchList.append($li);
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
    $.ajax({
        url: `/api/MapAPI/GetPointsbyLayerId?LayerId=${id}`,
        method: 'POST',
        success: function (result) {
            try {
                if (roadlayer) {
                    $indexMap.removeLayer(roadlayer); // 移除舊的圖層
                }
                let points = result.points.map(point => [point.latitude, point.longitude]);
                if (points.length > 0) {
                    roadlayer = L.polyline(points, { color: 'blue', interactive: false }).addTo($indexMap); // 添加新的圖層
                    $indexMap.setView(points[0], 17); // 移動視角到第一個點
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
