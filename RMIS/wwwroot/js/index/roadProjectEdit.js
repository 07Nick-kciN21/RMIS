import BoxManager from './box.js';
import RoadProjectView from './roadProjectView.js';
import { showLoading, hideLoading } from '../loading.js';
import { MAX_FILE_MB, MAX_FILE_BYTES, checkUploadSize, readErrorResponse, getErrorMessage } from '../uploadLimit.js';
import { initPreviewBasemapCtrl } from './previewBasemapCtrl.js';
import { checkStreetPhotos } from './streetPhotoCheck.js';

/**
 * 道路專案編輯模組
 * 功能：填入表單、POST 更新（含拓寬範圍 + 街景照片 + 座標預覽）、返回 View
 */
const RoadProjectEdit = {

    // 進入編輯時的原始專案物件
    currentProject: null,

    // ── 拓寬範圍 ──
    rangeList: [],
    // 拓寬範圍點（依多邊形順序排列）：{ lat, lng, role: 'start' | 'end' | 'middle' }
    rangePoints: [],

    // ── 街景照片 ──
    // 每筆：{ Id, Latitude, Longitude, Photo (base64|null), PhotoName, existingUrl }
    photoList: [],

    // ── 備註附件 ──
    remarkFileList: [],      // 既有附件（來自伺服器）：{ id, fileName, fileSize, ... }
    newRemarkFiles: [],      // 待上傳的新檔案（File 物件），儲存時才送出
    removedRemarkFileIds: [], // 待刪除的既有附件 id，儲存時才送出

    fileIcons: {
        'pdf': 'fa-file-pdf-o',
        'doc': 'fa-file-word-o',
        'docx': 'fa-file-word-o',
        'xls': 'fa-file-excel-o',
        'xlsx': 'fa-file-excel-o',
        'ppt': 'fa-file-powerpoint-o',
        'pptx': 'fa-file-powerpoint-o',
        'jpg': 'fa-file-image-o',
        'jpeg': 'fa-file-image-o',
        'png': 'fa-file-image-o',
        'gif': 'fa-file-image-o',
        'zip': 'fa-file-archive-o',
        'rar': 'fa-file-archive-o',
        'default': 'fa-file-o'
    },

    // ── 座標預覽地圖 ──
    previewMap: null,
    previewRangeLayer: null,
    previewPhotoLayer: null,

    // ── 點圖模式開關 ──
    addingRangePoint: false,
    addingPhotoPoint: false,

    // ── 路名搜尋 ──
    searchTimer: null,
    searchResults: { start: [], end: [] },

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

        // 綁定起點路名搜尋
        $(document).on('input', '#edit-start-point', function() {
            self.setRolePoint('start', null);
            self.scheduleSearch('start', $(this).val().trim());
        });

        // 綁定終點路名搜尋
        $(document).on('input', '#edit-end-point', function() {
            self.setRolePoint('end', null);
            self.scheduleSearch('end', $(this).val().trim());
        });

        // 點擊搜尋結果項目
        $(document).on('click', '#page-project-edit .autocomplete-item', function() {
            const type = $(this).data('type');
            const idx = parseInt($(this).data('index'));
            self.selectLocation(type, idx);
        });

        // 點擊外部關閉下拉列表
        $(document).on('click', function(e) {
            if (!$(e.target).closest('#page-project-edit .autocomplete-wrapper').length) {
                $('#page-project-edit .autocomplete-dropdown').addClass('hidden');
            }
        });

        // Escape 鍵關閉下拉列表
        $(document).on('keydown', '#edit-start-point, #edit-end-point', function(e) {
            if (e.key === 'Escape') {
                $('#page-project-edit .autocomplete-dropdown').addClass('hidden');
            }
        });

        // 綁定拓寬範圍表格緯經度輸入（保持焦點）
        $(document).on('input', '.edit-range-lat-input, .edit-range-lng-input', function() {
            self.onRangeInputChange(this);
        });

        // 綁定範圍點刪除按鈕
        $(document).on('click', '.edit-btn-delete-range-point', function() {
            self.deleteRangePoint(parseInt($(this).data('row-index')));
        });


        // 綁定點圖新增範圍點切換按鈕
        $(document).on('click', '#btn-edit-toggle-add-range-point', function() {
            self.toggleAddRangePoint();
        });

        // 連續新增範圍點時按 Esc 結束
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' && self.addingRangePoint && !$('#page-project-edit').hasClass('hidden')) {
                self.toggleAddRangePoint();
            }
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

        // 綁定「新增附件」按鈕：觸發隱藏的檔案選取
        $(document).on('click', '#btn-edit-add-remark-file', function() {
            $('#edit-remark-file-input').trigger('click');
        });

        // 綁定備註附件檔案選擇（可複選）
        $(document).on('change', '#edit-remark-file-input', function() {
            self.handleRemarkFileSelect(this);
        });

        // 綁定既有備註附件刪除按鈕
        $(document).on('click', '.edit-btn-remove-remark-file', function() {
            const id = parseInt($(this).data('id'));
            self.removeExistingRemarkFile(id);
        });

        // 綁定新增中的備註附件刪除按鈕
        $(document).on('click', '.edit-btn-remove-new-remark-file', function() {
            const index = parseInt($(this).data('index'));
            self.removeNewRemarkFile(index);
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

        this.loadRemarkFiles(project.id);
    },

    /**
     * 重置地圖相關狀態與 DOM
     */
    resetMapState: function() {
        this.rangePoints = [];
        this.rangeList = [];
        this.photoList = [];
        this.remarkFileList = [];
        this.newRemarkFiles = [];
        this.removedRemarkFileIds = [];
        this.addingRangePoint = false;
        this.addingPhotoPoint = false;
        this.searchResults = { start: [], end: [] };
        $('#edit-start-point-dropdown').addClass('hidden').empty();
        $('#edit-end-point-dropdown').addClass('hidden').empty();
        $('#btn-edit-toggle-add-range-point').removeClass('active').html('<i class="fa fa-plus"></i> 點圖新增範圍點');
        $('#btn-edit-toggle-add-photo-point').removeClass('active');
        $('#edit-preview-map').removeClass('adding-point');
        $('#edit-expansion-range-tbody').html('<tr class="empty-row"><td colspan="4">尚無資料，請點圖新增範圍點</td></tr>');
        $('#edit-street-photo-list').html('<div class="empty-photo-hint">尚無照片，請點擊「新增一筆」或「點預覽圖選取」</div>');
        $('#edit-remark-file-list').html('<div class="empty-file-hint">尚無附件，請點擊「新增附件」</div>');
        if (this.previewMap) {
            if (this.previewRangeLayer) this.previewRangeLayer.clearLayers();
            if (this.previewPhotoLayer) this.previewPhotoLayer.clearLayers();
        }
    },

    /**
     * 從 API 載入現有座標點並渲染
     */
    loadPoints: async function(projectId) {
        showLoading('載入座標中...', '#right-box');
        try {
            const response = await fetch(`/api/RoadProject/getPoints/${projectId}`);
            if (!response.ok) return;
            const data = await response.json();

            // 解析範圍點：依儲存順序載入；資料庫未記錄起訖角色，沿用「第一個 = 起點、最後一個 = 終點」
            // 注意：API 使用 camelCase 序列化，所以屬性名是 latitude/longitude（小駝峰）
            const savedPoints = data.rangePoints || [];
            this.rangePoints = savedPoints.map(function(p, i) {
                const role = i === 0 ? 'start' : (i === savedPoints.length - 1 ? 'end' : 'middle');
                return { lat: p.latitude, lng: p.longitude, role: role };
            });
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
        } finally {
            hideLoading('#right-box');
        }
    },

    /**
     * 將 project 各欄位填入表單
     */
    fillForm: function(project) {
        $('#edit-project-id').val(project.projectId || '');
        $('#edit-proposer').val(project.proposer || '');
        $('#edit-district').val(project.administrativeDistrict || '');

        $('#edit-start-point').val(project.startPoint || '');
        $('#edit-end-point').val(project.endPoint || '');
        $('#edit-location').val(project.startEndLocation || '');
        $('#edit-location').data('auto-combined', true);
        $('#edit-road-length').val(project.roadLength || '');

        $('#edit-current-width').val(project.currentRoadWidth || '');
        $('#edit-planned-width').val(project.plannedRoadWidth || '');

        $('#edit-public-land').val(project.publicLand || '0');
        $('#edit-private-land').val(project.privateLand || '0');
        $('#edit-mixed-land').val(project.publicPrivateLand || '0');

        $('#edit-construction-budget').val(project.constructionBudget || 0);
        $('#edit-land-budget').val(project.landAcquisitionBudget || 0);
        $('#edit-compensation-budget').val(project.compensationBudget || 0);
        $('#edit-total-budget').val(project.totalBudget || 0);

        const projectName = project.projectName || project.startEndLocation || '';
        $('.edit-title').text(projectName ? `編輯道路專案-${projectName}` : '編輯道路專案');

        $('#edit-rc-count').val(project.rcCount || project.RCCount || '');
        $('#edit-tin-house-count').val(project.tinHouseCount || project.TinHouseCount || '');

        $('#edit-review-year').val(project.reviewYear || '');
        $('#edit-case-type').val(project.caseType || '');
        $('#edit-review-result').val(project.reviewResult || '');
        $('#edit-remarks').val(project.remarks || '');
    },

    /**
     * 計算合計經費
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

    // ──── 路名搜尋 ────

    scheduleSearch: function(type, query) {
        clearTimeout(this.searchTimer);
        const dropdownId = type === 'start' ? 'edit-start-point-dropdown' : 'edit-end-point-dropdown';

        if (query.length < 2) {
            $(`#${dropdownId}`).addClass('hidden').empty();
            return;
        }

        const self = this;
        this.searchTimer = setTimeout(function() {
            self.searchNominatim(type, query, dropdownId);
        }, 300);
    },

    searchNominatim: function(type, query, dropdownId) {
        const self = this;
        const district = $('#edit-district').val();
        const q = district ? `${district}${query}` : query;
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
            .catch(err => console.error('地址搜尋失敗:', err));
    },

    selectLocation: function(type, index) {
        const item = this.searchResults[type][index];
        if (!item) return;

        const shortName = item.content;
        const [lng, lat] = item.location.split(',').map(Number);
        const coord = { lat, lng };

        $(type === 'start' ? '#edit-start-point-dropdown' : '#edit-end-point-dropdown').addClass('hidden');
        this.setRolePoint(type, coord);
        this.combineLocation();
    },

    // ──── 拓寬範圍 ────

    /**
     * 設定起點 / 終點座標（coord 為 null 時移除）：
     * 已存在則原位更新，不改變其在多邊形中的順序；新增時起點放最前、終點放最後
     */
    setRolePoint: function(role, coord) {
        const idx = this.rangePoints.findIndex(p => p.role === role);
        if (!coord) {
            if (idx >= 0) this.rangePoints.splice(idx, 1);
        } else if (idx >= 0) {
            this.rangePoints[idx] = { lat: coord.lat, lng: coord.lng, role };
        } else if (role === 'start') {
            this.rangePoints.unshift({ lat: coord.lat, lng: coord.lng, role });
        } else {
            this.rangePoints.push({ lat: coord.lat, lng: coord.lng, role });
        }
        this.syncRangeTable();
    },

    /**
     * 點圖新增範圍點：插入到使多邊形周長增加最少的邊上（含首尾相接的閉合邊），
     * 讓點擊順序不影響形狀。例：起訖點 A、C，依序點 B、D → A B C D（而非 A B D C 的交叉形）
     */
    insertRangePoint: function(coord) {
        const pts = this.rangePoints;
        const point = { lat: coord.lat, lng: coord.lng, role: 'middle' };
        if (pts.length < 2) {
            pts.push(point);
            return;
        }

        // 以平面近似計算距離（經度依緯度縮放），範圍小時足夠準確
        const kx = Math.cos(coord.lat * Math.PI / 180);
        const dist = (a, b) => Math.hypot((a.lng - b.lng) * kx, a.lat - b.lat);

        let bestIdx = pts.length;
        let bestCost = Infinity;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            const cost = dist(a, point) + dist(point, b) - dist(a, b);
            if (cost < bestCost) {
                bestCost = cost;
                bestIdx = i + 1;
            }
        }
        pts.splice(bestIdx, 0, point);
    },

    /**
     * 由 rangePoints 產生送出用的 rangeList（資料層，不觸及 DOM）
     */
    rebuildRangeList: function() {
        this.rangeList = this.rangePoints.map(function(item, index) {
            return { Id: index, Latitude: item.lat, Longitude: item.lng };
        });
    },

    /**
     * 渲染拓寬範圍表格（含可編輯緯經度輸入、刪除鈕）
     */
    renderRangeTable: function() {
        const $tbody = $('#edit-expansion-range-tbody');
        $tbody.empty();

        if (this.rangeList.length === 0) {
            $tbody.html('<tr class="empty-row"><td colspan="4">尚無資料，請點圖新增範圍點</td></tr>');
            return;
        }

        this.rangePoints.forEach((item, index) => {
            const label = item.role === 'start' ? ' (起點)' : item.role === 'end' ? ' (終點)' : '';
            $tbody.append(`
                <tr>
                    <td>${index + 1}${label}</td>
                    <td><input type="text" class="form-control edit-range-lat-input" data-row-index="${index}" value="${Number(item.lat).toFixed(6)}"></td>
                    <td><input type="text" class="form-control edit-range-lng-input" data-row-index="${index}" value="${Number(item.lng).toFixed(6)}"></td>
                    <td><button type="button" class="edit-btn-delete-range-point" data-row-index="${index}"><i class="fa fa-trash">刪除</i></button></td>
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
        const point = this.rangePoints[parseInt($input.data('row-index'))];
        const value = parseFloat($input.val());
        if (!point || isNaN(value)) return;

        if ($input.hasClass('edit-range-lat-input')) point.lat = value;
        else point.lng = value;

        this.rebuildRangeList();
        this.updatePreviewMap();
    },

    /**
     * 刪除指定範圍點（rangePoints 索引）
     */
    deleteRangePoint: function(index) {
        if (isNaN(index) || !this.rangePoints[index]) return;
        this.rangePoints.splice(index, 1);
        this.syncRangeTable();
    },

    /**
     * 切換「點圖新增範圍點」模式（與照片點模式互斥）：
     * 開啟後每次點擊地圖即新增一個範圍點（自動插入到最適合的邊），
     * 再按一次按鈕（「完成新增」）或按 Esc 結束
     */
    toggleAddRangePoint: function() {
        this.addingRangePoint = !this.addingRangePoint;
        const $btn = $('#btn-edit-toggle-add-range-point');
        if (this.addingRangePoint) {
            this.addingPhotoPoint = false;
            $('#btn-edit-toggle-add-photo-point').removeClass('active');
            $btn.addClass('active').html('<i class="fa fa-check"></i> 完成新增');
            this.scrollToPreviewMap();
        } else {
            $btn.removeClass('active').html('<i class="fa fa-plus"></i> 點圖新增範圍點');
            // 結束後補做一次自動縮放（新增期間不縮放，避免地圖跳動）
            this.updatePreviewMap();
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
            $('#btn-edit-toggle-add-range-point').removeClass('active').html('<i class="fa fa-plus"></i> 點圖新增範圍點');
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

        // 底圖切換（與新增專案共用）
        initPreviewBasemapCtrl(this.previewMap);

        this.previewRangeLayer = L.layerGroup().addTo(this.previewMap);
        this.previewPhotoLayer = L.layerGroup().addTo(this.previewMap);

        // 點圖新增模式：
        //   範圍點 → 連續新增，模式保持開啟直到按「完成新增」或 Esc
        //   街景照片 → 新增一筆後關閉模式並捲回照片區塊
        const self = this;
        this.previewMap.on('click', function(e) {
            if (self.addingRangePoint) {
                self.insertRangePoint(e.latlng);
                self.syncRangeTable();
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

        // ── 範圍點標記（可拖曳）：起點綠色、終點紅色、其餘藍色 ──
        let middleNo = 0;
        this.rangePoints.forEach(function(p, idx) {
            const style = p.role === 'start' ? { cls: 'range-marker-start', color: '#22c55e', title: '起點' }
                : p.role === 'end' ? { cls: 'range-marker-end', color: '#ef4444', title: '終點' }
                : { cls: 'range-marker-middle', color: '#3b82f6', title: `範圍點 ${++middleNo}` };
            const popup = `
                <div style="min-width:120px;">
                    <div style="font-weight:bold;color:${style.color};margin-bottom:4px;">${style.title}</div>
                    ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                    <div style="font-size:12px;color:#666;">
                        <div>緯度：${p.lat.toFixed(6)}</div>
                        <div>經度：${p.lng.toFixed(6)}</div>
                    </div>
                </div>`;
            self.createDraggableMarker(
                [p.lat, p.lng], style.cls, popup,
                function(ll) {
                    self.rangePoints[idx] = { lat: ll.lat, lng: ll.lng, role: p.role };
                    self.syncRangeTable();
                }
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

        // ── 自動縮放範圍（連續新增範圍點期間不縮放，避免地圖跳動）──
        if (this.addingRangePoint) return;
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

    // ──── 備註附件 ────

    /**
     * 從 API 載入既有備註附件
     */
    loadRemarkFiles: async function(projectId) {
        this.remarkFileList = [];
        this.newRemarkFiles = [];
        this.removedRemarkFileIds = [];
        try {
            const response = await fetch(`/api/RoadProject/GetRemarkFiles/${projectId}`);
            if (response.ok) {
                this.remarkFileList = await response.json();
            }
        } catch (err) {
            console.error('載入備註附件失敗:', err);
        }
        this.renderRemarkFileList();
    },

    // 單一附件檔案大小上限（同 uploadLimit.js MAX_FILE_MB）
    MAX_REMARK_FILE_SIZE: MAX_FILE_BYTES,

    /**
     * 處理備註附件檔案選擇（可複選），選取後暫存於畫面上，儲存時才上傳
     */
    handleRemarkFileSelect: function(input) {
        const files = input.files;
        if (!files || files.length === 0) return;

        const oversized = [];
        Array.from(files).forEach(file => {
            if (file.size > this.MAX_REMARK_FILE_SIZE) {
                oversized.push(file.name);
                return;
            }
            this.newRemarkFiles.push(file);
        });

        if (oversized.length > 0) {
            alert(`以下檔案超過 ${MAX_FILE_MB} MB 上限，未加入附件：\n${oversized.join('\n')}`);
        }

        input.value = '';
        this.renderRemarkFileList();
    },

    /**
     * 移除既有附件（僅標記，儲存時才真正呼叫刪除 API）
     */
    removeExistingRemarkFile: function(id) {
        this.removedRemarkFileIds.push(id);
        this.renderRemarkFileList();
    },

    /**
     * 移除新增中、尚未上傳的附件
     */
    removeNewRemarkFile: function(index) {
        this.newRemarkFiles.splice(index, 1);
        this.renderRemarkFileList();
    },

    /**
     * 渲染備註附件清單（既有未刪除 + 新增中尚未上傳）
     */
    renderRemarkFileList: function() {
        const self = this;
        const $list = $('#edit-remark-file-list');
        $list.empty();

        const existingItems = this.remarkFileList.filter(f => !this.removedRemarkFileIds.includes(f.id));

        if (existingItems.length === 0 && this.newRemarkFiles.length === 0) {
            $list.html('<div class="empty-file-hint">尚無附件，請點擊「新增附件」</div>');
            return;
        }

        existingItems.forEach(function(file) {
            const ext = self.getFileExtension(file.fileName);
            const iconClass = self.fileIcons[ext] || self.fileIcons['default'];
            $list.append(`
                <div class="file-list-item">
                    <div class="file-info">
                        <i class="fa ${iconClass} file-icon"></i>
                        <span class="file-name">${self.escapeHtml(file.fileName)}</span>
                        <span class="file-size">(${file.fileSize || '-'})</span>
                    </div>
                    <div class="file-actions">
                        <button type="button" class="edit-btn-remove-remark-file" data-id="${file.id}" title="刪除">
                            <img src="/svg/remove_0.svg" alt="刪除">
                        </button>
                    </div>
                </div>
            `);
        });

        this.newRemarkFiles.forEach(function(file, index) {
            const ext = self.getFileExtension(file.name);
            const iconClass = self.fileIcons[ext] || self.fileIcons['default'];
            $list.append(`
                <div class="file-list-item file-list-item-new">
                    <div class="file-info">
                        <i class="fa ${iconClass} file-icon"></i>
                        <span class="file-name">${self.escapeHtml(file.name)}</span>
                        <span class="file-size">(${self.formatFileSize(file.size)}，尚未上傳）</span>
                    </div>
                    <div class="file-actions">
                        <button type="button" class="edit-btn-remove-new-remark-file" data-index="${index}" title="移除">
                            <img src="/svg/remove_0.svg" alt="刪除">
                        </button>
                    </div>
                </div>
            `);
        });
    },

    /**
     * 儲存時才真正送出備註附件的新增與刪除
     */
    submitRemarkFiles: async function() {
        const projectId = this.currentProject.id;

        // 刪除已標記移除的既有附件
        if (this.removedRemarkFileIds.length > 0) {
            const deleteResponses = await Promise.all(this.removedRemarkFileIds.map(id =>
                fetch(`/api/RoadProject/DeleteRemarkFile/${id}`, { method: 'DELETE' })
            ));
            if (deleteResponses.some(r => !r.ok)) {
                throw new Error('部分備註附件刪除失敗');
            }
        }

        // 上傳新增中的附件
        if (this.newRemarkFiles.length > 0) {
            const formData = new FormData();
            formData.append('projectId', projectId);
            this.newRemarkFiles.forEach(file => formData.append('files', file, file.name));

            const response = await fetch('/api/RoadProject/UploadRemarkFiles', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, '備註附件上傳失敗'));
            }

            const data = await response.json();
            const failed = (data.results || []).filter(r => !r.success);
            if (failed.length > 0) {
                throw new Error(`以下附件上傳失敗：${failed.map(f => f.fileName).join('、')}`);
            }
        }
    },

    getFileExtension: function(fileName) {
        if (!fileName) return 'default';
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : 'default';
    },

    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    escapeHtml: function(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
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

        // 街景照片：每筆都要有圖檔（新選或既有）與有效緯經度；
        // 必須在送出任何資料前檢查，否則基本資料存了、座標點卻被後端擋下，會只存一半
        const photoError = checkStreetPhotos(self.photoList, index => ({
            lat: $(`.edit-photo-lat-input[data-index="${index}"]`).val(),
            lng: $(`.edit-photo-lng-input[data-index="${index}"]`).val()
        }));
        if (photoError) {
            alert(photoError);
            self.scrollToSection('#edit-street-photo-list');
            return;
        }

        // 送出前檢查大小：備註附件與街景照片分屬不同請求，分別檢查（任一超過即不送出任何資料）
        const remarkSizeError = checkUploadSize(self.newRemarkFiles);
        if (remarkSizeError) {
            alert(`備註附件：${remarkSizeError}`);
            return;
        }
        const photoSizeError = checkUploadSize(self.photoList.map(p => p.Photo));
        if (photoSizeError) {
            alert(`街景照片：${photoSizeError}`);
            return;
        }

        showLoading('更新中...', '#right-box');

        // 第一步：先送出備註附件的新增與刪除。若失敗就整個中止，
        // 避免專案主資料（含 UpdateTime）在附件沒存成功的情況下被誤標為已更新。
        self.submitRemarkFiles()
        .then(function() {
            // 第二步：更新基本資料
            return fetch('/Admin/UpdateRoadProject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        })
        .then(function(response) {
            if (!response.ok) return readErrorResponse(response).then(function(err) { throw err; });
            return response.json();
        })
        .then(function(result) {
            if (!result.success) throw new Error(result.message);
            // 第三步：更新座標點
            return self.submitPoints();
        })
        .then(function() {
            // 第四步：若座標未確認，儲存時自動確認
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
            if (!response.ok) return readErrorResponse(response).then(function(err) { throw err; });
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
