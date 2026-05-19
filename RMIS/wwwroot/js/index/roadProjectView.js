import BoxManager from './box.js';
import ProcessBox from './processBox.js';
import { Map } from './map_test.js';
import RoadProjectEdit from './roadProjectEdit.js';
import { showLoading, hideLoading } from '../loading.js';

/**
 * 道路專案檢視模組
 * 功能：顯示專案詳情、地圖定位，並將編輯邏輯委派給 RoadProjectEdit
 */
const RoadProjectView = {
    // 當前檢視的專案資料 
    currentProject: null,

    // 地圖相關 
    $indexMap: null,
    projectLayer: null,

    /**
     * 初始化檢視模組 
     */
    init: function() {
        const self = this;

        // 初始化地圖圖層 
        self.$indexMap = Map.getIndexMap();
        self.projectLayer = L.layerGroup();
        self.projectLayer.addTo(self.$indexMap);

        // 初始化編輯模組並傳入目前的 View 實例 

        // 綁定返回按鈕事件 
        $(document).on('click', '#btn-back-to-project-list', function() {
            self.closeView();
        });

        // 綁定定位按鈕事件 
        $(document).on('click', '#btn-locate-project', function() {
            if (self.currentProject) {
                self.locateProject(self.currentProject.id);
            }
        });

        // 綁定歷程按鈕事件 
        $(document).on('click', '#btn-view-history', function() {
            if (self.currentProject) {
                self.openProjectHistory();
            }
        });

        // 綁定刪除按鈕事件
        $(document).on('click', '#btn-delete-project', function() {
            if (self.currentProject) {
                self.deleteProject();
            }
        });

        // 綁定編輯按鈕事件
        $(document).on('click', '#btn-edit-project', function() {
            if (!self.currentProject) return;
            const isPending = self.currentProject.coordinateChecked === null ||
                              self.currentProject.coordinateChecked === undefined;
            if (isPending) return;
            RoadProjectEdit.openEdit(self.currentProject);
        });

        console.log('RoadProjectView 模組初始化完成');
    },

    /**
     * 開啟專案檢視頁面 
     */
    openView: function(project) {
        if (!project) return;
        this.currentProject = project;
        BoxManager.openRightBoxPage('page-project-view', '專案詳情');
        this.renderView(project);
    },

    /**
     * 透過 ID 開啟專案檢視（從 API 載入資料） 
     */
    openViewById: function(projectId) {
        const self = this;
        BoxManager.openRightBoxPage('page-project-view', '專案詳情');
        self.showLoading();

        fetch(`/api/RoadProject/GetProject/${projectId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            self.currentProject = data;
            self.renderView(data);
        })
        .catch(error => {
            console.error('載入專案失敗:', error);
            self.showError('載入失敗，請稍後再試');
        });
    },

    /**
     * 渲染檢視頁面內容 
     */
    renderView: function(project) {
        const self = this;
        $('.view-loading, .view-error').remove();
        $('.view-section').show();

        // 座標狀態警示與編輯限制
        const isPending = project.coordinateChecked === null || project.coordinateChecked === undefined;
        const isUnchecked = project.coordinateChecked === false;

        $('#pv-coord-pending').toggleClass('hidden', !isPending);
        $('#pv-coord-warning').toggleClass('hidden', !isUnchecked);
        $('#btn-edit-project').prop('disabled', isPending)
                              .toggleClass('disabled', isPending)
                              .attr('title', isPending ? '尚未取得座標，無法編輯' : '');

        // 更新標題與路徑導航 [cite: 1, 2, 3]
        const title = project.projectName || project.startEndLocation || '道路專案';
        $('#pv-title').text(title);
        $('#pv-district').text(project.administrativeDistrict || '-');

        // 更新基本資訊 [cite: 1, 7, 8, 9, 10, 11, 12]
        $('#pv-project-id').text(project.projectId || project.id || '-');
        this.refreshSpanField('pv-proposer', project.proposer);
        this.refreshSpanField('pv-admin-district', project.administrativeDistrict);
        $('#pv-create-date').text(self.formatDate(project.createTime));
        $('#pv-location').text(project.startEndLocation || '-');

        // 更新道路資訊
        $('#pv-road-length').text(project.roadLength ? `${project.roadLength} 公尺` : '-');
        $('#pv-current-width').text(self.formatRoadWidth(project.currentRoadWidth));
        $('#pv-planned-width').text(self.formatRoadWidth(project.plannedRoadWidth));

        // 更新土地資訊 [cite: 1, 20, 22, 23]
        $('#pv-public-land').text(project.publicLand || '0');
        $('#pv-private-land').text(project.privateLand || '0');
        $('#pv-mixed-land').text(project.publicPrivateLand || '0');

        // 更新經費資訊 [cite: 1, 27, 28, 29, 30]
        $('#pv-construction-budget').text(self.formatBudget(project.constructionBudget));
        $('#pv-land-budget').text(self.formatBudget(project.landAcquisitionBudget));
        $('#pv-compensation-budget').text(self.formatBudget(project.compensationBudget));
        $('#pv-total-budget').text(self.formatBudget(project.totalBudget));

        // 更新建築物與審議資訊 [cite: 1, 33, 34, 38, 39, 40]
        $('#pv-rc-count').text(project.rcCount || project.RCCount || '0');
        $('#pv-tin-house-count').text(project.tinHouseCount || project.TinHouseCount || '0');
        $('#pv-review-year').text(project.reviewYear || '-');
        $('#pv-case-type').text(project.caseType || '-');
        $('#pv-review-result').text(project.reviewResult || '-');

        // 更新備註 [cite: 1, 42, 43]
        $('#pv-remarks').text(project.remarks || '尚無備註');

        // 載入街景照片
        self.loadStreetViewPhotos(project.id || project.projectId);
    },
    // 輔助方法：確保 Input 被換回 Span
    refreshSpanField: function(id, value) {
        const $el = $(`#${id}`);
        if ($el.is('input')) {
            $el.replaceWith(`<span class="info-value" id="${id}">${value || '-'}</span>`);
        } else {
            $el.text(value || '-');
        }
    },
    /**
     * 載入街景照片
     */
    loadStreetViewPhotos: function(projectId) {
        const self = this;
        $('#pv-photo-gallery').html('<div class="photo-empty"><i class="fa fa-spinner fa-spin"></i> 載入中...</div>');
        $('#pv-photo-count').text('0 張');

        fetch(`/api/RoadProject/getPoints/${projectId}`)
            .then(response => response.json())
            .then(data => {
                const photoPoints = data.photoPoints || [];
                self.renderPhotoGallery(projectId, photoPoints);
            })
            .catch(() => {
                $('#pv-photo-gallery').html('<div class="photo-empty">照片載入失敗</div>');
            });
    },

    /**
     * 渲染照片區塊
     */
    renderPhotoGallery: function(projectId, photoPoints) {
        const $gallery = $('#pv-photo-gallery');
        $('#pv-photo-count').text(`${photoPoints.length} 張`);

        if (photoPoints.length === 0) {
            $gallery.html('<div class="photo-empty">尚無街景照片</div>');
            return;
        }

        let html = '';
        photoPoints.forEach(function(p) {
            let photoName = '';
            let photoUrl = '';
            try {
                const parsed = JSON.parse(p.url || '{}');
                const existingUrl = parsed.url || '';
                photoName = existingUrl.split('/').pop();
                photoUrl = `/roadProject/${existingUrl}`;
            } catch(e) {
                const existingUrl = p.url || '';
                photoName = existingUrl.split('/').pop();
                photoUrl = `/roadProject/${existingUrl}`;
            }

            const lat = p.latitude ? p.latitude.toFixed(6) : '-';
            const lng = p.longitude ? p.longitude.toFixed(6) : '-';

            html += `
                <div class="photo-card">
                    <img src="${photoUrl}" alt="${photoName}" onclick="document.getElementById('pv-photo-lightbox').classList.add('active');document.getElementById('pv-lightbox-img').src=this.src;" onerror="this.style.display='none'"/>
                    <div class="photo-card-info">
                        <span class="photo-name" title="${photoName}">${photoName}</span>
                        <span class="photo-coord">${lat}, ${lng}</span>
                    </div>
                </div>
            `;
        });

        $gallery.html(html);

        // 確保 lightbox 存在
        if ($('#pv-photo-lightbox').length === 0) {
            $('body').append('<div id="pv-photo-lightbox" onclick="this.classList.remove(\'active\')"><img id="pv-lightbox-img" src="" /></div>');
        }
    },

    /**
     * 格式化工具
     */
    formatRoadWidth: function(width) {
        if (!width) return '-';
        try {
            const parsed = JSON.parse(width);
            if (parsed['路寬'] !== undefined) {
                return `${parsed['路寬']} | ${parsed['路況'] || ''}`;
            }
        } catch (e) { }
        return width;
    },

    formatBudget: function(budget) {
        if (budget === undefined || budget === null) return '-';
        return `${(budget / 10000).toLocaleString()} 萬`;
    },

    formatDate: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) { return dateString; }
    },

    /**
     * 建立地圖標記（不可拖曳）
     */
    createMarker: function(latlng, iconClass, popupContent) {
        const isSmall = (iconClass === 'range-marker-middle' || iconClass === 'range-marker-photo');
        const size = isSmall ? [14, 14] : [16, 16];
        const anchor = isSmall ? [7, 7] : [8, 8];

        const icon = L.divIcon({
            className: iconClass,
            iconSize: size,
            iconAnchor: anchor,
            popupAnchor: [0, -10]
        });

        const marker = L.marker(latlng, { icon: icon, draggable: false });
        if (popupContent) {
            const isPhoto = (iconClass === 'range-marker-photo');
            marker.bindPopup(popupContent, isPhoto ? { maxWidth: 450 } : { maxWidth: 250, minWidth: 100 });
        }
        return marker;
    },

    /**
     * 地圖定位（顯示拓寬範圍、起終點、中間點、街景照片標記）
     */
    locateProject: function(projectId) {
        const self = this;
        fetch(`/api/RoadProject/getPoints/${projectId}`)
        .then(response => response.json())
        .then(data => {
            self.projectLayer.clearLayers();
            const rangePoints = data.rangePoints || [];
            const photoPoints = data.photoPoints || [];

            if (rangePoints.length === 0 && photoPoints.length === 0) {
                return alert('此專案無座標資料');
            }

            const allCoords = [];

            // 拓寬範圍線/面
            if (rangePoints.length >= 3) {
                const coords = rangePoints.map(p => [p.latitude, p.longitude]);
                L.polygon(coords, { color: '#3b82f6', weight: 2, fillOpacity: 0.15 }).addTo(self.projectLayer);
                coords.forEach(c => allCoords.push(c));
            } else if (rangePoints.length === 2) {
                const coords = rangePoints.map(p => [p.latitude, p.longitude]);
                L.polyline(coords, { color: '#3b82f6', weight: 2 }).addTo(self.projectLayer);
                coords.forEach(c => allCoords.push(c));
            }

            // 起點標記
            if (rangePoints.length >= 1) {
                const sp = rangePoints[0];
                self.createMarker([sp.latitude, sp.longitude], 'range-marker-start', `
                    <div style="min-width:120px;">
                        <div style="font-weight:bold;color:#22c55e;margin-bottom:4px;">起點</div>
                        <div style="font-size:12px;color:#666;">
                            <div>緯度：${sp.latitude.toFixed(6)}</div>
                            <div>經度：${sp.longitude.toFixed(6)}</div>
                        </div>
                    </div>
                `).addTo(self.projectLayer);
            }

            // 終點標記
            if (rangePoints.length >= 2) {
                const ep = rangePoints[rangePoints.length - 1];
                self.createMarker([ep.latitude, ep.longitude], 'range-marker-end', `
                    <div style="min-width:120px;">
                        <div style="font-weight:bold;color:#ef4444;margin-bottom:4px;">終點</div>
                        <div style="font-size:12px;color:#666;">
                            <div>緯度：${ep.latitude.toFixed(6)}</div>
                            <div>經度：${ep.longitude.toFixed(6)}</div>
                        </div>
                    </div>
                `).addTo(self.projectLayer);
            }

            // 中間範圍點標記
            if (rangePoints.length > 2) {
                rangePoints.slice(1, -1).forEach(function(p, idx) {
                    self.createMarker([p.latitude, p.longitude], 'range-marker-middle', `
                        <div style="min-width:120px;">
                            <div style="font-weight:bold;color:#3b82f6;margin-bottom:4px;">範圍點 ${idx + 1}</div>
                            <div style="font-size:12px;color:#666;">
                                <div>緯度：${p.latitude.toFixed(6)}</div>
                                <div>經度：${p.longitude.toFixed(6)}</div>
                            </div>
                        </div>
                    `).addTo(self.projectLayer);
                });
            }

            // 街景照片標記
            photoPoints.forEach(function(p, index) {
                if (!p.latitude || !p.longitude) return;

                let photoName = '';
                let photoSrc = '';
                try {
                    const parsed = JSON.parse(p.url || '{}');
                    const existingUrl = parsed.url || '';
                    photoName = existingUrl.split('/').pop();
                    photoSrc = `/roadProject/${existingUrl}`;
                } catch(e) {
                    const existingUrl = p.url || '';
                    photoName = existingUrl.split('/').pop();
                    photoSrc = `/roadProject/${existingUrl}`;
                }

                const popupDiv = document.createElement('div');
                popupDiv.id = 'photoPopup';
                if (photoSrc) {
                    const img = document.createElement('img');
                    img.src = `${photoSrc}?v=${new Date().getTime()}`;
                    img.style.width = '450px';
                    img.style.height = '300px';
                    popupDiv.appendChild(img);
                }

                const marker = self.createMarker([p.latitude, p.longitude], 'range-marker-photo', popupDiv);
                marker.addTo(self.projectLayer);
                allCoords.push([p.latitude, p.longitude]);
            });

            // 自動縮放至所有點位
            if (allCoords.length > 1) {
                self.$indexMap.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
            } else if (allCoords.length === 1) {
                self.$indexMap.setView(allCoords[0], 17);
            }
        });
    },

    /**
     * 刪除專案 
     */
    deleteProject: function() {
        const self = this;
        const projectId = self.currentProject.id;
        if (!confirm('確定要刪除此專案嗎？此操作無法復原。')) return;

        showLoading('刪除中...', '#right-box');

        fetch(`/Admin/DeleteRoadProject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: projectId, projectId: self.currentProject.projectId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('已成功刪除');
                self.closeView();
                $(document).trigger('projectDeleted', { projectId: projectId });
            } else {
                alert(`刪除失敗：${result.message || '請稍後再試'}`);
            }
        })
        .catch(error => {
            console.error('刪除專案失敗:', error);
            alert(`刪除失敗：${error.message || '請稍後再試'}`);
        })
        .finally(() => {
            hideLoading('#right-box');
        });
    },

    /**
     * 開啟專案歷程 
     */
    openProjectHistory: function() {
        const self = this;
        const projectData = {
            id: self.currentProject.projectId || self.currentProject.id,
            name: self.currentProject.startEndLocation || self.currentProject.projectName,
            createDate: self.formatDate(self.currentProject.createTime),
            budget: self.formatBudget(self.currentProject.totalBudget),
            pm: self.currentProject.proposer,
            progress: 0,
            _raw: self.currentProject
        };
        ProcessBox.openProcessBox(projectData);
    },

    closeView: function() {
        this.currentProject = null;
        BoxManager.closeBox('right-box');
    },

    showLoading: function() {
        $('.project-view-container .view-content-area .view-section').hide();
        $('.project-view-container .view-content-area').prepend('<div class="view-loading"><i class="fa fa-spinner fa-spin fa-3x"></i><p>資料載入中...</p></div>');
    },

    showError: function(message) {
        $('.project-view-container .view-content-area .view-section').hide();
        $('.project-view-container .view-content-area').prepend(`<div class="view-error"><i class="fa fa-exclamation-circle fa-3x"></i><p>${message}</p></div>`);
    }
};

export default RoadProjectView;