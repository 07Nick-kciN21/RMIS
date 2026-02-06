import BoxManager from './box.js';
import ProcessBox from './processBox.js';
import { Map } from './map_test.js';
import RoadProjectEdit from './roadProjectEdit.js';

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

    // 階段對照表 
    stageNames: {
        '1': '爭取預算與前期規畫階段',
        '2': '意願調查及用地取得階段',
        '3': '設計與施工階段'
    },

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
            if (self.currentProject) {
                RoadProjectEdit.openEdit(self.currentProject);
            }
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

        // 更新標題與路徑導航 [cite: 1, 2, 3]
        const title = project.startEndLocation || project.projectName || '道路專案';
        $('#pv-title').text(title);
        $('#pv-district').text(project.administrativeDistrict || '-');

        // 更新基本資訊 [cite: 1, 7, 8, 9, 10, 11, 12]
        $('#pv-project-id').text(project.projectId || project.id || '-');
        this.refreshSpanField('pv-proposer', project.proposer);
        this.refreshSpanField('pv-admin-district', project.administrativeDistrict);
        $('#pv-create-date').text(self.formatDate(project.createTime));
        $('#pv-location').text(project.startEndLocation || '-');

        // 更新階段與道路資訊 [cite: 1, 15, 16, 17]
        $('#pv-stage-badge').text(self.stageNames[project.step] || `階段 ${project.step}`);
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
     * 地圖定位 
     */
    locateProject: function(projectId) {
        const self = this;
        fetch(`/api/MapAPI/GetPointsByProjectId?projectId=${projectId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            self.projectLayer.clearLayers();
            const rangePoints = data['points']['rangePoints'] || [];
            if (rangePoints.length === 0) return alert('此專案無座標資料');

            const coords = rangePoints.map(p => [p.latitude, p.longitude]);
            const polygon = L.polygon(coords, { color: 'red' }).addTo(self.projectLayer);
            self.$indexMap.fitBounds(polygon.getBounds(), { padding: [50, 50] });
        });
    },

    /**
     * 刪除專案 
     */
    deleteProject: function() {
        const self = this;
        const projectId = self.currentProject.id;
        if (!confirm(`確定要刪除嗎？`)) return;

        fetch(`/Admin/DeleteRoadProject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: projectId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('已成功刪除');
                self.closeView();
                $(document).trigger('projectDeleted', { projectId: projectId });
            }
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
            step: self.currentProject.step,
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