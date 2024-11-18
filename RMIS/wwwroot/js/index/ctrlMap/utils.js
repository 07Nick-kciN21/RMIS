import { Rectangle } from '../../../lib/leaflet/leaflet-src.esm.js';
import { getIndexMap } from '../map.js'; 


let currentRectangle = null; // 用於保存當前的矩形
let currentLine = null;
export function addMarkersToLayer(points, newLayer, svg, name) {
    var $indexMap = getIndexMap();
    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    points.forEach(function (point) {

        let marker = L.marker(point[0], {
            icon: icon,
        }).addTo(newLayer);
        let prop = point[1];
        marker.bindPopup(`
            <div class="popupData" style="display: none;">
            ${prop}
            </div>
            <div>
            <h4>圖層：${name}</h4><br>
            ${popUpForm(prop)}
            </div>`, {
            maxWidth: 300,
            maxHeight: 450
        });
        marker.on('click', function (e) {
            const latLng = e.latlng;
            $indexMap.setView(latLng, $indexMap.getZoom());

            if (currentRectangle) {
                newLayer.removeLayer(currentRectangle);
            }

            const bounds = [[
                latLng.lat - 0.00002, latLng.lng - 0.00002
            ], [
                latLng.lat + 0.00002, latLng.lng + 0.00002
            ]];
            currentRectangle = L.rectangle(bounds, {
                color: "#ff7800",
                weight: 1,
                fillOpacity: 0.3,
            }).addTo(newLayer);
        });
        $indexMap.on('click', function (e) {
            if (currentRectangle) {
                newLayer.removeLayer(currentRectangle);
            }
           
        });
        point[2].Instance = marker;
    });
    console.log("Create Maker");
}

export function addLineToLayer(points, newLayer, color, name) {
    var $indexMap = getIndexMap();
    console.log("Create Line");
    for (var i = 0; i < points.length - 1; i++) {
        var startPoint = points[i][0];
        var endPoint = points[i + 1][0];
        var prop = points[i][1];

        // 創建線段
        var segment = L.polyline([startPoint, endPoint], {
            color: color
        }).addTo(newLayer);

        // 為每個線段綁定 Popup，顯示其起點和終點座標
        segment.bindPopup(`
            <div class="popupData" style="display: none;">
                ${prop}
            </div>
            <div>
                <h4>圖層：${name}</h4><br>
                ${popUpForm(prop)}
            </div>`, {
            maxWidth: 300,
            maxHeight: 450
        });

        segment.on('click', function (e) {
            if (currentLine) {
                $indexMap.removeLayer(currentLine);
            }

            // 將當前點擊的線段設置為白色並增加線段寬度
            currentLine = L.polyline(e.target.getLatLngs(), {
                color: 'white',
                opacity: 0.8
            }).addTo(newLayer);

            // 移動地圖中央到點擊的點
            const latLng = e.latlng; // 取得點擊事件中的座標
            $indexMap.setView(latLng, $indexMap.getZoom()); // 將地圖的中央移動到該點，保持當前縮放級別
        });
        $indexMap.on('click', function (e) {
            if (currentLine) {
                newLayer.removeLayer(currentLine);
            }
        });

        points[i][2].Instance = segment;
    }
}
export function addPolygonToLayer(points, newLayer,  color, name) {
    console.log("Create Polygon");
    let marker = L.polygon(points, { color: color }).addTo(newLayer);
    marker.bindPopup(`<b>${name}</b>`);
}

function popUpForm(prop) {
    if (typeof prop === 'string') {
        prop = prop.replace(/NaN/g, 'null');
        try {
            prop = JSON.parse(prop);
        } catch (e) {
            console.error("無法解析 JSON:", e);
            return "無效的 JSON 資料";
        }
    }

    let table = '<table class="popup-table-content"  cellpadding="5" cellspacing="0">';

    Object.keys(prop).forEach(key => {
        table += `<tr><th>${key}</th><td>${prop[key]}</td></tr>`;
    });

    table += '</table>';

    return `
        <div class="popup-table">
            ${table}
        </div>
    `;
}

