const TABLE_LIMIT = 200;

$(document).ready(function () {
    showLoading();
    initMapdataPoints();

    $('#goback').on('click', function () {
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
        if (returnUrl) window.location.href = returnUrl;
        else history.back();
    });
});

function initMapdataPoints() {
    const areaId = getQueryParam("areaId");
    $.ajax({
        url: `/Mapdata/Get/Point?areaId=${areaId}`,
        type: "GET",
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (!data.success) { hideLoading(); return; }
            const points = data.points;
            initMap(points);
            renderTable(points);
            setTimeout(hideLoading, 100);
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
            hideLoading();
        }
    });
}

// ── 表格渲染（DocumentFragment 批次寫入，最多顯示 TABLE_LIMIT 筆）──────────
function renderTable(points) {
    const tbody = document.getElementById('mapdataPointBody');
    const fragment = document.createDocumentFragment();
    const limit = Math.min(points.length, TABLE_LIMIT);

    for (let i = 0; i < limit; i++) {
        const point = points[i];
        const props = point.property ? jsonPrettify(point.property) : {};

        const tr = document.createElement('tr');

        const tdIdx  = document.createElement('td'); tdIdx.textContent  = point.index;
        const tdLat  = document.createElement('td'); tdLat.textContent  = point.latitude;
        const tdLng  = document.createElement('td'); tdLng.textContent  = point.longitude;
        const tdInfo = document.createElement('td'); tdInfo.style.width = '450px';

        if (props && typeof props === 'object') {
            Object.entries(props).forEach(([k, v]) => {
                const b = document.createElement('b');
                b.textContent = k;
                tdInfo.appendChild(b);
                tdInfo.appendChild(document.createTextNode(': ' + v));
                tdInfo.appendChild(document.createElement('br'));
            });
        } else if (props) {
            tdInfo.textContent = props;
        }

        tr.append(tdIdx, tdLat, tdLng, tdInfo);
        fragment.appendChild(tr);
    }

    if (points.length > TABLE_LIMIT) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.className = 'text-muted text-center small';
        td.textContent = `顯示前 ${TABLE_LIMIT} 筆，共 ${points.length} 筆`;
        tr.appendChild(td);
        fragment.appendChild(tr);
    }

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// ── 地圖渲染 ──────────────────────────────────────────────────────────────
function initMap(mapdataArea) {
    const kind  = getQueryParam("kind");
    const svg   = getQueryParam("svg");
    const color = getQueryParam("color") || '#3388ff';

    const map = L.map('map').setView([23.5, 121], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 20
    }).addTo(map);

    const latlngs = mapdataArea.map(p => [p.latitude, p.longitude]);

    // Canvas renderer：用單一 canvas 元素繪製，取代逐條 SVG path，大量節點時顯著加快
    const canvasRenderer = L.canvas({ padding: 0.5 });

    switch (kind) {
        case "point": {
            const icon = L.icon({
                iconUrl: `/img/${svg}`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });
            // MarkerClusterGroup：大量圖標聚合，避免萬筆同時渲染 DOM
            const cluster = L.markerClusterGroup({
                maxClusterRadius: 40,
                disableClusteringAtZoom: 18
            });
            mapdataArea.forEach(p => {
                const marker = L.marker([p.latitude, p.longitude], { icon });
                const props = p.property ? jsonPrettify(p.property) : {};
                if (props && typeof props === 'object') {
                    const info = Object.entries(props)
                        .map(([k, v]) => `<b>${escapeHtml(String(k))}</b>: ${escapeHtml(String(v))}`)
                        .join('<br>');
                    if (info) marker.bindPopup(info);
                }
                cluster.addLayer(marker);
            });
            cluster.addTo(map);
            break;
        }

        case "line": {
            const polyline = L.polyline(latlngs, { color, renderer: canvasRenderer, smoothFactor: 1.5 }).addTo(map);
            const popup = buildFeaturePopup(mapdataArea[0]);
            if (popup) polyline.bindPopup(popup);
            break;
        }

        case "plane": {
            const polygon = L.polygon(latlngs, { color, fillOpacity: 0.3, renderer: canvasRenderer }).addTo(map);
            const popup = buildFeaturePopup(mapdataArea[0]);
            if (popup) polygon.bindPopup(popup);
            break;
        }

        case "arrowline": {
            const layer = L.layerGroup().addTo(map);
            let currentHighlight = null;

            const arrowline = L.polyline(latlngs, { color, renderer: canvasRenderer }).addTo(layer);
            L.polylineDecorator(arrowline, {
                patterns: [{
                    offset: '100%', repeat: 0,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 25,
                        pathOptions: { fillOpacity: 1, weight: 0, color, interactive: false }
                    })
                }]
            }).addTo(layer);

            arrowline.on('click', function (e) {
                if (currentHighlight) {
                    map.removeLayer(currentHighlight);
                    currentHighlight = null;
                }
                currentHighlight = L.polyline(arrowline.getLatLngs(), {
                    color: invertColor(color), opacity: 0.8, weight: 5
                }).addTo(layer);
                map.setView(e.latlng, map.getZoom());
                map.once('click', function () {
                    if (currentHighlight) { map.removeLayer(currentHighlight); currentHighlight = null; }
                });
            });
            break;
        }
    }

    if (latlngs.length > 0) {
        map.fitBounds(L.latLngBounds(latlngs));
    }
}

// ── 工具函式 ──────────────────────────────────────────────────────────────

// 從第一個點的 property 建立 popup HTML（line / plane / arrowline 共用）
function buildFeaturePopup(point) {
    if (!point || !point.property) return null;
    const props = jsonPrettify(point.property);
    if (!props || typeof props !== 'object') return null;
    const html = Object.entries(props)
        .map(([k, v]) => `<b>${escapeHtml(String(k))}</b>: ${escapeHtml(String(v))}`)
        .join('<br>');
    return html || null;
}

function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function invertColor(hex) {
    if (!hex || !hex.startsWith('#') || hex.length < 7) return '#ff0000';
    const r = (255 - parseInt(hex.slice(1, 3), 16)).toString(16).padStart(2, '0');
    const g = (255 - parseInt(hex.slice(3, 5), 16)).toString(16).padStart(2, '0');
    const b = (255 - parseInt(hex.slice(5, 7), 16)).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function jsonPrettify(jsonStr) {
    if (!jsonStr || jsonStr.trim() === "null") return {};
    try {
        return JSON.parse(jsonStr.replace(/\bNaN\b/g, "null"));
    } catch {
        return jsonStr;
    }
}

function showLoading() { $(".loadingSpinner").show(); }
function hideLoading() { $(".loadingSpinner").hide(); }
