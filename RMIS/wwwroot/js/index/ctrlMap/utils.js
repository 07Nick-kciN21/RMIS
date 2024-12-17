import { getIndexMap, popupEnabled } from '../map.js'; 


let currentRectangle = null; // 用於保存當前的矩形
let currentLine = null;


// 將標記加入圖層
export function addMarkersToLayer(points, newLayer, svg, name) {

    var $indexMap = getIndexMap();
    var zoom = $indexMap.getZoom();

    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    points.forEach(function (point) {
        let marker = L.marker(point[0], {
            icon: icon,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
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
            if(popupEnabled){
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
            }
            else{ 
                // popupEnabled為false時，不顯示popup
                e.target.closePopup();
            }
        });
        if(zoom > 15){
            marker.setOpacity(1);
        }
        else{
            marker.setOpacity(0);
        }
        $indexMap.on('click', function () {
            if (currentRectangle) {
                newLayer.removeLayer(currentRectangle);
                console.log("click");
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
            if(popupEnabled){
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
            }
            else{ 
                // popupEnabled為false時，不顯示popup
                e.target.closePopup();
            }
        });
        $indexMap.on('click', function (e) {
            if (currentLine) {
                newLayer.removeLayer(currentLine);
            }
        });

        points[i][2].Instance = segment;
    }
}


export function addPolygonToLayer(points, newLayer, color, name, autoCenter = true) {
    var $indexMap = getIndexMap();
    var pointGroup = [];
    var prop = points[0][1];
    // 把points的所有[0]取出集合
    for (var i = 0; i < points.length; i++) {
        if (points[i] && points[i][0]) {
            pointGroup.push(points[i][0]); // 提取座標點
        }
    }

    // 創建 Leaflet Polygon
    let polygon = L.polygon(pointGroup, {
        color: "#000000",        // 邊框顏色
        fillColor: color,    // 填充顏色
        fillOpacity: 0.5     // 填充透明度
    }).addTo(newLayer);
    polygon.bindPopup(`
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

    // 點擊多邊形設為相反色
    polygon.on('click', function () {
        if(popupEnabled){
            const inverseColor = getInverseColor(color);
            polygon.setStyle({ fillColor: inverseColor });
        }
        else{ 
            // popupEnabled為false時，不顯示popup
            polygon.closePopup();
        }
    });
    $indexMap.on('click', function (e) {
        polygon.setStyle({ fillColor: color });
    });
    console.log("Polygon 已繪製完成");
}
function getInverseColor(color) {
    if (!color.startsWith("#")) return "#FFFFFF"; // 預設為白色

    const hex = color.replace("#", "");
    const r = 255 - parseInt(hex.substring(0, 2), 16);
    const g = 255 - parseInt(hex.substring(2, 4), 16);
    const b = 255 - parseInt(hex.substring(4, 6), 16);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
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