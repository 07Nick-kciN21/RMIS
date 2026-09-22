import { Map } from './map_test.js';

let accidentData = [];
let accCurrentPage = 1;
let accPageSize = 50;
let accClusterGroup = null;
let accLocateMarker = null;
let accTimelineControl = null;
let accTimelineCluster = null;
let accTimelineTimer = null;
let accCmpMap1 = null;
let accCmpMap2 = null;
const accCmpCluster1 = { group: null, viewportDetach: null };
const accCmpCluster2 = { group: null, viewportDetach: null };
let accClusterViewportDetach = null;
let accTimelineViewportDetach = null;

// 「叢集模組」開關：控制查詢結果／熱區時間軸／前後期比對這三處事故點圖層要不要用 markercluster 聚合顯示。
// 預設開啟(對應 #accCluster 預設 checked)：簡易查詢沒有筆數上限，一次可能回傳上千筆事故點，
// 不聚合時會用沒有視窗裁切(removeOutsideVisibleBounds)的 L.layerGroup，全部點位都是常駐 DOM 節點，
// 資料量大時會拖慢渲染，所以預設仍走有效能保護的聚合模式，使用者需要看逐點分佈時才自行關閉。
let accClusterEnabled = true;

function createAccidentLayerGroup(clusterOptions) {
    return accClusterEnabled ? L.markerClusterGroup(clusterOptions) : L.layerGroup();
}

// 跟業務圖資 point 圖層(layers.js 的 viewport 模式)同樣的縮放門檻：
// 城市尺度(zoom<15)看逐點分佈本來就沒有意義，只會白白增加 DOM 節點
const ACC_VIEWPORT_MIN_ZOOM = 15;

// 依可視範圍動態渲染事故點。
// 只有「叢集模組」關閉(看逐點分佈)時才套用這層 zoom+viewport 篩選：
// 開啟叢集時 L.markerClusterGroup 本身在任何縮放層級都能把大量點位聚合成熱區圓圈──
// 這正是「熱區時間軸／前後期比對」想呈現的城市級總覽，若無條件套用 zoom<15 隱藏，
// 反而會讓最需要總覽的縮小畫面看不到任何東西；只有沒有視窗裁切保護的未聚合模式，
// 才是真正需要靠這層篩選來避免大量常駐 DOM 節點的地方。
// points 是已經下載好、快取在記憶體裡的資料，篩選只在前端做，不會重新打 API。
// 回傳值：viewport 模式下回傳一個「解除監聽」函式(換月份/關閉圖層時要呼叫)，聚合模式下回傳 null。
function attachViewportRendering(mapRef, layerGroup, points, buildMarker) {
    if (accClusterEnabled) {
        points.forEach(p => layerGroup.addLayer(buildMarker(p)));
        return null;
    }

    let timer = null;
    const render = () => {
        layerGroup.clearLayers();
        if (mapRef.getZoom() < ACC_VIEWPORT_MIN_ZOOM) return;
        const bounds = mapRef.getBounds();
        points.forEach(p => {
            if (bounds.contains([p.lat, p.lng])) layerGroup.addLayer(buildMarker(p));
        });
    };
    const scheduleRender = () => {
        clearTimeout(timer);
        timer = setTimeout(render, 300);
    };
    mapRef.on('moveend zoomend', scheduleRender);
    render();
    return () => mapRef.off('moveend zoomend', scheduleRender);
}

// ── 前後期比對 ────────────────────────────────────────────────────
function createOsmTile() {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 22,
        attribution: '&copy; OpenStreetMap contributors'
    });
}

function syncMaps(map1, map2) {
    let syncing = false;
    map1.on('move', () => {
        if (syncing) return;
        syncing = true;
        map2.setView(map1.getCenter(), map1.getZoom(), { animate: false });
        syncing = false;
    });
    map2.on('move', () => {
        if (syncing) return;
        syncing = true;
        map1.setView(map2.getCenter(), map2.getZoom(), { animate: false });
        syncing = false;
    });
}

function createCmpMonthControl(mapRef, clusterRef, defaultYear, defaultMonth) {
    const MonthCtrl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd() {
            const div = L.DomUtil.create('div', 'acc-cmp-month-ctrl');

            const yearSel = document.createElement('select');
            yearSel.className = 'acc-cmp-select';
            for (let y = 101; y <= 113; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = `民${y}`;
                if (y === defaultYear) opt.selected = true;
                yearSel.appendChild(opt);
            }

            const sep = document.createElement('span');
            sep.textContent = '/';
            sep.style.margin = '0 3px';

            const monthSel = document.createElement('select');
            monthSel.className = 'acc-cmp-select';
            for (let m = 1; m <= 12; m++) {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = `${String(m).padStart(2, '0')}月`;
                if (m === defaultMonth) opt.selected = true;
                monthSel.appendChild(opt);
            }

            div.appendChild(yearSel);
            div.appendChild(sep);
            div.appendChild(monthSel);

            const load = () => loadCmpCluster(mapRef, clusterRef, parseInt(yearSel.value), parseInt(monthSel.value));
            yearSel.addEventListener('change', load);
            monthSel.addEventListener('change', load);

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        }
    });
    return new MonthCtrl();
}

function loadCmpCluster(mapRef, clusterRef, year, month) {
    if (clusterRef.viewportDetach) { clusterRef.viewportDetach(); clusterRef.viewportDetach = null; }
    if (clusterRef.group) { mapRef.removeLayer(clusterRef.group); clusterRef.group = null; }
    fetch(`/api/MapAPI/GetAccidentPointsByMonth?year=${year}&month=${month}`)
        .then(res => res.json())
        .then(result => {
            if (!result.success) return;
            const dotIcon = L.divIcon({ html: '<div class="acc-dot"></div>', className: '', iconSize: [8, 8], iconAnchor: [4, 4] });
            clusterRef.group = createAccidentLayerGroup({ disableClusteringAtZoom: 18 });
            const points = result.data
                .map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))
                .filter(p => !isNaN(p.lat) && !isNaN(p.lng));
            mapRef.addLayer(clusterRef.group);
            clusterRef.viewportDetach = attachViewportRendering(mapRef, clusterRef.group, points, p => L.marker([p.lat, p.lng], { icon: dotIcon }));
        });
}

function openCmpOverlay() {
    if (document.getElementById('accCmpOverlay')) return;
    const mainMap = Map.getIndexMap();
    const center = mainMap.getCenter();
    const zoom = mainMap.getZoom();

    const overlay = document.createElement('div');
    overlay.id = 'accCmpOverlay';
    overlay.innerHTML = `
        <div id="accCmpMap1" class="acc-cmp-map"></div>
        <div id="accCmpMap2" class="acc-cmp-map"></div>
        <button id="accCmpClose">✕ 關閉比對</button>`;
    document.body.appendChild(overlay);

    accCmpMap1 = L.map('accCmpMap1', { zoomControl: false }).setView(center, zoom);
    accCmpMap2 = L.map('accCmpMap2', { zoomControl: false }).setView(center, zoom);
    createOsmTile().addTo(accCmpMap1);
    createOsmTile().addTo(accCmpMap2);

    syncMaps(accCmpMap1, accCmpMap2);

    createCmpMonthControl(accCmpMap1, accCmpCluster1, 113, 11).addTo(accCmpMap1);
    createCmpMonthControl(accCmpMap2, accCmpCluster2, 113, 12).addTo(accCmpMap2);

    loadCmpCluster(accCmpMap1, accCmpCluster1, 113, 11);
    loadCmpCluster(accCmpMap2, accCmpCluster2, 113, 12);

    document.getElementById('accCmpClose').addEventListener('click', closeCmpOverlay);
}

function closeCmpOverlay() {
    // map.remove() 會自動清掉綁在該 map 上的事件監聽(含 attachViewportRendering 加的 moveend/zoomend)，
    // 這裡只是同步歸零參照，避免留著指向已銷毀地圖的解除函式
    if (accCmpMap1) { accCmpMap1.remove(); accCmpMap1 = null; }
    if (accCmpMap2) { accCmpMap2.remove(); accCmpMap2 = null; }
    accCmpCluster1.group = null;
    accCmpCluster1.viewportDetach = null;
    accCmpCluster2.group = null;
    accCmpCluster2.viewportDetach = null;
    const el = document.getElementById('accCmpOverlay');
    if (el) el.remove();
    $('#accTowCmp').prop('checked', false);
}
// ─────────────────────────────────────────────────────────────────

// ── 圖資清單項目 ──────────────────────────────────────────────────
function addAccident2List(id, name, onToggle, onRemove) {
    $(`#layerBar_${id}`).remove(); // 先清掉舊的（如果有）
    const html = `
        <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
            <div class="layerTitle" style="border-top">
                <div style="display:flex; border-bottom:solid 1px #160386;">
                    <div class="layerName" id="layerName_${id}">${name}</div>
                </div>
            </div>
            <div class="eye eyeOpen" id="eye_${id}"></div>
            <div class="layerRemove" id="layerRemove_${id}"></div>
        </div>`;
    $('#layerBarContainer').append(html);

    let visible = true;
    $(`#eye_${id}`).on('click', function () {
        visible = !visible;
        $(this).toggleClass('eyeOpen', visible).toggleClass('eyeClosed', !visible);
        if (onToggle) onToggle(visible);
    });
    $(`#layerRemove_${id}`).on('click', function () {
        $(`#layerBar_${id}`).remove();
        if (onRemove) onRemove();
    });
}

function removeAccident2List(id) {
    $(`#layerBar_${id}`).remove();
}
// ─────────────────────────────────────────────────────────────────

// 民國年月索引 0 = 101/01，155 = 113/12
const ACC_TIMELINE_MIN = 0;
const ACC_TIMELINE_MAX = (113 - 101) * 12 + 11; // 155

function indexToYearMonth(i) {
    const year = 101 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    return { year, month, label: `民國${year}年${String(month).padStart(2, '0')}月` };
}

function createTimelineControl() {
    const TimelineControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd() {
            const div = L.DomUtil.create('div', 'acc-timeline-control');

            // 目前月份標籤
            const label = L.DomUtil.create('div', 'acc-timeline-label', div);
            label.textContent = indexToYearMonth(ACC_TIMELINE_MAX).label;

            // 捲動容器
            const scroll = L.DomUtil.create('div', 'acc-timeline-scroll', div);
            const inner = L.DomUtil.create('div', 'acc-timeline-inner', scroll);

            // 滑桿
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'acc-timeline-slider';
            slider.min = ACC_TIMELINE_MIN;
            slider.max = ACC_TIMELINE_MAX;
            slider.value = ACC_TIMELINE_MAX;
            inner.appendChild(slider);

            // 年月刻度標籤列
            const tickRow = document.createElement('div');
            tickRow.className = 'acc-timeline-ticks';
            const range = ACC_TIMELINE_MAX - ACC_TIMELINE_MIN;
            for (let i = ACC_TIMELINE_MIN; i <= ACC_TIMELINE_MAX; i += 12) {
                const ym = indexToYearMonth(i);
                const span = document.createElement('span');
                span.className = 'acc-timeline-tick';
                span.textContent = `${ym.year}/${String(ym.month).padStart(2, '0')}`;
                span.style.left = `${(i / range) * 100}%`;
                tickRow.appendChild(span);
            }
            inner.appendChild(tickRow);

            slider.addEventListener('input', function () {
                const ym = indexToYearMonth(parseInt(this.value));
                label.textContent = ym.label;
                $(`#layerName_acc-timeline`).text(`交通事故時間軸 ${ym.year}/${String(ym.month).padStart(2, '0')}`);
                clearTimeout(accTimelineTimer);
                accTimelineTimer = setTimeout(() => loadTimelineCluster(ym.year, ym.month), 300);
            });

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        }
    });
    return new TimelineControl();
}

function loadTimelineCluster(year, month) {
    const map = Map.getIndexMap();
    if (accTimelineViewportDetach) { accTimelineViewportDetach(); accTimelineViewportDetach = null; }
    if (accTimelineCluster) {
        map.removeLayer(accTimelineCluster);
        accTimelineCluster = null;
    }
    fetch(`/api/MapAPI/GetAccidentPointsByMonth?year=${year}&month=${month}`)
        .then(res => res.json())
        .then(result => {
            if (!result.success) return;
            const dotIcon = L.divIcon({
                html: '<div class="acc-dot"></div>',
                className: '',
                iconSize: [8, 8],
                iconAnchor: [4, 4]
            });
            accTimelineCluster = createAccidentLayerGroup({ disableClusteringAtZoom: 18 });
            const points = result.data
                .map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }))
                .filter(p => !isNaN(p.lat) && !isNaN(p.lng));
            map.addLayer(accTimelineCluster);
            accTimelineViewportDetach = attachViewportRendering(map, accTimelineCluster, points, p => L.marker([p.lat, p.lng], { icon: dotIcon }));
        });
}

function clearAccidentMarkers() {
    if (accClusterViewportDetach) { accClusterViewportDetach(); accClusterViewportDetach = null; }
    if (accClusterGroup) {
        Map.getIndexMap().removeLayer(accClusterGroup);
        accClusterGroup = null;
    }
}

function renderAccidentMarkers() {
    clearAccidentMarkers();
    const $indexMap = Map.getIndexMap();
    const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
                   <path d="M12 0C7.6 0 4 3.6 4 8c0 6 8 16 8 16s8-10 8-16c0-4.4-3.6-8-8-8z" fill="#e74c3c"/>
                   <circle cx="12" cy="8" r="3" fill="#fff"/>
               </svg>`,
        className: '',
        iconSize: [24, 32],
        iconAnchor: [12, 32]
    });
    accClusterGroup = createAccidentLayerGroup();
    const points = accidentData
        .filter(r => r.latitude && r.longitude && r.latitude !== '' && r.longitude !== '')
        .map(r => ({ lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) }))
        .filter(p => !isNaN(p.lat) && !isNaN(p.lng));
    $indexMap.addLayer(accClusterGroup);
    accClusterViewportDetach = attachViewportRendering($indexMap, accClusterGroup, points, p => L.marker([p.lat, p.lng], { icon }));
}

// 切換「叢集模組」時，把目前畫面上已經開啟的事故點圖層依新設定重新載入一次，
// 讓開關能立即生效，而不用等使用者重新查詢/切換月份才套用
function refreshAccidentClustering() {
    // 簡易查詢結果
    if (accClusterGroup) {
        renderAccidentMarkers();
    }
    // 熱區時間軸：從目前的滑桿位置讀出年月
    if (accTimelineCluster) {
        const slider = document.querySelector('.acc-timeline-slider');
        if (slider) {
            const ym = indexToYearMonth(parseInt(slider.value));
            loadTimelineCluster(ym.year, ym.month);
        }
    }
    // 前後期比對：分別從兩張比對地圖目前選的年月重新載入
    if (accCmpMap1 && accCmpCluster1.group) {
        const [yearSel, monthSel] = document.querySelectorAll('#accCmpMap1 .acc-cmp-select');
        if (yearSel && monthSel) loadCmpCluster(accCmpMap1, accCmpCluster1, parseInt(yearSel.value), parseInt(monthSel.value));
    }
    if (accCmpMap2 && accCmpCluster2.group) {
        const [yearSel, monthSel] = document.querySelectorAll('#accCmpMap2 .acc-cmp-select');
        if (yearSel && monthSel) loadCmpCluster(accCmpMap2, accCmpCluster2, parseInt(yearSel.value), parseInt(monthSel.value));
    }
}

export function initAccidentPanel() {
    // Tab 切換
    $('input[name="accradio"]').on('change', function () {
        $('input[name="accradio"]').each(function () {
            $(this).next('label').removeClass('select');
        });
        $(this).next('label').addClass('select');
        const selectedLabel = $(this).next('label').text();
        $('#acc1, #acc2, #acc3').css('display', 'none');

        if (selectedLabel === '圖層開關') {
            $('#acc1').css('display', 'block');
        } else if (selectedLabel === '簡易查詢') {
            $('#acc2').css('display', 'block');
        } else if (selectedLabel === '資料匯出') {
            $('#acc3').css('display', 'block');
        }
    });
    // 叢集模組：切換查詢結果／熱區時間軸／前後期比對這三處事故點圖層要不要用 markercluster 聚合顯示，
    // 初始值以 DOM 目前的勾選狀態為準（例如瀏覽器重新整理後保留表單狀態的情況）
    accClusterEnabled = $('#accCluster').is(':checked');
    $('#accCluster').on('change', function () {
        accClusterEnabled = this.checked;
        refreshAccidentClustering();
    });

    // 前後期比對
    $('#accTowCmp').on('change', function () {
        if (this.checked) openCmpOverlay();
        else closeCmpOverlay();
    });

    // 熱區時間軸
    $('#accTimeline').on('change', function () {
        if (this.checked) {
            accTimelineControl = createTimelineControl();
            accTimelineControl.addTo(Map.getIndexMap());
            const init = indexToYearMonth(ACC_TIMELINE_MAX);
            loadTimelineCluster(init.year, init.month);
            addAccident2List(
                'acc-timeline',
                `交通事故時間軸 ${init.year}/${String(init.month).padStart(2, '0')}`,
                (visible) => {
                    if (accTimelineCluster) {
                        visible ? Map.getIndexMap().addLayer(accTimelineCluster)
                                : Map.getIndexMap().removeLayer(accTimelineCluster);
                    }
                },
                () => { $('#accTimeline').prop('checked', false).trigger('change'); }
            );
        } else {
            clearTimeout(accTimelineTimer);
            if (accTimelineViewportDetach) { accTimelineViewportDetach(); accTimelineViewportDetach = null; }
            if (accTimelineCluster) {
                Map.getIndexMap().removeLayer(accTimelineCluster);
                accTimelineCluster = null;
            }
            if (accTimelineControl) {
                accTimelineControl.remove();
                accTimelineControl = null;
            }
            removeAccident2List('acc-timeline');
        }
    });

    // 資料匯出
    const acc3AreaMap = ['桃園區','大溪區','中壢區','楊梅區','蘆竹區','大園區','龜山區','八德區','龍潭區','平鎮區','新屋區','觀音區','復興區'];
    $('#acc3GoResult').on('click', function () {
        const areaIndex = parseInt($('#acc3AdminDict').val());
        const year = $('#acc3Year').val();
        if (areaIndex < 0) { alert('請選擇行政區'); return; }
        const area = acc3AreaMap[areaIndex];
        window.location.href = `/api/MapAPI/ExportAccidentData?year=${year}&area=${encodeURIComponent(area)}`;
    });

    // 簡易查詢 - 進行篩選
    $('#acc2GoResult').on('click', function () {
        const startYear = parseInt($('#accStartYear').val());
        const startMonth = parseInt($('#accStartMonth').val());
        const endYear = parseInt($('#accEndYear').val());
        const endMonth = parseInt($('#accEndMonth').val());
        const area = $('#acc2AdminDict').val();
        const road = $('#accRoad').val().trim();
        console.log('查詢條件:', { startYear, startMonth, endYear, endMonth, area, road });
        // 驗證必填
        if (!area) {
            alert('請選擇行政區');
            return;
        }

        if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
            alert('起始日期不可大於結束日期');
            return;
        }

        const accidentType = $('#accType').val() || null;
        const payload = { startYear, startMonth, endYear, endMonth, area, road: road || null, accidentType };

        // 清除舊圖標
        clearAccidentMarkers();

        // 顯示載入中
        $('#accidentTbody').html('<tr><td colspan="8" style="text-align:center;">資料載入中...</td></tr>');
        $('#accidentResultDiv').show();
        $('#accidentResultCount').show();
        $('#accTotalCount').text('...');

        fetch('/api/MapAPI/GetAccidentData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                accidentData = result.data;
                accCurrentPage = 1;
                $('#accTotalCount').text(result.total);
                renderAccidentMarkers();
                renderAccidentTable();
                if (result.total > 0) {
                    addAccident2List(
                        'acc-query',
                        `事故查詢結果（${result.total} 筆）`,
                        (visible) => {
                            if (accClusterGroup) {
                                visible ? Map.getIndexMap().addLayer(accClusterGroup)
                                        : Map.getIndexMap().removeLayer(accClusterGroup);
                            }
                        },
                        () => {
                            clearAccidentMarkers();
                            if (accLocateMarker) { accLocateMarker.remove(); accLocateMarker = null; }
                        }
                    );
                }
            } else {
                alert(result.message || '查詢失敗');
                $('#accidentTbody').empty();
                $('#accTotalCount').text('0');
            }
        })
        .catch(err => {
            console.error('交通事故查詢錯誤:', err);
            alert('查詢發生錯誤，請稍後再試');
            $('#accidentTbody').html('<tr><td colspan="8" style="text-align:center;color:red;">查詢失敗</td></tr>');
        });
    });
}

function renderAccidentTable() {
    const $tbody = $('#accidentTbody');
    $tbody.empty();

    if (accidentData.length === 0) {
        $tbody.html('<tr><td colspan="8" style="text-align:center;">查無資料</td></tr>');
        $('#accidentPagination').empty();
        return;
    }

    const totalPages = Math.ceil(accidentData.length / accPageSize);
    const start = (accCurrentPage - 1) * accPageSize;
    const pageData = accidentData.slice(start, start + accPageSize);

    const $indexMap = Map.getIndexMap();

    pageData.forEach(r => {
        const hasCoord = r.latitude && r.longitude && r.latitude !== '' && r.longitude !== '';
        const $locateBtn = hasCoord
            ? $('<button class="btn btn-sm" title="定位">定位</button>').on('click', function () {
                const lat = parseFloat(r.latitude);
                const lng = parseFloat(r.longitude);
                if (accLocateMarker) accLocateMarker.remove();
                accLocateMarker = L.marker([lat, lng], {
                    zIndexOffset: 1000,
                    icon: L.divIcon({
                        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
                                   <path d="M12 0C7.6 0 4 3.6 4 8c0 6 8 16 8 16s8-10 8-16c0-4.4-3.6-8-8-8z" fill="#1a73e8"/>
                                   <circle cx="12" cy="8" r="3" fill="#fff"/>
                               </svg>`,
                        className: '',
                        iconSize: [24, 32],
                        iconAnchor: [12, 32]
                    })
                }).addTo($indexMap);
                $indexMap.setView([lat, lng], 18);
              })
            : $('<button class="btn btn-sm" title="無座標資料" disabled>定位</button>');

        const roadFull = [r.road, r.section?.trim() && r.section + '段', r.lane?.trim() && r.lane + '巷', r.alley?.trim() && r.alley + '弄'].filter(Boolean).join('');
        const intersectionFull = [r.intersection_road, r.intersection_section?.trim() && r.intersection_section + '段', r.intersection_lane?.trim() && r.intersection_lane + '巷', r.intersection_alley?.trim() && r.intersection_alley + '弄'].filter(Boolean).join('');
        const dateDisplay = r.date?.length === 8 ? `${r.date.slice(0,4)}/${r.date.slice(4,6)}/${r.date.slice(6,8)}` : r.date;

        const $tr = $('<tr></tr>').append(
            $('<td></td>').append($locateBtn),
            $(`<td>${r.accident_type || ''}</td>`),
            $(`<td>${dateDisplay}</td>`),
            $(`<td>${r.time || ''}</td>`),
            $(`<td>${r.area || ''}</td>`),
            $(`<td>${roadFull}</td>`),
            $(`<td>${intersectionFull}</td>`),
            $(`<td>${r.road_other || ''}</td>`)
        );
        $tbody.append($tr);
    });

    updateAccidentPagination(totalPages);
}

function updateAccidentPagination(totalPages) {
    const $pagination = $('#accidentPagination');
    $pagination.empty();

    if (totalPages <= 1) return;

    const cur = accCurrentPage;
    const pages = new Set();

    // 固定顯示：第1、最後、當前前後2頁
    pages.add(1);
    pages.add(totalPages);
    for (let i = Math.max(1, cur - 2); i <= Math.min(totalPages, cur + 2); i++)
        pages.add(i);

    const sorted = [...pages].sort((a, b) => a - b);

    const makeBtn = (page) => $('<a></a>')
        .text(page)
        .css({
            cursor: 'pointer',
            padding: '3px 8px',
            margin: '0 2px',
            border: '1px solid',
            display: 'inline-block',
            fontSize: '12px',
            backgroundColor: page === cur ? '#007bff' : '#fff',
            color: page === cur ? '#fff' : '#333',
            borderColor: page === cur ? '#007bff' : '#ddd'
        })
        .on('click', function () {
            accCurrentPage = page;
            renderAccidentTable();
        });

    const makeEllipsis = () => $('<span>...</span>').css({ padding: '3px 4px', fontSize: '12px', color: '#999' });

    sorted.forEach((page, idx) => {
        if (idx > 0 && page - sorted[idx - 1] > 1)
            $pagination.append(makeEllipsis());
        $pagination.append(makeBtn(page));
    });
}