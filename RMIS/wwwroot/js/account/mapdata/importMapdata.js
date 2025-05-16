let map = null;

$(document).ready(function () {

    initLayerSelect();
    // 初始化leaflet地圖
    map = L.map('map').setView([24.99305818692662, 121.3010601], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    $('#formatSelect').on('change', function () {
        const format = $(this).val();
        const $fileInput = $('#Xlsx_or_Kml');
        if (format === 'xlsx') {
            $fileInput.attr('accept', '.xlsx');
        } else if (format === 'kml') {
            $fileInput.attr('accept', '.kml,.xml');
        } else {
            $fileInput.removeAttr('accept');
        }
    });
    // 預設初始化一次
    $('#formatSelect').trigger('change');

    $('#Xlsx_or_Kml').on('change', function () {
        $("#result").empty();
        var format = $('#formatSelect').val();
        console.log(format);
        // 獲取選擇的檔案
        const file = this.files[0];
        // 沒有選擇檔案就不做事
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isXlsx = fileName.endsWith('.xlsx');
        const isKmlOrXml = fileName.endsWith('.kml') || fileName.endsWith('.xml');
        // ✅ 檢查格式與選項是否匹配
        if (format === 'xlsx' && isXlsx) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                showResult_xlsx(content);
            };
            reader.readAsArrayBuffer(file);
        } else if (format === 'kml' && isKmlOrXml) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                showResult_kml(content);
            };
            reader.readAsText(file);
        } else {
            alert("檔案格式與選取類型不符，請重新選擇！");
            $(this).val(""); // ✅ 清除已選擇的檔案（阻擋上傳）
            return; // ✅ 阻止後續處理
        }
        $("#showContainer").removeClass("d-none");
    });

    $('#submit').on('click', function (e){
        e.preventDefault(); // 阻止預設提交行為
        const payload = {
            LayerId: "550e8400-e29b-41d4-a716-446655440000",
            LayerName: $("#LayerName").val(),
            LayerKind: $("#LayerKind").val(),
            LayerSvg: $("#LayerSvg").val(),
            LayerColor: $("#LayerColor").val(),
            District: $("#District").val(),
            ImportMapdataAreas: unifiedFeatures // 這裡是 JS 陣列
        };
        console.log("unifiedFeatures =", JSON.stringify(unifiedFeatures, null, 2));
        console.log(payload);
        $.ajax({
            url: '/Account/Mapdata/Import',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload), // ✅ 傳送 JSON
            success: function (data) {
                if (data.success) {
                    alert('匯入成功！');
                } else {
                    alert(data.message || '匯入失敗');
                }
            },
            error: function (xhr) {
                alert('匯入過程發生錯誤');
                console.error(xhr);
            }
        });
    });
});

function initLayerSelect(){
    var id = $("#LayerId").val();

    $.ajax({
        url: `/Account/Mapdata/Get/Layer?id=${id}`,
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                var layers = data.layers;
                var $select = $("#mapdataLayerSelector");
                $select.empty(); // 清空舊內容
                $select.append($("<option selected disabled>").val(-1).text("請選擇圖層")); // 添加預設選項            
                $.each(layers, function (i, layer) {
                    $select.append($("<option>").val(layer.id).text(layer.name));
                });
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function showResult_xlsx(buffer) {
    const kind = $("#LayerKind").val();
    const svg = $("#LayerSvg").val();
    const color = $("#LayerColor").val();

    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const xlsxJson = XLSX.utils.sheet_to_json(worksheet);

    // 清除 map 與畫面
    if (window.xlsxLayer) {
        map.removeLayer(window.xlsxLayer);
    }
    $("#showContainer").removeClass("d-none");
    $("#result").empty();

    const features = [];
    const groups = {};

    for (const row of xlsxJson) {
        const lat = parseFloat(row["pile_lat"]);
        const lng = parseFloat(row["pile_lon"]);
        if (isNaN(lat) || isNaN(lng)) continue;

        const roadId = row["road_id"] || `group_${Math.random()}`;
        if (!groups[roadId]) groups[roadId] = [];
        groups[roadId].push([lng, lat]);

        if (kind === "point") {
            features.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties: row
            });
        }
    }
    if (kind === "line" || kind === "arrowline") {
        for (const roadId in groups) {
            const coords = groups[roadId];
            if (coords.length >= 2) {
                features.push({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: coords },
                    properties: { name: roadId }
                });
            }
        }
    } else if (kind === "plane") {
        for (const roadId in groups) {
            const coords = groups[roadId];
            if (coords.length >= 3) {
                coords.push(coords[0]); // 封閉 polygon
                features.push({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [coords] },
                    properties: { name: roadId }
                });
            }
        }
    }

    const geojson = { type: "FeatureCollection", features };

    const layer = L.geoJSON(geojson, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: Map.customIcon || L.icon({
                    iconUrl: `/img/${svg}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            });
        },
        style: function (feature) {
            if (feature.geometry.type === "LineString") {
                return { color: color, weight: 3 };
            }
            if (feature.geometry.type === "Polygon") {
                return { color: color, fillColor: color, weight: 2, fillOpacity: 0.5 };
            }
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;
            if (!p) return;
            let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
            for (const key in p) {
                if (key !== 'name') html += `<tr><td><b>${key}</b></td><td>${p[key]}</td></tr>`;
            }
            html += '</table>';
            layer.bindPopup(html);
        }
    }).addTo(map);

    window.xlsxLayer = layer;
    if (layer.getBounds && layer.getLayers().length > 0) {
        map.fitBounds(layer.getBounds());
    } else {
        alert('⚠️ Excel 檔案中沒有有效圖形。');
    }
    // 顯示表格（模仿 KML）
    // for (const roadId in groups) {
    //     const placemarkRows = xlsxJson.filter(r => r.road_id == roadId);
    //     console.log(roadId, placemarkRows);
    //     const container = generateAreaContainer_xlsx(placemarkRows[0].road_name, placemarkRows);
    //     $("#result").append(container);
    // }
    unifiedFeatures = []; // 清空
    for (const roadId in groups) {
        const placemarkRows = xlsxJson.filter(r => r.road_id == roadId);
        const converted = placemarkRows.map((r, i) => ({
            Index: i + 1,
            Latitude: parseFloat(r.pile_lat),
            Longitude: parseFloat(r.pile_lon),
            Property: (r.pile_prop || "{}").replace(/\bNaN\b/g, "null")
        }));
        const ImportMapdataArea = {
            name: placemarkRows[0].road_name,
            MapdataPoints: converted
        }
        unifiedFeatures.push(ImportMapdataArea);
        const container = generateAreaContainer_unified(placemarkRows[0].road_name || roadId, converted);
        $("#result").append(container);
    }
    console.log(unifiedFeatures);
}

function showResult_kml(kmlContent) {
    var kind = $("#LayerKind").val();
    var svg = $("#LayerSvg").val();
    var color = $("#LayerColor").val();
    console.log(`${kind} ${svg} ${color}`);
    // 在這裡處理 KML 內容
    // 移除 #map的d-none class
    // 將 KML 內容顯示在地圖上
    const kmlText = kmlContent;
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const geojson = toGeoJSON.kml(kmlDoc);

    // 過濾 geojson.features 根據 kind
    geojson.features = geojson.features.filter(feature => {
        const type = feature.geometry.type;
        if (kind === "point") {
            return type === "Point";
        } else if (kind === "arrowline" || kind === "line") {
            return type === "LineString";
        } else if (kind === "plane") {
            return type === "Polygon";
        }
        return true; // 預設保留所有
    });


    // 清除原圖層（如需要）
    if (window.kmlLayer) {
        map.removeLayer(window.kmlLayer);
    }

    // 解析並加到地圖上
    // 顯示為 geoJSON 圖層
    const geoJsonLayer = L.geoJSON(geojson, {
        // 處理 Point → 自訂 marker icon
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: Map.customIcon || L.icon({
                    iconUrl: `/img/${svg}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            }).bindPopup(feature.properties || '地點');
        },
        style: function (feature) {
            const isLine = feature.geometry.type === 'LineString';
            const isPolygon = feature.geometry.type === 'Polygon';

            if (isLine) {
                return {
                    color: color,
                    weight: 3
                };
            }
            if (isPolygon) {
                return {
                    color: color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.5
                };
            }
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;
            if (!p) return;
            // 組合 popup HTML
            let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
            for (const key in p) {
                if (key !== 'name') {
                    html += `<tr><td><b>${key}</b></td><td>${p[key]}</td></tr>`;
                }
            }
            html += '</table>';
            layer.bindPopup(html);
        }
    }).addTo(map);

    const folders = Array.from(kmlDoc.getElementsByTagName("Folder"));
    console.log("folders", folders);
    unifiedFeatures = [];
    folders.forEach((folder, folderIndex) => {
        const folderName = folder.getElementsByTagName("name")[0]?.textContent || `群組${folderIndex + 1}`;
        const placemarks = Array.from(folder.getElementsByTagName("Placemark"));
        const filteredPlacemarks = placemarks.filter(pm => {
            const coordsElements = pm.getElementsByTagName("coordinates");
            console.log(coordsElements.length);
            if (kind === "point") {
                return coordsElements.length === 1; // Point
            } else if (kind === "arrowline" || kind === "line") {
                return coordsElements.length >= 1 && pm.getElementsByTagName("LineString").length > 0; // LineString
            } else if (kind === "plane") {
                return pm.getElementsByTagName("Polygon").length > 0; // Polygon
            }
            return true; // 預設保留所有
        });
        const unified = [];

        filteredPlacemarks.forEach((pm) => {
            const coordsElements = pm.getElementsByTagName("coordinates");
            const coordSet = [];

            Array.from(coordsElements).forEach(coordEl => {
                const coordsText = coordEl.textContent.trim();
                const coordLines = coordsText.split(/\s+/);

                coordLines.forEach(coord => {
                    const [lon, lat] = coord.split(",");
                    if (lat && lon) {
                        coordSet.push([parseFloat(lat), parseFloat(lon)]);
                    }
                });
            });

            const dataMap = {};
            const dataTags = pm.getElementsByTagName("Data");
            Array.from(dataTags).forEach(data => {
                const key = data.getAttribute("name");
                const val = data.getElementsByTagName("value")[0]?.textContent || '';
                dataMap[key] = val;
            });

            coordSet.forEach((coord, idx) => {
                const [lat, lon] = coord;
                unified.push({
                    Index: kind === "point" ? unified.length + 1 : (idx + 1),
                    Latitude: lat,
                    Longitude: lon,
                    Property: JSON.stringify(dataMap).replace(/\bNaN\b/g, "null")
                });
            });
        });
        const ImportMapdataArea ={
            name:folderName,
            MapdataPoints:unified
        }
        unifiedFeatures.push(ImportMapdataArea);
        const container = generateAreaContainer_unified(folderName, unified);
        $("#result").append(container);
    });
    console.log(unifiedFeatures);
    // 儲存為全域變數，方便後續移除
    window.kmlLayer = geoJsonLayer;

    if (geoJsonLayer.getBounds && geoJsonLayer.getLayers().length > 0) {
        map.fitBounds(geoJsonLayer.getBounds());
    } else {
        alert('⚠️ KML 檔案中沒有有效圖形。');
    }
}

// 生成區域容器
function generateAreaContainer_kml(folderName, placemarkList) {
    const $container = $(`
        <div class="areaContainer">
            <div class="card-header bg-primary text-white">
                <strong class="layerName">${folderName}</strong>
            </div>
            <table class="table table-bordered table-sm">
                <thead class="table-primary">
                    <tr>
                        <th>Index</th>
                        <th>緯度</th>
                        <th>經度</th>
                        <th>資訊</th>
                    </tr>
                </thead>
                <tbody class="mapdataPointBody"></tbody>
            </table>
        </div>
    `);
    const kind = $("#LayerKind").val();
    const $tbody = $container.find(".mapdataPointBody");
    let globalIndex = 1;

    placemarkList.forEach((pm) => {
        const coordsElements = pm.getElementsByTagName("coordinates");
        const coordSet = [];

        Array.from(coordsElements).forEach(coordEl => {
            const coordsText = coordEl.textContent.trim();
            const coordLines = coordsText.split(/\s+/);

            coordLines.forEach(coord => {
                const [lon, lat] = coord.split(",");
                if (lat && lon) {
                    coordSet.push([parseFloat(lat), parseFloat(lon)]);
                }
            });
        });

        // ExtendedData
        const dataMap = {};
        const dataTags = pm.getElementsByTagName("Data");
        Array.from(dataTags).forEach(data => {
            const key = data.getAttribute("name");
            const val = data.getElementsByTagName("value")[0]?.textContent || '';
            dataMap[key] = val;
        });

        let infoHtml = "";
        for (const key in dataMap) {
            infoHtml += `<b>${key}</b>: ${dataMap[key]}<br>`;
        }

        coordSet.forEach((coord, idx) => {
            const [lat, lon] = coord;
            const displayIndex = (kind === "point") ? globalIndex++ : (idx + 1);
            const $tr = $(`
                <tr>
                    <td>${displayIndex}</td>
                    <td>${lat.toFixed(6)}</td>
                    <td>${lon.toFixed(6)}</td>
                    <td>${idx === 0 ? infoHtml : ''}</td>
                </tr>
            `);
            $tbody.append($tr);
        });
    });

    return $container;
}

function generateAreaContainer_unified(name, mapdataPoints){
    const $container = $(`<div class="areaContainer">
        <div class="card-header bg-primary text-white">
            <strong class="layerName">${name}</strong>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-primary">
                <tr>
                    <th>Index</th>
                    <th>緯度</th>
                    <th>經度</th>
                    <th>資訊</th>
                </tr>
            </thead>
            <tbody class="mapdataPointBody"></tbody>
        </table>
    </div>`);
    const $tbody = $container.find(".mapdataPointBody");
    mapdataPoints.forEach(point => {
        let infoHtml = '';
        const props = point.Property ? JSON.parse(point.Property) : {};
        for (const key in props) {
            infoHtml += `<b>${key}</b>: ${props[key]}<br>`;
        }
        const $tr = $(`<tr>
            <td>${point.Index}</td>
            <td>${point.Latitude.toFixed(6)}</td>
            <td>${point.Longitude.toFixed(6)}</td>
            <td>${infoHtml}</td>
        </tr>`);
        $tbody.append($tr);
    });
    return $container;
}

function generateAreaContainer_xlsx(roadName, placemarkList) {
    const $container = $(`
        <div class="areaContainer">
            <div class="card-header bg-primary text-white">
                <strong class="layerName">${roadName}</strong>
            </div>
            <table class="table table-bordered table-sm">
                <thead class="table-primary">
                    <tr>
                        <th>Index</th>
                        <th>緯度</th>
                        <th>經度</th>
                        <th style="width: 60%;">資訊</th>
                    </tr>
                </thead>
                <tbody class="mapdataPointBody"></tbody>
            </table>
        </div>
    `);

    const $tbody = $container.find(".mapdataPointBody");
    const coordSet = [];
    
    placemarkList.forEach((pm, placemarkIndex) => {
        if(pm.pile_prop){
            jsonStr = pm.pile_prop.replace(/\bNaN\b/g, "null");
            coordSet.push({ latitude : [parseFloat(pm.pile_lat), parseFloat(pm.pile_lon)], prop : jsonStr});
        }
        else{
            coordSet.push({ latitude : [parseFloat(pm.pile_lat), parseFloat(pm.pile_lon)], prop : null });
        }
    });
    const dataMap = {};
    for (const key in dataMap) {
        infoHtml += `<b>${key}</b>: ${dataMap[key]}<br>`;
    }
    coordSet.forEach((coord, idx) => {
        const [lat, lon] = coord.latitude;
        let infoHtml = "";
        if(coord.prop != null){
            const jsonStr = coord.prop.replace(/\bNaN\b/g, "null");
            const coordProp = JSON.parse(jsonStr);
            for (const key in coordProp) {
                infoHtml += `<b>${key}</b>: ${coordProp[key]}<br>`;
            }
        }
        
        // for (const key in coord.prop) {
        //     infoHtml += `<b>${key}</b>: ${coord.prop[key]}<br>`;
        // }
        const $tr = $(`
            <tr>
                <td>${idx + 1}</td>
                <td>${lat.toFixed(6)}</td>
                <td>${lon.toFixed(6)}</td>
                <td>${infoHtml != "" ? infoHtml : ""}</td>
            </tr>
        `);
        $tbody.append($tr);
    });
    return $container;

}

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