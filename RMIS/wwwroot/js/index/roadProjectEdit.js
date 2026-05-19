import BoxManager from './box.js';
import RoadProjectView from './roadProjectView.js';
import { showLoading, hideLoading } from '../loading.js';

/**
 * 道路專案編輯模組
 * 功能：填入表單、POST 更新（含拓寬範圍 + 街景照片 + 座標預覽）、返回 View
 */
const RoadProjectEdit = {

    // 進入編輯時的原始專案物件
    currentProject: null,

    // ── 拓寬範圍 ──
    rangeList: [],
    startCoord: null,
    endCoord: null,
    middleRangePoints: [],

    // ── 街景照片 ──
    // 每筆：{ Id, Latitude, Longitude, Photo (base64|null), PhotoName, existingUrl }
    photoList: [],

    // ── 座標預覽地圖 ──
    previewMap: null,
    previewRangeLayer: null,
    previewPhotoLayer: null,

    // ── 點圖模式開關 ──
    addingRangePoint: false,
    addingPhotoPoint: false,

    /**
     * 初始化編輯模組
     */
    init: function() {
        const self = this;

        // 綁定取消按鈕
        $(document).on('click', '#btn-cancel-project-edit', function() {
            self.closeEdit();
        });

        // 綁定儲存按鈕
        $(document).on('click', '#btn-submit-project-edit', function() {
            if (!confirm('確定要更新此專案嗎？')) return;
            self.submitForm();
        });

        // 綁定經費自動計算
        $(document).on('input', '#edit-construction-budget, #edit-land-budget, #edit-compensation-budget', function() {
            self.calculateTotalBudget();
        });

        // 綁定起訖位置自動組合
        $(document).on('blur', '#edit-start-point, #edit-end-point', function() {
            self.combineLocation();
        });

        // 綁定拓寬範圍表格緯經度輸入（保持焦點）
        $(document).on('input', '.edit-range-lat-input, .edit-range-lng-input', function() {
            self.onRangeInputChange(this);
        });

        // 綁定範圍點刪除按鈕（起點、終點、中間點）
        $(document).on('click', '.edit-btn-delete-range-point', function() {
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
        $(document).on('click', '#btn-edit-toggle-add-range-point', function() {
            self.toggleAddRangePoint();
        });

        // 綁定新增街景照片按鈕
        $(document).on('click', '#btn-edit-add-street-photo', function() {
            self.addPhotoItem();
        });

        // 綁定點圖新增街景照片切換按鈕
        $(document).on('click', '#btn-edit-toggle-add-photo-point', function() {
            self.toggleAddPhotoPoint();
        });

        // 綁定刪除照片按鈕
        $(document).on('click', '.edit-btn-remove-photo', function() {
            self.removePhotoItem(parseInt($(this).data('index')));
        });

        // 綁定照片檔案選擇
        $(document).on('change', '.edit-photo-file-input', function() {
            self.handlePhotoFileChange(parseInt($(this).data('index')), this);
        });

        // 綁定照片座標手動輸入（實時更新地圖）
        $(document).on('input', '.edit-photo-lat-input, .edit-photo-lng-input', function() {
            self.updatePreviewMap();
        });

        console.log('RoadProjectEdit 模組初始化完成');
    },

    /**
     * 開啟編輯頁面並填入資料
     */
    openEdit: function(project) {
        if (!project) return;
        this.currentProject = project;
        this.fillForm(project);
        this.resetMapState();
        BoxManager.openRightBoxPage('page-project-edit', '編輯專案');

        // 顯示/隱藏座標未確認警示
        if (project.coordinateChecked === false) {
            $('#edit-coord-warning').removeClass('hidden');
        } else {
            $('#edit-coord-warning').addClass('hidden');
        }

        const self = this;
        setTimeout(function() {
            self.initPreviewMap();
            self.loadPoints(project.id);
        }, 100);
    },

    /**
     * 重置地圖相關狀態與 DOM
     */
    resetMapState: function() {
        this.startCoord = null;
        this.endCoord = null;
        this.middleRangePoints = [];
        this.rangeList = [];
        this.photoList = [];
        this.addingRangePoint = false;
        this.addingPhotoPoint = false;
        $('#btn-edit-toggle-add-range-point').removeClass('active');
        $('#btn-edit-toggle-add-photo-point').removeClass('active');
        $('#edit-preview-map').removeClass('adding-point');
        $('#edit-expansion-range-tbody').html('<tr class="empty-row"><td colspan="4">尚無資料，請點圖新增範圍點</td></tr>');
        $('#edit-street-photo-list').html('<div class="empty-photo-hint">尚無照片，請點擊「新增一筆」或「點預覽圖選取」</div>');
        if (this.previewMap) {
            if (this.previewRangeLayer) this.previewRangeLayer.clearLayers();
            if (this.previewPhotoLayer) this.previewPhotoLayer.clearLayers();
        }
    },

    /**
     * 從 API 載入現有座標點並渲染
     */
    loadPoints: async function(projectId) {
        try {
            const response = await fetch(`/api/RoadProject/getPoints/${projectId}`);
            if (!response.ok) return;
            const data = await response.json();

            // 解析範圍點：第一個 = startCoord，最後一個 = endCoord，中間 = middleRangePoints
            // 注意：API 使用 camelCase 序列化，所以屬性名是 latitude/longitude（小駝峰）
            if (data.rangePoints && data.rangePoints.length > 0) {
                if (data.rangePoints.length >= 2) {
                    this.startCoord = { lat: data.rangePoints[0].latitude, lng: data.rangePoints[0].longitude };
                    this.endCoord = {
                        lat: data.rangePoints[data.rangePoints.length - 1].latitude,
                        lng: data.rangePoints[data.rangePoints.length - 1].longitude
                    };
                    this.middleRangePoints = data.rangePoints.slice(1, -1).map(function(p) {
                        return { lat: p.latitude, lng: p.longitude };
                    });
                } else {
                    // 只有一個點視為起點
                    this.startCoord = { lat: data.rangePoints[0].latitude, lng: data.rangePoints[0].longitude };
                }
            }
            this.syncRangeTable();

            // 解析照片點：Property 為 JSON {"url":"projectId/photoName"}
            if (data.photoPoints && data.photoPoints.length > 0) {
                this.photoList = data.photoPoints.map(function(p, i) {
                    var photoName = '';
                    var existingUrl = '';
                    try {
                        var parsed = JSON.parse(p.url || '{}');
                        existingUrl = parsed.url || '';
                        photoName = existingUrl.split('/').pop();
                    } catch(e) {
                        existingUrl = p.url || '';
                        photoName = existingUrl.split('/').pop();
                    }
                    return {
                        Id: i,
                        Latitude: p.latitude,
                        Longitude: p.longitude,
                        Photo: null,
                        PhotoName: photoName,
                        existingUrl: existingUrl
                    };
                });
                this.renderPhotoList();
            }
        } catch(err) {
            console.error('載入座標點失敗:', err);
        }
    },

    /**
     * 將 project 各欄位填入表單（經費 ÷ 10000 轉為萬單位）
     */
    fillForm: function(project) {
        $('#edit-project-id').val(project.projectId || '');
        $('#edit-proposer').val(project.proposer || '');
        $('#edit-district').val(project.administrativeDistrict || '');

        $('#edit-start-point').val(project.startPoint || '');
        $('#edit-end-point').val(project.endPoint || '');
        $('#edit-location').val(project.startEndLocation || '');
        $('#edit-location').data('auto-combined', false);
        $('#edit-road-length').val(project.roadLength || '');

        $('#edit-current-width').val(project.currentRoadWidth || '');
        $('#edit-planned-width').val(project.plannedRoadWidth || '');

        $('#edit-public-land').val(project.publicLand || '0');
        $('#edit-private-land').val(project.privateLand || '0');
        $('#edit-mixed-land').val(project.publicPrivateLand || '0');

        $('#edit-construction-budget').val(Math.round((project.constructionBudget || 0) / 10000));
        $('#edit-land-budget').val(Math.round((project.landAcquisitionBudget || 0) / 10000));
        $('#edit-compensation-budget').val(Math.round((project.compensationBudget || 0) / 10000));
        $('#edit-total-budget').val(Math.round((project.totalBudget || 0) / 10000));

        $('#edit-rc-count').val(project.rcCount || project.RCCount || '');
        $('#edit-tin-house-count').val(project.tinHouseCount || project.TinHouseCount || '');

        $('#edit-review-year').val(project.reviewYear || '');
        $('#edit-case-type').val(project.caseType || '');
        $('#edit-review-result').val(project.reviewResult || '');
        $('#edit-remarks').val(project.remarks || '');
    },

    /**
     * 計算合計經費（萬單位）
     */
    calculateTotalBudget: function() {
        const construction = Number($('#edit-construction-budget').val()) || 0;
        const land = Number($('#edit-land-budget').val()) || 0;
        const compensation = Number($('#edit-compensation-budget').val()) || 0;
        $('#edit-total-budget').val(construction + land + compensation);
    },

    /**
     * 起訖位置自動組合
     */
    combineLocation: function() {
        const startPoint = $('#edit-start-point').val().trim();
        const endPoint = $('#edit-end-point').val().trim();
        const $location = $('#edit-location');

        if ($location.val().trim() !== '' && !$location.data('auto-combined')) {
            return;
        }

        if (startPoint && endPoint) {
            $location.val(`${startPoint}至${endPoint}`);
            $location.data('auto-combined', true);
        } else if (startPoint) {
            $location.val(startPoint);
            $location.data('auto-combined', true);
        } else if (endPoint) {
            $location.val(endPoint);
            $location.data('auto-combined', true);
        }
    },

    // ──── 拓寬範圍 ────

    /**
     * 從三個來源組合 rangeList（資料層，不觸及 DOM）
     */
    rebuildRangeList: function() {
        const combined = [];
        if (this.startCoord) combined.push(this.startCoord);
        this.middleRangePoints.forEach(function(p) { combined.push(p); });
        if (this.endCoord) combined.push(this.endCoord);

        this.rangeList = combined.map(function(item, index) {
            return { Id: index, Latitude: item.lat, Longitude: item.lng };
        });
    },

    /**
     * 渲染拓寬範圍表格（含可編輯緯經度輸入、所有點均可刪除）
     */
    renderRangeTable: function() {
        const $tbody = $('#edit-expansion-range-tbody');
        $tbody.empty();

        if (this.rangeList.length === 0) {
            $tbody.html('<tr class="empty-row"><td colspan="4">尚無資料，請點圖新增範圍點</td></tr>');
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
                deleteBtn = `<button type="button" class="edit-btn-delete-range-point" data-point-type="start"><i class="fa fa-trash">刪除</i></button>`;
            } else if (isEnd) {
                deleteBtn = `<button type="button" class="edit-btn-delete-range-point" data-point-type="end"><i class="fa fa-trash">刪除</i></button>`;
            } else {
                deleteBtn = `<button type="button" class="edit-btn-delete-range-point" data-point-type="middle" data-middle-index="${currentMiddleIdx}"><i class="fa fa-trash">刪除</i></button>`;
            }

            $tbody.append(`
                <tr>
                    <td>${index + 1}${label}</td>
                    <td><input type="text" class="form-control edit-range-lat-input" data-row-index="${index}" value="${Number(item.Latitude).toFixed(6)}"></td>
                    <td><input type="text" class="form-control edit-range-lng-input" data-row-index="${index}" value="${Number(item.Longitude).toFixed(6)}"></td>
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
        const isLat    = $input.hasClass('edit-range-lat-input');
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
     * 刪除指定中間範圍點
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
            $('#btn-edit-toggle-add-photo-point').removeClass('active');
            $('#btn-edit-toggle-add-range-point').addClass('active');
            this.scrollToPreviewMap();
        } else {
            $('#btn-edit-toggle-add-range-point').removeClass('active');
        }
        $('#edit-preview-map').toggleClass('adding-point', this.addingRangePoint || this.addingPhotoPoint);
    },

    /**
     * 切換「點圖新增街景照片」模式（與範圍點模式互斥）
     */
    toggleAddPhotoPoint: function() {
        this.addingPhotoPoint = !this.addingPhotoPoint;
        if (this.addingPhotoPoint) {
            this.addingRangePoint = false;
            $('#btn-edit-toggle-add-range-point').removeClass('active');
            $('#btn-edit-toggle-add-photo-point').addClass('active');
            this.scrollToPreviewMap();
        } else {
            $('#btn-edit-toggle-add-photo-point').removeClass('active');
        }
        $('#edit-preview-map').toggleClass('adding-point', this.addingRangePoint || this.addingPhotoPoint);
    },

    scrollToSection: function(selector) {
        const $container = $('.edit-content-area');
        const $target = $(selector).closest('.edit-section');
        if (!$container.length || !$target.length) return;
        const offset = $target.offset().top - $container.offset().top + $container.scrollTop();
        $container.animate({ scrollTop: offset }, 300);
    },

    scrollToPreviewMap: function() {
        this.scrollToSection('#edit-preview-map');
    },

    // ──── 座標預覽地圖 ────

    /**
     * 初始化座標預覽地圖（僅第一次；後續僅 invalidateSize）
     */
    initPreviewMap: function() {
        if (this.previewMap) {
            this.previewMap.invalidateSize();
            return;
        }

        this.previewMap = L.map('edit-preview-map', {
            zoomControl: true,
            doubleClickZoom: false
        }).setView([24.993, 121.301], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.previewMap);

        this.previewRangeLayer = L.layerGroup().addTo(this.previewMap);
        this.previewPhotoLayer = L.layerGroup().addTo(this.previewMap);

        // 點圖新增模式：點擊地圖插入範圍點或街景照片並退出模式
        const self = this;
        this.previewMap.on('click', function(e) {
            if (self.addingRangePoint) {
                self.middleRangePoints.push({ lat: e.latlng.lat, lng: e.latlng.lng });
                self.syncRangeTable();
                self.toggleAddRangePoint();
                self.scrollToSection('#edit-expansion-range-table');
            } else if (self.addingPhotoPoint) {
                self.photoList.push({
                    Id: self.photoList.length,
                    Latitude: e.latlng.lat,
                    Longitude: e.latlng.lng,
                    Photo: null,
                    PhotoName: null,
                    existingUrl: ''
                });
                self.renderPhotoList();
                self.toggleAddPhotoPoint();
                self.scrollToSection('#edit-street-photo-list');
            }
        });
    },

    /**
     * 建立可拖曳標記（L.marker + L.divIcon）
     */
    createDraggableMarker: function(latlng, iconClass, popupContent, onDrag) {
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
        if (popupContent) {
            const isPhoto = (iconClass === 'range-marker-photo');
            marker.bindPopup(popupContent, isPhoto
                ? { maxWidth: 450, className: 'edit-marker-popup' }
                : { maxWidth: 250, minWidth: 100, className: 'edit-marker-popup' });
        }
        marker.on('dragend', function(e) { onDrag(e.target.getLatLng()); });
        return marker;
    },

    /**
     * 更新座標預覽地圖（所有標記均可拖曳）
     */
    updatePreviewMap: function() {
        if (!this.previewMap) return;
        const self = this;

        this.previewRangeLayer.clearLayers();
        this.previewPhotoLayer.clearLayers();

        const allCoords = [];

        // ── 拓寬範圍線/面 ──
        if (this.rangeList.length >= 3) {
            const coords = this.rangeList.map(function(p) { return [Number(p.Latitude), Number(p.Longitude)]; });
            L.polygon(coords, { color: '#3b82f6', weight: 2, fillOpacity: 0.15 }).addTo(this.previewRangeLayer);
            coords.forEach(function(c) { allCoords.push(c); });
        } else if (this.rangeList.length === 2) {
            const coords = this.rangeList.map(function(p) { return [Number(p.Latitude), Number(p.Longitude)]; });
            L.polyline(coords, { color: '#3b82f6', weight: 2 }).addTo(this.previewRangeLayer);
            coords.forEach(function(c) { allCoords.push(c); });
        } else if (this.rangeList.length === 1) {
            allCoords.push([Number(this.rangeList[0].Latitude), Number(this.rangeList[0].Longitude)]);
        }

        // 取得路名
        const roadName = $('#edit-location').val() || '';

        // ── 起點標記（可拖曳）──
        if (this.startCoord) {
            const startPopup = `
                <div style="min-width:120px;">
                    <div style="font-weight:bold;color:#22c55e;margin-bottom:4px;">起點</div>
                    ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                    <div style="font-size:12px;color:#666;">
                        <div>緯度：${this.startCoord.lat.toFixed(6)}</div>
                        <div>經度：${this.startCoord.lng.toFixed(6)}</div>
                    </div>
                </div>`;
            this.createDraggableMarker(
                [this.startCoord.lat, this.startCoord.lng],
                'range-marker-start', startPopup,
                function(ll) { self.startCoord = { lat: ll.lat, lng: ll.lng }; self.syncRangeTable(); }
            ).addTo(this.previewRangeLayer);
        }

        // ── 終點標記（可拖曳）──
        if (this.endCoord) {
            const endPopup = `
                <div style="min-width:120px;">
                    <div style="font-weight:bold;color:#ef4444;margin-bottom:4px;">終點</div>
                    ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                    <div style="font-size:12px;color:#666;">
                        <div>緯度：${this.endCoord.lat.toFixed(6)}</div>
                        <div>經度：${this.endCoord.lng.toFixed(6)}</div>
                    </div>
                </div>`;
            this.createDraggableMarker(
                [this.endCoord.lat, this.endCoord.lng],
                'range-marker-end', endPopup,
                function(ll) { self.endCoord = { lat: ll.lat, lng: ll.lng }; self.syncRangeTable(); }
            ).addTo(this.previewRangeLayer);
        }

        // ── 中間範圍點標記（可拖曳）──
        this.middleRangePoints.forEach(function(p, idx) {
            const middlePopup = `
                <div style="min-width:120px;">
                    <div style="font-weight:bold;color:#3b82f6;margin-bottom:4px;">範圍點 ${idx + 1}</div>
                    ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                    <div style="font-size:12px;color:#666;">
                        <div>緯度：${p.lat.toFixed(6)}</div>
                        <div>經度：${p.lng.toFixed(6)}</div>
                    </div>
                </div>`;
            self.createDraggableMarker(
                [p.lat, p.lng],
                'range-marker-middle', middlePopup,
                function(ll) { self.middleRangePoints[idx] = { lat: ll.lat, lng: ll.lng }; self.syncRangeTable(); }
            ).addTo(self.previewRangeLayer);
        });

        // ── 街景照片標記（可拖曳，從 DOM 讀取座標；拖曳後直接寫回 DOM）──
        this.photoList.forEach(function(item, index) {
            const lat = Number($(`.edit-photo-lat-input[data-index="${index}"]`).val());
            const lng = Number($(`.edit-photo-lng-input[data-index="${index}"]`).val());
            if (lat && lng) {
                // 建立 popup 內容（含座標資訊與圖片預覽）
                let photoSrc = '';
                if (item.Photo) {
                    // 新上傳的檔案
                    photoSrc = URL.createObjectURL(item.Photo);
                } else if (item.existingUrl) {
                    // 既有照片從伺服器靜態路徑讀取
                    photoSrc = `/roadProject/${item.existingUrl}`;
                }

                const popupDiv = document.createElement('div');
                popupDiv.id = 'photoPopup';
                if (photoSrc) {
                    const img = document.createElement('img');
                    img.src = photoSrc.startsWith('blob:') ? photoSrc : `${photoSrc}?v=${new Date().getTime()}`;
                    img.style.width = '450px';
                    img.style.height = '300px';
                    popupDiv.appendChild(img);
                }

                self.createDraggableMarker(
                    [lat, lng],
                    'range-marker-photo', popupDiv,
                    function(ll) {
                        $(`.edit-photo-lat-input[data-index="${index}"]`).val(ll.lat.toFixed(6));
                        $(`.edit-photo-lng-input[data-index="${index}"]`).val(ll.lng.toFixed(6));
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

    // ──── 街景照片 ────

    /**
     * 新增一筆照片項目
     */
    addPhotoItem: function() {
        this.photoList.push({
            Id: this.photoList.length,
            Latitude: '',
            Longitude: '',
            Photo: null,
            PhotoName: null,
            existingUrl: ''
        });
        this.renderPhotoList();
    },

    /**
     * 移除照片項目
     */
    removePhotoItem: function(index) {
        this.photoList.splice(index, 1);
        this.photoList.forEach(function(item, i) { item.Id = i; });
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
        this.photoList[index].existingUrl = '';  // 新上傳取代既有

        const $preview = $(`#edit-photo-preview-${index}`);
        $preview.attr('src', URL.createObjectURL(file)).addClass('has-image');
    },

    /**
     * 渲染照片列表（既有照片從伺服器靜態路徑讀取預覽，新上傳直接使用 File 物件）
     */
    renderPhotoList: function() {
        const $list = $('#edit-street-photo-list');
        $list.empty();

        if (this.photoList.length === 0) {
            $list.html('<div class="empty-photo-hint">尚無照片，請點擊「新增一筆」或「點預覽圖選取」</div>');
            this.updatePreviewMap();
            return;
        }

        this.photoList.forEach((item, index) => {
            let previewSrc = '';
            let hasPreview = '';

            if (item.Photo) {
                // 新上傳的檔案
                previewSrc = URL.createObjectURL(item.Photo);
                hasPreview = 'has-image';
            } else if (item.existingUrl) {
                // 既有照片從伺服器靜態文件讀取
                previewSrc = `/roadProject/${item.existingUrl}`;
                hasPreview = 'has-image';
            }

            $list.append(`
                <div class="photo-item" data-index="${index}">
                    <div class="photo-item-header">
                        <span class="photo-item-index">照片 ${index + 1}${item.existingUrl ? ' (既有)' : ''}</span>
                        <button type="button" class="edit-btn-remove-photo" data-index="${index}">
                            <i class="fa fa-trash"></i> 刪除
                        </button>
                    </div>
                    <div class="photo-item-content">
                        <div class="form-group photo-item-file">
                            <label class="form-label">選擇檔案${item.existingUrl ? '（可替換）' : ''}</label>
                            <input type="file" class="form-control edit-photo-file-input" data-index="${index}" accept="image/*">
                        </div>
                        <img id="edit-photo-preview-${index}" class="photo-preview ${hasPreview}" src="${previewSrc}" alt="預覽">
                        <div class="form-group">
                            <label class="form-label">緯度</label>
                            <input type="text" class="form-control edit-photo-lat-input" data-index="${index}"
                                   value="${item.Latitude}" placeholder="如: 24.956387">
                        </div>
                        <div class="form-group">
                            <label class="form-label">經度</label>
                            <input type="text" class="form-control edit-photo-lng-input" data-index="${index}"
                                   value="${item.Longitude}" placeholder="如: 121.219068">
                        </div>
                    </div>
                </div>
            `);
        });
        this.updatePreviewMap();
    },

    // ──── 提交 ────

    /**
     * 收集表單 → POST 基本資料 → POST 座標點 → 成功後開啟 View
     */
    submitForm: function() {
        const self = this;
        const $form = $('#project-edit-form');

        if (!$form[0].checkValidity()) {
            $form[0].reportValidity();
            return;
        }

        // 驗證拓寬座標至少要有兩個點
        if (self.rangeList.length < 2) {
            alert('拓寬範圍至少需要 2 個座標點');
            return;
        }

        const payload = {
            id: self.currentProject.id,
            projectId: $('#edit-project-id').val(),
            proposer: $('#edit-proposer').val(),
            administrativeDistrict: $('#edit-district').val(),
            startPoint: $('#edit-start-point').val(),
            endPoint: $('#edit-end-point').val(),
            startEndLocation: $('#edit-location').val(),
            roadLength: Number($('#edit-road-length').val()) || 0,
            currentRoadWidth: $('#edit-current-width').val(),
            plannedRoadWidth: $('#edit-planned-width').val(),
            publicLand: Number($('#edit-public-land').val()) || 0,
            privateLand: Number($('#edit-private-land').val()) || 0,
            publicPrivateLand: Number($('#edit-mixed-land').val()) || 0,
            constructionBudget: Number($('#edit-construction-budget').val()) || 0,
            landAcquisitionBudget: Number($('#edit-land-budget').val()) || 0,
            compensationBudget: Number($('#edit-compensation-budget').val()) || 0,
            totalBudget: Number($('#edit-total-budget').val()) || 0,
            reviewYear: $('#edit-review-year').val(),
            caseType: $('#edit-case-type').val(),
            rcCount: $('#edit-rc-count').val(),
            tinHouseCount: $('#edit-tin-house-count').val(),
            reviewResult: $('#edit-review-result').val(),
            remarks: $('#edit-remarks').val()
        };

        showLoading('更新中...', '#right-box');

        // 第一步：更新基本資料
        fetch('/Admin/UpdateRoadProject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            if (!response.ok) return response.json().then(function(err) { throw err; });
            return response.json();
        })
        .then(function(result) {
            if (!result.success) throw new Error(result.message);
            // 第二步：更新座標點
            return self.submitPoints();
        })
        .then(function() {
            // 第三步：若座標未確認，儲存時自動確認
            if (self.currentProject.coordinateChecked === false) {
                return fetch(`/api/RoadProject/confirmCoordinate/${self.currentProject.id}`, { method: 'POST' })
                    .then(function(r) { return r.json(); });
            }
        })
        .then(function() {
            alert('專案更新成功！');
            $(document).trigger('projectUpdated');
            RoadProjectView.openViewById(self.currentProject.id);
        })
        .catch(function(error) {
            console.error('更新專案失敗:', error);
            alert(`更新失敗：${error.message || '請稍後再試'}`);
        })
        .finally(function() {
            hideLoading('#right-box');
        });
    },

    /**
     * 提交座標點數據（範圍點 + 照片點）
     */
    submitPoints: function() {
        const self = this;

        // 收集範圍點
        const formData = new FormData();
        formData.append('ProjectId', self.currentProject.id);

        // 範圍點
        this.rangeList.forEach(function(item, index) {
            formData.append(`RangePoints[${index}].Id`, index);
            formData.append(`RangePoints[${index}].Latitude`, item.Latitude);
            formData.append(`RangePoints[${index}].Longitude`, item.Longitude);
        });

        // 照片點（從 DOM 讀取最新座標）
        this.photoList.forEach(function(item, index) {
            const lat = $(`.edit-photo-lat-input[data-index="${index}"]`).val() || item.Latitude;
            const lng = $(`.edit-photo-lng-input[data-index="${index}"]`).val() || item.Longitude;
            formData.append(`PhotoPoints[${index}].Id`, index);
            formData.append(`PhotoPoints[${index}].PhotoName`, item.PhotoName || '');
            formData.append(`PhotoPoints[${index}].Latitude`, Number(lat));
            formData.append(`PhotoPoints[${index}].Longitude`, Number(lng));
            if (item.Photo) {
                formData.append(`PhotoPoints[${index}].Photo`, item.Photo, item.PhotoName || '');
            }
        });

        return fetch('/api/RoadProject/updatePoints', {
            method: 'POST',
            body: formData
        })
        .then(function(response) {
            if (!response.ok) return response.json().then(function(err) { throw err; });
            return response.json();
        })
        .then(function(result) {
            if (!result.success) throw new Error(result.message);
        });
    },

    /**
     * 取消編輯，直接回顯原始資料
     */
    closeEdit: function() {
        if (this.currentProject) {
            RoadProjectView.openView(this.currentProject);
        }
    }
};

export default RoadProjectEdit;
