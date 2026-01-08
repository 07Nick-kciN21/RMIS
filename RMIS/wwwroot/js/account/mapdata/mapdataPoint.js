$(document).ready(function () {
    // 初始化欄位值
    showLoading();
    initMapdataPoints();
    $('#goback').on('click', function (e) {
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
        if (returnUrl) {
            window.location.href = returnUrl;
        } else {
            history.back(); // 若沒有 returnUrl 就用瀏覽器返回
        }
    });
});

function initMapdataPoints(){
    function getQueryParam(key) {
        let query = window.location.search.substring(1);
        let vars = query.split("&");
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split("=");
            if (decodeURIComponent(pair[0]) === key) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }
    var areaId = getQueryParam("areaId");
    $.ajax({
        url: `/Mapdata/Get/Point?areaId=${areaId}`,
        type: "GET",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                let points = data.points;
                let tbody = $("#mapdataPointBody");
                initMap(points);
                tbody.empty(); // 清空舊資料
                points.forEach(point => {
                    // 將 point.Property 格式化成漂亮的 JSON 字串
                    let infoHtml = '';
                    const props = point.property ? jsonPrettify(point.property) : {};
                    for (const key in props) {
                        infoHtml += `<b>${key}</b>: ${props[key]}<br>`;
                    }
                    let row = `
                        <tr>
                            <td>${point.index}</td>
                            <td>${point.latitude}</td>
                            <td>${point.longitude}</td>
                            <td style="width: 450px;">${infoHtml}</td>
                        </tr>
                    `;
                    tbody.append(row);
                });
                // ✅ 最後關閉 loading
                setTimeout(() => {
                    console.log("關閉 loading");
                    hideLoading();
                }, 100); // 小延遲避免過快銜接
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function initMap(mapdataArea){
    function getQueryParam(key) {
        let query = window.location.search.substring(1);
        let vars = query.split("&");
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split("=");
            if (decodeURIComponent(pair[0]) === key) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }
    let kind = getQueryParam("kind");
    let svg = getQueryParam("svg");
    // color : #228b22
    let color = getQueryParam("color");
    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
    let map = L.map('map').setView([23.5, 121], 17); // 台灣地圖預設中心    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 20
    }).addTo(map);
    
    let latlngs = mapdataArea.map(p => [p.latitude, p.longitude]);
    console.log(latlngs, kind, color);
    switch (kind) {
        case "point":
            console.log("進入point");
            latlngs.forEach(latlng => {
                let marker = L.marker(latlng, {
                    icon: icon,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    popupAnchor: [0, -15],
                });
                marker.addTo(map);
                // L.marker(latlng).addTo(map);
            });
            break;
    
        case "line":
            console.log("進入line");
            L.polyline(latlngs, { color: color }).addTo(map);
            break;
    
        case "plane":
            console.log("進入plane");
            L.polygon(latlngs, { color: color, fillOpacity: 0.3 }).addTo(map);
            break;
    
        case "arrowline":
            function addArrowlineToLayer(points, newLayer, color, name) {
                function addArrowToLine(line, color) {
                    var arrow = L.polylineDecorator(line, {
                        patterns: [
                            {
                                offset: '100%',
                                repeat: 0,      // 不重複，僅在尾端顯示箭頭
                                symbol: L.Symbol.arrowHead({
                                    pixelSize: 25,
                                    pathOptions: {
                                        fillOpacity: 1,
                                        weight: 0,
                                        color: color,
                                        interactive: false, // 禁用互動
                                    }
                                })
                            }
                        ]
                    }).addTo(newLayer);
                }
                // 把所有points的[0]取出集合
                let pointGroup = [];
                for (let i = 0; i < points.length; i++) {
                    if (points[i] && points[i][0]) {
                        pointGroup.push(points[i][0]); // 提取座標點
                    }
                }
                // 建立arrowline
                let arrowline = L.polyline(pointGroup, {
                    color: color,
                }).addTo(newLayer);
    
                var prop = points[0][1];
                // 在尾端添加箭頭
                addArrowToLine(arrowline, color);
                arrowline.on('click', function (e) {
                    if (popupEnabled) {
                        if (currentArrow) {
                            map.removeLayer(currentArrow);
                        }
                        let inverseColor = getInverseColor(color);
                        currentArrow = L.polyline(arrowline.getLatLngs(), {
                            color: inverseColor,
                            opacity: 0.8
                        }).addTo(newLayer);
                        let latLng = e.latlng; // 取得點擊事件中的座標
                        map.setView(latLng, map.getZoom()); // 將地圖的中央移動到該點，保持當前縮放級別
    
                        let mapClickHandler = function (e) {
                            if (currentArrow) {
                                map.removeLayer(currentArrow);
                            }
                            map.off('click', mapClickHandler);
                        };
    
                        map.on('click', mapClickHandler);
                    }
                    else {
                        arrowline.closePopup();
                    }
                });
            }
            let points = latlngs.map((pt, index) => [pt, mapdataArea[index].Property]); // [[latlng, property]]
            let arrowLayer = L.layerGroup().addTo(map);
            addArrowlineToLayer(points, arrowLayer, color, mapdataArea[0]?.Name || 'Arrowline');
            break;
    };
    
    // 自動調整視野
    // ✅ 計算中心並設定地圖視角
    if (latlngs.length > 0) {
        let bounds = L.latLngBounds(latlngs);
        let center = bounds.getCenter();
        map.setView(center, 17); // 可依需要調整 zoom
    }
}

function jsonPrettify(jsonStr) {
    if (!jsonStr || jsonStr.trim() === "null") {
        return "";
    }
    try {
        // 將 NaN 替換為 null
        jsonStr = jsonStr.replace(/\bNaN\b/g, "null");
        // 嘗試解析 JSON
        let obj = JSON.parse(jsonStr);
        // 轉換為漂亮格式（2空格縮排）
        return obj;
    } catch (e) {
        return jsonStr; // 無法解析時返回原始內容
    }
}

function showLoading() {
    $(".loadingSpinner").show();
}

function hideLoading() {
    $(".loadingSpinner").hide();
}