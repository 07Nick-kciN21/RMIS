import { Map } from './map_test.js';

let roadlayer;
let taoyuanDistrictCenters = {
  "中壢區": { lat: 24.97993803, lng: 121.2147243 },
  "平鎮區": { lat: 24.92117923, lng: 121.2140051 },
  "龍潭區": { lat: 24.85064954, lng: 121.2117877 },
  "楊梅區": { lat: 24.91820989, lng: 121.1291697 },
  "新屋區": { lat: 24.97280352, lng: 121.067758 },
  "觀音區": { lat: 25.02671611, lng: 121.1155021 },
  "桃園區": { lat: 25.00040024, lng: 121.2996612 },
  "龜山區": { lat: 25.02417472, lng: 121.3569265 },
  "八德區": { lat: 24.94968903, lng: 121.2913102 },
  "大溪區": { lat: 24.86797026, lng: 121.296342 },
  "復興區": { lat: 24.72949884, lng: 121.3754588 },
  "大園區": { lat: 25.06384709, lng: 121.21177 },
  "蘆竹區": { lat: 25.06073337, lng: 121.2831266 }
};

export function initSearchPanel() {
    $('#search_Close').on('click', () => {
        var indexMap = Map.getIndexMap();
        if (roadlayer) {
            indexMap.removeLayer(roadlayer);
        }
    })

    $('#districtSelect').on('change', function () {
        const selectedDistrict = $(this).val();
        const center = taoyuanDistrictCenters[selectedDistrict];
        if (center) {
            const indexMap = Map.getIndexMap();
            indexMap.setView([center.lat, center.lng], 13);
        }
        handleSearch();
    });

    $('#searchRoadInput').on('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

function handleSearch() {
    const $searchList = $("#searchList");
    const district = $('#districtSelect').val();
    const query = $('#searchRoadInput').val().trim();
    if (!district && !query) {
        $searchList.empty();
        return;
    }
    $.ajax({
        // GetRoadbyName 是簡單型別參數([ApiController]預設從查詢字串綁定)，
        // 必須帶在網址上，不能放進 POST body(data)，否則後端收不到必填的 name 而回 400
        url: `/api/MapAPI/GetRoadbyName?${$.param({ name: query, district: district })}`,
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
function addRoadLayer(id) {
    var indexMap = Map.getIndexMap();
    $.ajax({
        url: `/api/MapAPI/GetPointsbyLayerId?AreaId=${id}`,
        method: 'POST',
        success: function (result) {
            try {
                if (roadlayer) {
                    indexMap.removeLayer(roadlayer); // 移除舊的圖層
                }
                let points = result.points.map(point => [point.latitude, point.longitude]);
                if (points.length > 0) {
                    roadlayer = L.polyline(points, { color: 'blue', interactive: false }).addTo(indexMap); // 添加新的圖層
                    indexMap.setView(points[0], 17); // 移動視角到第一個點
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
