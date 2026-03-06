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
const accCmpCluster1 = { group: null };
const accCmpCluster2 = { group: null };

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
    if (clusterRef.group) { mapRef.removeLayer(clusterRef.group); clusterRef.group = null; }
    fetch(`/api/MapAPI/GetAccidentPointsByMonth?year=${year}&month=${month}`)
        .then(res => res.json())
        .then(result => {
            if (!result.success) return;
            const dotIcon = L.divIcon({ html: '<div class="acc-dot"></div>', className: '', iconSize: [8, 8], iconAnchor: [4, 4] });
            clusterRef.group = L.markerClusterGroup({ disableClusteringAtZoom: 18 });
            result.data.forEach(p => {
                const lat = parseFloat(p.lat), lng = parseFloat(p.lng);
                if (!isNaN(lat) && !isNaN(lng))
                    clusterRef.group.addLayer(L.marker([lat, lng], { icon: dotIcon }));
            });
            mapRef.addLayer(clusterRef.group);
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
    if (accCmpMap1) { accCmpMap1.remove(); accCmpMap1 = null; }
    if (accCmpMap2) { accCmpMap2.remove(); accCmpMap2 = null; }
    accCmpCluster1.group = null;
    accCmpCluster2.group = null;
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
            accTimelineCluster = L.markerClusterGroup({ disableClusteringAtZoom: 18 });
            result.data.forEach(p => {
                const lat = parseFloat(p.lat), lng = parseFloat(p.lng);
                if (!isNaN(lat) && !isNaN(lng))
                    accTimelineCluster.addLayer(L.marker([lat, lng], { icon: dotIcon }));
            });
            map.addLayer(accTimelineCluster);
        });
}

function clearAccidentMarkers() {
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
    accClusterGroup = L.markerClusterGroup();
    accidentData.forEach(r => {
        if (!r.latitude || !r.longitude || r.latitude === '' || r.longitude === '') return;
        const lat = parseFloat(r.latitude);
        const lng = parseFloat(r.longitude);
        if (isNaN(lat) || isNaN(lng)) return;
        accClusterGroup.addLayer(L.marker([lat, lng], { icon }));
    });
    $indexMap.addLayer(accClusterGroup);
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