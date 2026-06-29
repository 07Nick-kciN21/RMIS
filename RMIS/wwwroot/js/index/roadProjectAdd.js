import BoxManager from './box.js';
import { showLoading, hideLoading } from '../loading.js';

/**
 * 道路專案新增模組
 * 功能：新增道路專案資料
 */
const RoadProjectAdd = {

    // 拓寬範圍資料（頭 + 中間 + 尾 的合併結果）
    rangeList: [],

    // 街景照片資料
    photoList: [],

    // 彈出視窗參考
    mapWindow: null,

    // 起點/終點座標（來自路名搜尋選擇）
    startCoord: null,
    endCoord: null,

    // 地圖視窗來的中間範圍點
    middleRangePoints: [],

    // 路名搜尋延遲計時器
    searchTimer: null,

    // 路名搜尋結果緩存（按 start / end 分別儲存）
    searchResults: { start: [], end: [] },

    // 座標預覽地圖相關
    previewMap: null,
    previewRangeLayer: null,
    previewPhotoLayer: null,

    // 點圖新增範圍點模式開關
    addingRangePoint: false,

    // 點圖新增街景照片模式開關
    addingPhotoPoint: false,

    /**
     * 初始化新增模組
     */
    init: function() {
        const self = this;

        // 綁定取消按鈕事件
        $(document).on('click', '#btn-cancel-project-add', function() {
            self.closeAdd();
        });

        // 綁定提交按鈕事件
        $(document).on('click', '#btn-submit-project-add', function() {
            self.submitForm();
        });

        // 綁定經費自動計算
        $(document).on('input', '#add-construction-budget, #add-land-budget, #add-compensation-budget', function() {
            self.calculateTotalBudget();
        });

        // 綁定起訖位置自動組合
        $(document).on('blur', '#add-start-point, #add-end-point', function() {
            self.combineLocation();
        });

        // 綁定起點路名搜尋
        $(document).on('input', '#add-start-point', function() {
            self.startCoord = null;
            self.syncRangeTable();
            self.scheduleSearch('start', $(this).val().trim());
        });

        // 綁定終點路名搜尋
        $(document).on('input', '#add-end-point', function() {
            self.endCoord = null;
            self.syncRangeTable();
            self.scheduleSearch('end', $(this).val().trim());
        });

        // 點擊搜尋結果項目
        $(document).on('click', '.autocomplete-item', function() {
            const type = $(this).data('type');
            const idx = parseInt($(this).data('index'));
            self.selectLocation(type, idx);
        });

        // 點擊外部關閉下拉列表
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.autocomplete-wrapper').length) {
                $('.autocomplete-dropdown').addClass('hidden');
            }
        });

        // Escape 鍵關閉下拉列表
        $(document).on('keydown', '#add-start-point, #add-end-point', function(e) {
            if (e.key === 'Escape') {
                $('.autocomplete-dropdown').addClass('hidden');
            }
        });

        // 綁定拓寬範圍按鈕
        $(document).on('click', '#btn-add-expansion-range', function() {
            self.openExpansionRangeMap();
        });

        // 綁定新增街景照片按鈕 (直接新增一筆)
        $(document).on('click', '#btn-add-street-photo', function() {
            self.addPhotoItem();
        });

        // 綁定從地圖選取街景照片按鈕
        $(document).on('click', '#btn-add-street-photo-map', function() {
            self.openStreetPhotoMap();
        });

        // 綁定刪除照片按鈕
        $(document).on('click', '.btn-remove-photo', function() {
            const index = $(this).data('index');
            self.removePhotoItem(index);
        });

        // 綁定照片檔案選擇事件
        $(document).on('change', '.photo-file-input', function() {
            const index = $(this).data('index');
            self.handlePhotoFileChange(index, this);
        });

        // 綁定照片座標手動輸入（實時更新預覽地圖）
        $(document).on('input', '.photo-lat-input, .photo-lng-input', function() {
            self.updatePreviewMap();
        });

        // 綁定拓寬範圍表格裡緯/經度輸入（實時同步資料 + 地圖，不重新渲染表格以保持焦點）
        $(document).on('input', '.range-lat-input, .range-lng-input', function() {
            self.onRangeInputChange(this);
        });

        // 綁定範圍點刪除按鈕（起點、終點、中間點）
        $(document).on('click', '.btn-delete-range-point', function() {
            const pointType = $(this).data('point-type');
            if (pointType === 'start') {
                self.deleteStartPoint();
            } else if (pointType === 'end') {
                self.deleteEndPoint();
            } else if (pointType === 'middle') {
                self.deleteMiddlePoint(parseInt($(this).data('middle-index')));
            }
        });

        // 綁定點圖新增範圍點切換按鈕
        $(document).on('click', '#btn-toggle-add-range-point', function() {
            self.toggleAddRangePoint();
        });

        // 綁定點圖新增街景照片切換按鈕
        $(document).on('click', '#btn-toggle-add-photo-point', function() {
            self.toggleAddPhotoPoint();
        });

        // 監聽來自彈出視窗的訊息
        window.addEventListener('message', function(event) {
            if (event.origin !== window.location.origin) return;
            self.handleMapMessage(event);
        });

        console.log('RoadProjectAdd 模組初始化完成');
    },

    /**
     * 開啟新增頁面
     */
    openAdd: function() {
        const self = this;

        // 重置表單
        self.resetForm();

        // 產生專案編號
        self.generateProjectId();

        // 開啟頁面
        BoxManager.openRightBoxPage('page-project-add', '新增專案');

        // 確保容器已顯示後初始化/刷新預覽地圖
        setTimeout(function() { self.initPreviewMap(); }, 100);
    },

    /**
     * 重置表單
     */
    resetForm: function() {
        const $form = $('#project-add-form');
        if ($form.length > 0) {
            $form[0].reset();
        }

        // 重置經費欄位
        $('#add-construction-budget').val(0);
        $('#add-land-budget').val(0);
        $('#add-compensation-budget').val(0);
        $('#add-total-budget').val(0);

        // 重置拓寬範圍資料
        this.startCoord = null;
        this.endCoord = null;
        this.middleRangePoints = [];
        this.rangeList = [];
        this.searchResults = { start: [], end: [] };
        this.addingRangePoint = false;
        this.addingPhotoPoint = false;
        $('#btn-toggle-add-range-point').removeClass('active');
        $('#btn-toggle-add-photo-point').removeClass('active');
        $('#add-preview-map').removeClass('adding-point');
        $('.autocomplete-dropdown').addClass('hidden').empty();
        $('#add-expansion-range-tbody').html('<tr class="empty-row"><td colspan="4">尚無資料，請輸入起訖路名、點圖新增或點「編輯範圍」</td></tr>');

        // 重置街景照片資料
        this.photoList = [];
        $('#street-photo-list').html('<div class="empty-photo-hint">尚無照片，請點擊「新增一筆」或「從地圖選取」</div>');

        // 清除預覽地圖上的圖層
        this.updatePreviewMap();
    },

    /**
     * 產生專案編號
     */
    generateProjectId: function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const projectId = `RP${year}${month}${day}${random}`;
        $('#add-project-id').val(projectId);
    },

    /**
     * 自動組合起訖位置
     */
    combineLocation: function() {
        const startPoint = $('#add-start-point').val().trim();
        const endPoint = $('#add-end-point').val().trim();
        const $location = $('#add-location');
        const $projectName = $('#add-project-name');
        // 如果使用者已手動輸入，不覆蓋
        if ($location.val().trim() !== '' && !$location.data('auto-combined')) {
            return;
        }

        if (startPoint && endPoint) {
            $location.val(`${startPoint}至${endPoint}`);
            $location.data('auto-combined', true);
            $projectName.val(`${startPoint}至${endPoint}`);
        } else if (startPoint) {
            $location.val(startPoint);
            $location.data('auto-combined', true);
        } else if (endPoint) {
            $location.val(endPoint);
            $location.data('auto-combined', true);
        }
    },

    /**
     * 排程路名搜尋（延遲 300ms 防止連續輸入時大量請求）
     */
    scheduleSearch: function(type, query) {
        clearTimeout(this.searchTimer);
        const dropdownId = type === 'start' ? 'add-start-point-dropdown' : 'add-end-point-dropdown';

        if (query.length < 2) {
            $(`#${dropdownId}`).addClass('hidden').empty();
            return;
        }

        const self = this;
        this.searchTimer = setTimeout(function() {
            self.searchNominatim(type, query, dropdownId);
        }, 300);
    },

    /**
     * 呼叫 Nominatim API 搜尋路名
     * 若已選擇行政區則自動前綴以縮小範圍
     */
    searchNominatim: function(type, query, dropdownId) {
        const self = this;
        const district = $('#add-district').val();
        const q = district ? `${district}${query}` : query;
        console.log('Nominatim 搜尋:', q);
        const params = new URLSearchParams({ q, ...(district && { district }) });
        fetch(`/api/MapAPI/SearchAddress?${params}`)
            .then(response => response.json())
            .then(results => {
                self.searchResults[type] = results;
                const $dropdown = $(`#${dropdownId}`);
                $dropdown.empty();

                if (results.length === 0) {
                    $dropdown.addClass('hidden');
                    return;
                }

                results.forEach((item, idx) => {
                    $dropdown.append(
                        `<div class="autocomplete-item" data-type="${type}" data-index="${idx}">
                            ${item.content}
                        </div>`
                    );
                });
                $dropdown.removeClass('hidden');
            })
            .catch(err => {
                console.error('地址搜尋失敗:', err);
            });
    },

    /**
     * 選擇路名搜尋結果：填入欄位並將座標加入拓寬範圍的頭/尾
     */
    selectLocation: function(type, index) {
        const item = this.searchResults[type][index];
        if (!item) return;

        // content 範例：桃園市中壢區中壢里７鄰中豐路３９８號
        const shortName = item.content;
        const [lng, lat] = item.location.split(',').map(Number);
        const coord = { lat, lng };

        if (type === 'start') {
            $('#add-start-point-dropdown').addClass('hidden');
            this.startCoord = coord;
        } else {
            $('#add-end-point-dropdown').addClass('hidden');
            this.endCoord = coord;
        }
        this.syncRangeTable();
        this.combineLocation();
    },

    /**
     * 從三個來源組合 rangeList（資料層，不觸及 DOM）
     */
    rebuildRangeList: function() {
        const combined = [];
        if (this.startCoord) combined.push(this.startCoord);
        this.middleRangePoints.forEach(p => combined.push(p));
        if (this.endCoord) combined.push(this.endCoord);

        this.rangeList = combined.map((item, index) => ({
            Id: index,
            Latitude: item.lat,
            Longitude: item.lng
        }));
    },

    /**
     * 渲染拓寬範圍表格（含可編輯緯經度輸入、中間點刪除鈕）
     */
    renderRangeTable: function() {
        const $tbody = $('#add-expansion-range-tbody');
        $tbody.empty();

        if (this.rangeList.length === 0) {
            $tbody.html('<tr class="empty-row"><td colspan="4">尚無資料，請輸入起訖路名、點圖新增或點「編輯範圍」</td></tr>');
            return;
        }

        let middleIdx = 0;
        this.rangeList.forEach((item, index) => {
            const isStart  = (index === 0 && this.startCoord);
            const isEnd    = (index === this.rangeList.length - 1 && this.endCoord);
            const isMiddle = !isStart && !isEnd;

            const currentMiddleIdx = isMiddle ? middleIdx : -1;
            if (isMiddle) middleIdx++;

            let label = '';
            if (isStart) label = ' (起點)';
            else if (isEnd) label = ' (終點)';

            // 所有點都可刪除，透過不同的 data 屬性區分類型
            let deleteBtn = '';
            if (isStart) {
                deleteBtn = `<button type="button" class="btn-delete-range-point" data-point-type="start"><i class="fa fa-trash"></i> 刪除</button>`;
            } else if (isEnd) {
                deleteBtn = `<button type="button" class="btn-delete-range-point" data-point-type="end"><i class="fa fa-trash"></i> 刪除</button>`;
            } else {
                deleteBtn = `<button type="button" class="btn-delete-range-point" data-point-type="middle" data-middle-index="${currentMiddleIdx}"><i class="fa fa-trash"></i> 刪除</button>`;
            }

            $tbody.append(`
                <tr>
                    <td>${index + 1}${label}</td>
                    <td><input type="text" class="form-control range-lat-input" data-row-index="${index}" value="${Number(item.Latitude).toFixed(6)}"></td>
                    <td><input type="text" class="form-control range-lng-input" data-row-index="${index}" value="${Number(item.Longitude).toFixed(6)}"></td>
                    <td>${deleteBtn}</td>
                </tr>
            `);
        });
    },

    /**
     * 同步拓寬範圍：組合資料 → 渲染表格 → 更新地圖
     */
    syncRangeTable: function() {
        this.rebuildRangeList();
        this.renderRangeTable();
        this.updatePreviewMap();
    },

    /**
     * 表格緯/經度輸入變動時呼叫（僅同步資料 + 更新地圖，不重新渲染表格以保持焦點）
     */
    onRangeInputChange: function(inputEl) {
        const $input = $(inputEl);
        const rowIndex = parseInt($input.data('row-index'));
        const isLat    = $input.hasClass('range-lat-input');
        const value    = parseFloat($input.val());
        if (isNaN(value)) return;

        const isStart = (rowIndex === 0 && this.startCoord);
        const isEnd   = (rowIndex === this.rangeList.length - 1 && this.endCoord);

        if (isStart) {
            if (isLat) this.startCoord.lat = value; else this.startCoord.lng = value;
        } else if (isEnd) {
            if (isLat) this.endCoord.lat = value; else this.endCoord.lng = value;
        } else {
            const middleIdx = rowIndex - (this.startCoord ? 1 : 0);
            if (this.middleRangePoints[middleIdx]) {
                if (isLat) this.middleRangePoints[middleIdx].lat = value;
                else       this.middleRangePoints[middleIdx].lng = value;
            }
        }

        this.rebuildRangeList();
        this.updatePreviewMap();
    },

    /**
     * 刪除起點
     */
    deleteStartPoint: function() {
        // 如果有中間點，將第一個中間點升級為新起點
        if (this.middleRangePoints.length > 0) {
            this.startCoord = this.middleRangePoints.shift();
        } else if (this.endCoord) {
            // 沒有中間點但有終點，將終點變成起點
            this.startCoord = this.endCoord;
            this.endCoord = null;
        } else {
            // 只剩起點，直接清空
            this.startCoord = null;
        }
        this.syncRangeTable();
    },

    /**
     * 刪除終點
     */
    deleteEndPoint: function() {
        // 如果有中間點，將最後一個中間點升級為新終點
        if (this.middleRangePoints.length > 0) {
            this.endCoord = this.middleRangePoints.pop();
        } else {
            // 沒有中間點，直接清空終點
            this.endCoord = null;
        }
        this.syncRangeTable();
    },

    /**
     * 刪除指定中間範圍點（middleRangePoints 裡的索引）
     */
    deleteMiddlePoint: function(middleIndex) {
        this.middleRangePoints.splice(middleIndex, 1);
        this.syncRangeTable();
    },

    /**
     * 切換「點圖新增範圍點」模式（與照片點模式互斥）
     */
    toggleAddRangePoint: function() {
        this.addingRangePoint = !this.addingRangePoint;
        if (this.addingRangePoint) {
            this.addingPhotoPoint = false;
            $('#btn-toggle-add-photo-point').removeClass('active');
            $('#btn-toggle-add-range-point').addClass('active');
            this.scrollToPreviewMap();
        } else {
            $('#btn-toggle-add-range-point').removeClass('active');
        }
        $('#add-preview-map').toggleClass('adding-point', this.addingRangePoint || this.addingPhotoPoint);
    },

    /**
     * 切換「點圖新增街景照片」模式（與範圍點模式互斥）
     */
    toggleAddPhotoPoint: function() {
        this.addingPhotoPoint = !this.addingPhotoPoint;
        if (this.addingPhotoPoint) {
            this.addingRangePoint = false;
            $('#btn-toggle-add-range-point').removeClass('active');
            $('#btn-toggle-add-photo-point').addClass('active');
            this.scrollToPreviewMap();
        } else {
            $('#btn-toggle-add-photo-point').removeClass('active');
        }
        $('#add-preview-map').toggleClass('adding-point', this.addingRangePoint || this.addingPhotoPoint);
    },

    /**
     * 捲動至指定元素所在的 .add-section
     */
    scrollToSection: function(selector) {
        const $container = $('.add-content-area');
        const $target = $(selector).closest('.add-section');
        if (!$container.length || !$target.length) return;
        const offset = $target.offset().top - $container.offset().top + $container.scrollTop();
        $container.animate({ scrollTop: offset }, 300);
    },

    scrollToPreviewMap: function() {
        this.scrollToSection('#add-preview-map');
    },

    /**
     * 初始化座標預覽地圖（僅在頁面顯示後呼叫一次；
     * 後續再次開啟頁面時僅 invalidateSize）
     */
    initPreviewMap: function() {
        if (this.previewMap) {
            this.previewMap.invalidateSize();
            return;
        }
        this.previewMap = L.map('add-preview-map', {
            zoomControl: true,
            doubleClickZoom: false
        }).setView([24.993, 121.301], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.previewMap);

        this.previewRangeLayer = L.layerGroup().addTo(this.previewMap);
        this.previewPhotoLayer = L.layerGroup().addTo(this.previewMap);

        // 點圖新增模式：點擊地圖時插入範圍點或街景照片並關閉模式，完成後捲回來源區塊
        const self = this;
        this.previewMap.on('click', function(e) {
            if (self.addingRangePoint) {
                self.middleRangePoints.push({ lat: e.latlng.lat, lng: e.latlng.lng });
                self.syncRangeTable();
                self.toggleAddRangePoint();
                self.scrollToSection('#add-expansion-range-table');
            } else if (self.addingPhotoPoint) {
                self.photoList.push({
                    Id: self.photoList.length,
                    Latitude: e.latlng.lat,
                    Longitude: e.latlng.lng,
                    Photo: null,
                    PhotoName: null
                });
                self.renderPhotoList();
                self.toggleAddPhotoPoint();
                self.scrollToSection('#street-photo-list');
            }
        });
    },

    /**
     * 建立可拖曳標記（L.marker + L.divIcon）
     * @param {number[]} latlng    - [lat, lng]
     * @param {string}   iconClass - CSS class 名（對應 .range-marker-* 樣式）
     * @param {string}   popupText - 彈窗文字
     * @param {function} onDrag    - dragend 後的 callback，傳入新的 L.LatLng
     */
    createDraggableMarker: function(latlng, iconClass, popupText, onDrag) {
        const isSmall  = (iconClass === 'range-marker-middle' || iconClass === 'range-marker-photo');
        const size     = isSmall ? [14, 14] : [16, 16];
        const anchor   = isSmall ? [7, 7]   : [8, 8];

        const icon = L.divIcon({
            className: iconClass,
            iconSize: size,
            iconAnchor: anchor,
            popupAnchor: [0, -10]
        });

        const marker = L.marker(latlng, { icon: icon, draggable: true });
        if (popupText) marker.bindPopup(popupText);
        marker.on('dragend', function(e) { onDrag(e.target.getLatLng()); });
        return marker;
    },

    /**
     * 更新座標預覽地圖（所有標記均可拖曳）：
     *   拓寬範圍  → 藍色 polygon（>=3 點）/ polyline（2 點）
     *   起點      → 綠色可拖曳標記
     *   終點      → 紅色可拖曳標記
     *   中間點    → 藍色可拖曳標記
     *   街景照片  → 橙色可拖曳標記（從 DOM 輸入讀取座標；拖曳後直接更新 DOM）
     */
    updatePreviewMap: function() {
        if (!this.previewMap) return;
        const self = this;

        this.previewRangeLayer.clearLayers();
        this.previewPhotoLayer.clearLayers();

        const allCoords = [];

        // ── 拓寬範圍線/面 ──
        if (this.rangeList.length >= 3) {
            const coords = this.rangeList.map(p => [Number(p.Latitude), Number(p.Longitude)]);
            L.polygon(coords, { color: '#3b82f6', weight: 2, fillOpacity: 0.15 }).addTo(this.previewRangeLayer);
            coords.forEach(c => allCoords.push(c));
        } else if (this.rangeList.length === 2) {
            const coords = this.rangeList.map(p => [Number(p.Latitude), Number(p.Longitude)]);
            L.polyline(coords, { color: '#3b82f6', weight: 2 }).addTo(this.previewRangeLayer);
            coords.forEach(c => allCoords.push(c));
        } else if (this.rangeList.length === 1) {
            allCoords.push([Number(this.rangeList[0].Latitude), Number(this.rangeList[0].Longitude)]);
        }

        // ── 起點標記（可拖曳）──
        if (this.startCoord) {
            this.createDraggableMarker(
                [this.startCoord.lat, this.startCoord.lng],
                'range-marker-start', '起點',
                function(ll) { self.startCoord = { lat: ll.lat, lng: ll.lng }; self.syncRangeTable(); }
            ).addTo(this.previewRangeLayer);
        }

        // ── 終點標記（可拖曳）──
        if (this.endCoord) {
            this.createDraggableMarker(
                [this.endCoord.lat, this.endCoord.lng],
                'range-marker-end', '終點',
                function(ll) { self.endCoord = { lat: ll.lat, lng: ll.lng }; self.syncRangeTable(); }
            ).addTo(this.previewRangeLayer);
        }

        // ── 中間範圍點標記（可拖曳）──
        this.middleRangePoints.forEach(function(p, idx) {
            self.createDraggableMarker(
                [p.lat, p.lng],
                'range-marker-middle', `範圍點 ${idx + 1}`,
                function(ll) { self.middleRangePoints[idx] = { lat: ll.lat, lng: ll.lng }; self.syncRangeTable(); }
            ).addTo(self.previewRangeLayer);
        });

        // ── 街景照片標記（可拖曳，從 DOM 輸入讀取座標；拖曳後直接寫回 DOM）──
        this.photoList.forEach(function(item, index) {
            const lat = Number($(`.photo-lat-input[data-index="${index}"]`).val());
            const lng = Number($(`.photo-lng-input[data-index="${index}"]`).val());
            if (lat && lng) {
                self.createDraggableMarker(
                    [lat, lng],
                    'range-marker-photo', `照片 ${index + 1}`,
                    function(ll) {
                        $(`.photo-lat-input[data-index="${index}"]`).val(ll.lat.toFixed(6));
                        $(`.photo-lng-input[data-index="${index}"]`).val(ll.lng.toFixed(6));
                        self.updatePreviewMap();
                    }
                ).addTo(self.previewPhotoLayer);
                allCoords.push([lat, lng]);
            }
        });

        // ── 自動縮放範圍 ──
        if (allCoords.length > 1) {
            this.previewMap.fitBounds(L.latLngBounds(allCoords), { padding: [20, 20] });
        } else if (allCoords.length === 1) {
            this.previewMap.setView(allCoords[0], 16);
        }
    },

    /**
     * 計算合計經費
     */
    calculateTotalBudget: function() {
        const construction = parseInt($('#add-construction-budget').val()) || 0;
        const land = parseInt($('#add-land-budget').val()) || 0;
        const compensation = parseInt($('#add-compensation-budget').val()) || 0;
        const total = construction + land + compensation;
        $('#add-total-budget').val(total);
    },

    /**
     * 開啟拓寬範圍地圖視窗
     */
    openExpansionRangeMap: function() {
        const windowWidth = 800;
        const windowHeight = 600;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const left = (screenWidth - windowWidth) / 2;
        const top = (screenHeight - windowHeight) / 2;

        this.mapWindow = window.open(
            '/Admin/ExpansionRangeMap',
            'expansionRangeWindow',
            `width=${windowWidth},height=${windowHeight},top=${top},left=${left}`
        );
    },

    /**
     * 開啟街景照片地圖視窗
     */
    openStreetPhotoMap: function() {
        const windowWidth = 800;
        const windowHeight = 600;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const left = (screenWidth - windowWidth) / 2;
        const top = (screenHeight - windowHeight) / 2;

        this.mapWindow = window.open(
            '/Admin/StreetViewPhotoMap',
            'streetPhotoWindow',
            `width=${windowWidth},height=${windowHeight},top=${top},left=${left}`
        );
    },

    /**
     * 處理來自地圖視窗的訊息
     */
    handleMapMessage: function(event) {
        try {
            const message = JSON.parse(event.data);
            const data = message.data;

            if (message.type === 'range') {
                this.updateExpansionRangeTable(data);
            } else if (message.type === 'photo') {
                this.updateStreetPhotoFromMap(data);
            }
        } catch (e) {
            console.error('解析地圖訊息失敗:', e);
        }
    },

    /**
     * 更新拓寬範圍中間點（來自地圖視窗）
     * 起點/終點座標不受影響，由 syncRangeTable 重新組合
     */
    updateExpansionRangeTable: function(data) {
        this.middleRangePoints = [];
        if (data && data.length > 0) {
            data.forEach((item) => {
                this.middleRangePoints.push({ lat: item.lat, lng: item.lng });
            });
        }
        this.syncRangeTable();
        console.log('拓寬範圍 (中間點):', this.middleRangePoints);
    },

    /**
     * 更新街景照片列表 (從地圖接收資料)
     */
    updateStreetPhotoFromMap: function(data) {
        if (!data || data.length === 0) return;

        // 將地圖資料加入現有列表
        data.forEach((item) => {
            const photoItem = {
                Id: this.photoList.length,
                Latitude: item.lat,
                Longitude: item.lng,
                Photo: item.photo || null,
                PhotoName: item.photoName || null
            };
            this.photoList.push(photoItem);
        });

        // 重新渲染列表
        this.renderPhotoList();
        console.log('街景照片 (從地圖):', this.photoList);
    },

    /**
     * 新增一筆照片項目
     */
    addPhotoItem: function() {
        const newItem = {
            Id: this.photoList.length,
            Latitude: '',
            Longitude: '',
            Photo: null,
            PhotoName: null
        };
        this.photoList.push(newItem);
        this.renderPhotoList();
    },

    /**
     * 移除照片項目
     */
    removePhotoItem: function(index) {
        this.photoList.splice(index, 1);
        // 重新編號
        this.photoList.forEach((item, i) => {
            item.Id = i;
        });
        this.renderPhotoList();
    },

    /**
     * 處理照片檔案選擇
     */
    handlePhotoFileChange: function(index, input) {
        const file = input.files[0];
        if (!file) return;

        this.photoList[index].Photo = file;
        this.photoList[index].PhotoName = file.name;

        // 更新預覽圖
        const $preview = $(`#photo-preview-${index}`);
        $preview.attr('src', URL.createObjectURL(file)).addClass('has-image');
    },

    /**
     * 渲染照片列表
     */
    renderPhotoList: function() {
        const $list = $('#street-photo-list');
        $list.empty();

        if (this.photoList.length === 0) {
            $list.html('<div class="empty-photo-hint">尚無照片，請點擊「新增一筆」或「從地圖選取」</div>');
            this.updatePreviewMap();
            return;
        }

        this.photoList.forEach((item, index) => {
            const hasPreview = item.Photo ? 'has-image' : '';
            const previewSrc = item.Photo ? URL.createObjectURL(item.Photo) : '';

            $list.append(`
                <div class="photo-item" data-index="${index}">
                    <div class="photo-item-header">
                        <span class="photo-item-index">照片 ${index + 1}</span>
                        <button type="button" class="btn-remove-photo" data-index="${index}">
                            <i class="fa fa-trash"></i> 刪除
                        </button>
                    </div>
                    <div class="photo-item-content">
                        <div class="form-group photo-item-file">
                            <label class="form-label">選擇檔案</label>
                            <input type="file" class="form-control photo-file-input" data-index="${index}" accept="image/*">
                        </div>
                        <img id="photo-preview-${index}" class="photo-preview ${hasPreview}" src="${previewSrc}" alt="預覽">
                        <div class="form-group">
                            <label class="form-label">緯度</label>
                            <input type="text" class="form-control photo-lat-input" data-index="${index}"
                                   value="${item.Latitude}" placeholder="如: 24.956387">
                        </div>
                        <div class="form-group">
                            <label class="form-label">經度</label>
                            <input type="text" class="form-control photo-lng-input" data-index="${index}"
                                   value="${item.Longitude}" placeholder="如: 121.219068">
                        </div>
                    </div>
                </div>
            `);
        });
        this.updatePreviewMap();
    },

    /**
     * 提交表單
     */
    submitForm: function() {
        const self = this;
        const $form = $('#project-add-form');

        // 驗證必填欄位
        if (!$form[0].checkValidity()) {
            $form[0].reportValidity();
            return;
        }

        // 驗證拓寬座標至少要有兩個點
        if (self.rangeList.length < 2) {
            alert('拓寬範圍至少需要 2 個座標點');
            return;
        }

        // 使用 FormData 格式提交 (與 Admin/AddRoadProject 相同格式)
        const formData = new FormData();

        formData.append('Proposer', $('#add-proposer').val());
        formData.append('AdminDistrict', $('#add-district').val());
        formData.append('StartPoint', $('#add-start-point').val());
        formData.append('EndPoint', $('#add-end-point').val());
        formData.append('RoadLength', $('#add-road-length').val() || '0');
        formData.append('CurrentRoadWidth', $('#add-current-width').val() || '0');
        formData.append('CurrentRoadType', '');
        formData.append('PlannedRoadWidth', $('#add-planned-width').val() || '0');
        formData.append('PlannedRoadType', '');
        formData.append('PublicLand', $('#add-public-land').val() || '0');
        formData.append('PrivateLand', $('#add-private-land').val() || '0');
        formData.append('PublicPrivateLand', $('#add-mixed-land').val() || '0');
        formData.append('ConstructionBudget', $('#add-construction-budget').val() || '0');
        formData.append('LandBudget', $('#add-land-budget').val() || '0');
        formData.append('CompensationBudget', $('#add-compensation-budget').val() || '0');
        formData.append('TotalBudget', $('#add-total-budget').val() || '0');
        formData.append('Remark', $('#add-remarks').val() || '');
        formData.append('ReviewYear', $('#add-review-year').val() || '');
        formData.append('CaseType', $('#add-case-type').val() || '');
        formData.append('ProjectName', $('#add-project-name').val() || '');
        formData.append('RCCount', $('#add-rc-count').val() || '');
        formData.append('TinHouseCount', $('#add-tin-house-count').val() || '');
        formData.append('ReviewResult', $('#add-review-result').val() || '');

        // 加入拓寬範圍資料
        self.rangeList.forEach((item, index) => {
            formData.append(`ExpansionRange[${index}].Id`, item.Id);
            formData.append(`ExpansionRange[${index}].Latitude`, item.Latitude);
            formData.append(`ExpansionRange[${index}].Longitude`, item.Longitude);
        });

        // 加入街景照片資料 (從 DOM 讀取最新的座標值)
        self.photoList.forEach((item, index) => {
            // 從輸入欄位讀取最新座標
            const lat = $(`.photo-lat-input[data-index="${index}"]`).val() || item.Latitude;
            const lng = $(`.photo-lng-input[data-index="${index}"]`).val() || item.Longitude;

            formData.append(`StreetViewPhoto[${index}].Id`, index);
            formData.append(`StreetViewPhoto[${index}].Latitude`, lat);
            formData.append(`StreetViewPhoto[${index}].Longitude`, lng);
            if (item.Photo) {
                formData.append(`StreetViewPhoto[${index}].Photo`, item.Photo, item.PhotoName || '');
            }
            formData.append(`StreetViewPhoto[${index}].PhotoName`, item.PhotoName || '');
        });

        console.log('提交專案資料:', ...formData.entries());
        showLoading('新增中...', '#right-box');

        // 呼叫 Admin API
        fetch('/Admin/AddRoadProject', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(result => {
            console.log('新增結果:', result);
            if (result.success) {
                alert('專案新增成功！');
                self.closeAdd();
                $(document).trigger('projectAdded', { projectId: result.projectId });
            } else {
                alert(`新增失敗：${result.message}`);
            }
        })
        .catch(error => {
            console.error('新增專案失敗:', error);
            alert(`新增失敗：${error.message || '請稍後再試'}`);
        })
        .finally(() => {
            hideLoading('#right-box');
        });
    },

    /**
     * 關閉新增頁面
     */
    closeAdd: function() {
        BoxManager.closeBox('right-box');
        $(document).trigger('projectAddClosed');
    }
};

export default RoadProjectAdd;
