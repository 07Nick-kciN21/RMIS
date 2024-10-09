import { getIndexMap } from './map.js';

let roadlayer;
export function initMovablePanel() {
    const $container = $("#indexMap");
    const $panel = $("#movablePanel");
    const $panelHeading = $("#panel-Heading");
    const $panelSearchBtn = $("#panel-SearchBtn");

    let isDragging = false;
    let offsetX, offsetY;

    $panelHeading.on("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - $panel.offset().left;
        offsetY = e.clientY - $panel.offset().top;
    });

    $(document).on("mousemove", (e) => {
        if (isDragging) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // 限制移動範圍
            const containerRect = $container[0].getBoundingClientRect();
            const panelRect = $panel[0].getBoundingClientRect();

            if (newLeft < containerRect.left) {
                newLeft = containerRect.left;
            } else if (newLeft + panelRect.width > containerRect.right) {
                newLeft = containerRect.right - panelRect.width;
            }

            if (newTop < containerRect.top) {
                newTop = containerRect.top;
            } else if (newTop + panelRect.height > containerRect.bottom) {
                newTop = containerRect.bottom - panelRect.height;
            }

            $panel.css({ left: `${newLeft}px`, top: `${newTop}px` });
        }
    });

    $(document).on("mouseup", () => {
        isDragging = false;
    });

    $panelSearchBtn.on("click", () => {
        handleSearch();
    })
}
function handleSearch() {
    console.log("click btn");
    const $searchInput = $("#panel-SearchInput");
    const $searchList = $("#panel-searchList");
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
                        $searchList.append(`<li id="panel_${road.id}" class="panel-Result">${road.name}</li>`);
                        $(`#panel_${road.id}`).on('click', function () {
                            $("#panel-searchList li").removeClass("selected");
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
