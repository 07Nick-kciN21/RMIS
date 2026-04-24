import BoxManager from './box.js';
import ProcessView from './processView.js';
/**
 * 專案歷程詳情業務邏輯模組
 * 功能：顯示專案基本資訊、階段分頁切換、時間軸歷程紀錄、佐證文件下載
 */
const ProcessBox = {
    // 當前選中的專案資料
    currentProject: null,

    // 當前階段
    currentStage: 'stage1',

    // 歷程資料快取
    historyData: null,

    // 編輯模式
    isEditMode: false,
    editingRecord: null,

    // 狀態對照表
    step: {
        1: '爭取預算與前期規畫階段',
        2: '意願調查及用地取得階段',
        3: '設計與施工階段'
    },

    // 階段名稱對照表
    stageNames: {
        'stage1': '爭取預算與前期規畫階段',
        'stage2': '意願調查及用地取得階段',
        'stage3': '設計與施工階段'
    },

    // 階段對應 ProcessList 的 Key
    stageToProcessKey: {
        'stage1': 'process1List',
        'stage2': 'process2List',
        'stage3': 'process3List'
    },

    // 紀錄類型對照表（用於樣式判斷）
    recordTypes: {
        '重要里程碑': 'type-milestone',
        '會議紀錄': 'type-meeting',
        '公文核定': 'type-official',
        '進度說明': 'type-progress'
    },

    // 檔案圖示對照表
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
        'dwg': 'fa-file-o',
        'default': 'fa-file-o'
    },

    /**
     * 初始化歷程詳情模組
     */
    init: function() {
        const self = this;

        // 綁定階段分頁切換事件
        $(document).on('click', '.stage-tab', function() {
            const stageId = $(this).data('stage');
            self.switchStage(stageId);
        });

        // 綁定關閉按鈕事件
        $(document).on('click', '#page-process .btn-close-box', function() {
            self.closeProcessBox();
        });

        // 綁定新增紀錄按鈕事件
        $(document).on('click', '.btn-add-record', function() {
            self.openAddRecordForm();
        });

        // 綁定下載按鈕事件（事件委派，僅限按鈕）
        $(document).on('click', '#page-process .btn-download-file', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.file-list-item');
            const fileId = $item.data('file-id');
            const fileName = $item.find('.file-name').text();
            self.downloadFile(fileId, fileName);
        });

        // 綁定「更多...」按鈕點擊事件，開啟 processView
        $(document).on('click', '.btn-view-more', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.timeline-item');
            const recordId = $item.data('record-id');
            self.openRecordView(recordId);
        });

        // 綁定時間軸卡片點擊事件（整張卡片可點擊開啟詳情）
        $(document).on('click', '.timeline-card', function(e) {
            // 如果點擊的是附件區域或下載按鈕，不觸發
            if ($(e.target).closest('.record-attachments, .btn-download').length > 0) {
                return;
            }
            const $item = $(this).closest('.timeline-item');
            const recordId = $item.data('record-id');
            self.openRecordView(recordId);
        });

        // 初始化 Modal 事件
        self.initModalEvents();

        // 監聽紀錄刪除事件，刷新列表
        $(document).on('recordDeleted', function(e, data) {
            console.log('紀錄已刪除，刷新列表:', data);
            if (self.projectId) {
                self.fetchHistoryData(self.projectId);
            }
        });

        // 監聯紀錄編輯事件
        $(document).on('openEditRecord', function(e, data) {
            console.log('開啟編輯紀錄:', data);
            self.openEditRecordForm(data.record, data.stage);
        });

        console.log('ProcessBox 業務邏輯初始化完成');
    },

    /**
     * 開啟專案歷程詳情頁面
     * @param {Object} project - 專案資料物件
     */
    openProcessBox: function(project) {
        const self = this;

        if (!project || !project.id) {
            console.error('無效的專案資料');
            return;
        }
        console.log('開啟專案歷程詳情頁面，專案:', project);
        // 儲存當前專案
        self.currentProject = project;
        self.projectId = project.id;
        // 智慧判斷初始階段
        self.currentStage = self.determineInitialStage(project.step);

        // 開啟 Right-Box 頁面
        BoxManager.openRightBoxPage('page-process', '專案歷程');

        // 更新專案資訊區塊
        self.updateProjectInfo(project);

        // 更新階段分頁狀態
        self.updateStageTabs();

        // 從 API 載入歷程資料
        self.fetchHistoryData(self.projectId);
    },

    /**
     * 根據專案狀態判斷初始顯示的階段
     * @param {string} status - 專案狀態
     * @returns {string} - 階段 ID
     */
    determineInitialStage: function(step) {
        if (!step) return 'stage1';

        if (step == 1)
            return 'stage1';
        else if (step == 2)
            return 'stage2';
        else if (step == 3)
            return 'stage3';
        else
            return 'stage1';
    },

    /**
     * 更新專案資訊區塊
     * @param {Object} project - 專案資料
     */
    updateProjectInfo: function(project) {
        const self = this;

        console.log('更新專案資訊:', project);
        $('#process-no').text(project.id || '-');
        $('#process-title').text(project.name || '專案名稱');
        $('#process-create-date').text(project.createDate || '-');
        $('#process-budget').text(project.budget || '-');
        $('#process-pm').text(project.pm || '-');
        $('#process-status').text(self.step[project.step] || '-');

        // 更新進度圓環
        const progress = project.progress || 0;
        $('#process-progress-path').attr('stroke-dasharray', `${progress}, 100`);
        $('#process-progress-text').text(`${progress}%`);
    },

    /**
     * 更新階段分頁狀態
     */
    updateStageTabs: function() {
        const self = this;

        // 移除所有 active 狀態
        $('.stage-tab').removeClass('active');

        // 設定當前階段為 active
        $(`.stage-tab[data-stage="${self.currentStage}"]`).addClass('active');

        // 更新階段標題
        $('#current-stage-name').text(self.stageNames[self.currentStage] || '');
    },

    /**
     * 切換階段
     * @param {string} stageId - 階段 ID
     */
    switchStage: function(stageId) {
        const self = this;

        if (self.currentStage === stageId) return;

        self.currentStage = stageId;
        self.updateStageTabs();

        // 重新渲染時間軸
        if (self.historyData) {
            self.renderTimeline(self.historyData);
        }
    },

    /**
     * 從 API 載入歷程資料
     * @param {string|number} projectId - 專案 ID
     */
    fetchHistoryData: function(projectId) {
        const self = this;

        // 顯示載入中狀態
        $('#process-timeline').html(`
            <div class="timeline-loading" style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fa fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 10px;">資料載入中...</p>
            </div>
        `);

        // 呼叫 API 取得歷程資料
        fetch(`/api/RoadProject/GetProcessRecords/${projectId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API 回傳歷程資料:', data);

            // 轉換 API 資料格式為前端需要的格式
            const transformedData = self.transformApiData(data);

            // 快取資料
            self.historyData = transformedData;

            // 渲染時間軸
            self.renderTimeline(transformedData);
        })
        .catch(error => {
            console.error('載入歷程資料失敗:', error);
            $('#process-timeline').html(`
                <div class="timeline-error" style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fa fa-exclamation-circle fa-2x"></i>
                    <p style="margin-top: 10px;">載入失敗，請稍後再試</p>
                </div>
            `);
        });
    },

    /**
     * 將 API 回傳的資料格式轉換為前端 renderTimeline 需要的格式
     * API 格式: { projectId, process1List, process2List, process3List }
     * 前端格式: { stages: [{ id, title, status, records: [...] }] }
     * @param {Object} apiData - API 回傳的資料
     * @returns {Object} - 轉換後的資料
     */
    transformApiData: function(apiData) {
        const self = this;
        console.log('轉換 API 資料:', apiData);
        // 建立階段資料結構
        const stages = [
            {
                id: 'stage1',
                title: self.stageNames['stage1'],
                status: self.getStageStatus(apiData.process1List),
                records: self.transformRecords(apiData.process1List || [])
            },
            {
                id: 'stage2',
                title: self.stageNames['stage2'],
                status: self.getStageStatus(apiData.process2List),
                records: self.transformRecords(apiData.process2List || [])
            },
            {
                id: 'stage3',
                title: self.stageNames['stage3'],
                status: self.getStageStatus(apiData.process3List),
                records: self.transformRecords(apiData.process3List || [])
            }
        ];

        return { stages };
    },

    /**
     * 轉換紀錄列表格式
     * @param {Array} processList - ProcessRecordDTO 列表
     * @returns {Array} - 轉換後的紀錄列表
     */
    transformRecords: function(processList) {
        const self = this;

        return processList.map((record, index) => ({
            id: record.id || index + 1,
            processId: record.processId,
            date: self.formatDate(record.createdAt),
            type: record.recordType || '進度說明',
            title: record.recordTitle || '無標題',
            desc: record.currentStatus || '',
            // 轉換檔案格式
            files: (record.files || []).map(f => ({
                id: f.id,
                name: f.fileName,
                type: f.fileType,
                size: f.fileSize
            })),
            // 保留原始資料，供 processView 使用
            _raw: record
        }));
    },

    /**
     * 根據紀錄列表判斷階段狀態
     * @param {Array} processList - 紀錄列表
     * @returns {string} - 階段狀態 (completed/active/pending)
     */
    getStageStatus: function(processList) {
        if (!processList || processList.length === 0) {
            return 'pending';
        }
        // 可根據實際邏輯判斷是否完成
        return 'active';
    },

    /**
     * 格式化日期
     * @param {string} dateString - ISO 日期字串
     * @returns {string} - 格式化後的日期 (YYYY-MM-DD)
     */
    formatDate: function(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return dateString;
        }
    },

    /**
     * 渲染時間軸
     * @param {Object} data - 歷程資料
     */
    renderTimeline: function(data) {
        const self = this;
        const $timeline = $('#process-timeline');
        $timeline.empty();

        // 取得當前階段的紀錄
        const stages = data.stages || [];
        const currentStageData = stages.find(s => s.id === self.currentStage);
        const records = currentStageData?.records || [];

        if (records.length === 0) {
            $timeline.html(`
                <div class="timeline-empty" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fa fa-inbox fa-2x"></i>
                    <p style="margin-top: 10px;">本階段尚無歷程紀錄</p>
                </div>
            `);
            return;
        }

        // 添加垂直線
        $timeline.append('<div class="timeline-line"></div>');

        // 渲染每筆紀錄
        records.forEach((record, index) => {
            const $item = self.createTimelineItem(record, index);
            $timeline.append($item);
        });
    },

    /**
     * 建立時間軸項目 HTML
     * @param {Object} record - 紀錄資料
     * @param {number} index - 索引（用於動畫延遲）
     * @returns {jQuery} - jQuery 元素
     */
    createTimelineItem: function(record, index) {
        const self = this;

        // 取得類型樣式
        const typeClass = self.recordTypes[record.type] || 'type-milestone';

        // 建立附件列表 HTML
        let attachmentsHtml = '';
        if (record.files && record.files.length > 0) {
            const fileItems = record.files.map(file => {
                const ext = self.getFileExtension(file.name);
                const iconClass = self.fileIcons[ext] || self.fileIcons['default'];

                return `
                    <div class="file-list-item" data-file-id="${file.id || ''}">
                        <div class="file-info">
                            <i class="fa ${iconClass} file-icon"></i>
                            <span class="file-name">${self.escapeHtml(file.name)}</span>
                            <span class="file-size">(${file.size || '-'})</span>
                        </div>
                        <div class="file-actions">
                            <button type="button" class="btn-download-file" title="下載">
                                <img src="/svg/download.svg" alt="下載" />
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            attachmentsHtml = `
                <div class="record-attachments">
                    <h5 class="attachments-title">
                        <i class="fa fa-paperclip"></i> 佐證文件
                    </h5>
                    <div class="file-list">
                        ${fileItems}
                    </div>
                </div>
            `;
        }

        // 建立完整項目 HTML
        const html = `
            <div class="timeline-item" data-record-id="${record.id}" style="animation-delay: ${index * 0.05}s;">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                    <div class="card-header">
                        <div class="card-title-group">
                            <span class="record-type ${typeClass}">${self.escapeHtml(record.type)}</span>
                            <h4 class="record-title">${self.escapeHtml(record.title)}</h4>
                        </div>
                        <div class="record-date">
                            <i class="fa fa-calendar"></i> ${record.date || '-'}
                        </div>
                    </div>
                    <div class="record-desc-wrapper">
                        <p class="record-desc">${self.escapeHtml(record.desc)}</p>
                        <button type="button" class="btn-view-more" title="查看完整內容">
                            更多... <i class="fa fa-angle-right"></i>
                        </button>
                    </div>
                    ${attachmentsHtml}
                </div>
            </div>
        `;

        return $(html);
    },

    /**
     * 取得檔案副檔名
     * @param {string} fileName - 檔案名稱
     * @returns {string} - 副檔名（小寫）
     */
    getFileExtension: function(fileName) {
        if (!fileName) return 'default';
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : 'default';
    },

    /**
     * HTML 跳脫處理
     * @param {string} text - 原始文字
     * @returns {string} - 跳脫後的文字
     */
    escapeHtml: function(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * 下載檔案
     * @param {string} fileId - 檔案 ID
     * @param {string} fileName - 檔案名稱
     */
    downloadFile: function(fileId, fileName) {
        const self = this;

        console.log('下載檔案:', fileId, fileName);

        const downloadUrl = `/api/RoadProject/DownloadProcessFile/${fileId}`;

        // 使用 fetch 檢查並下載檔案
        fetch(downloadUrl, { method: 'GET' })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('檔案不存在');
                    }
                    throw new Error(`下載失敗 (${response.status})`);
                }
                return response.blob();
            })
            .then(blob => {
                // 建立下載連結
                const url = window.URL.createObjectURL(blob);
                const $link = $('<a>')
                    .attr('href', url)
                    .attr('download', fileName || 'download')
                    .css('display', 'none')
                    .appendTo('body');
                $link[0].click();
                $link.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('下載檔案失敗:', error);
                alert(`下載失敗：${error.message}`);
            });
    },

    /**
     * 開啟新增紀錄表單 Modal
     */
    openAddRecordForm: function() {
        const self = this;

        // 重置編輯模式
        self.isEditMode = false;
        self.editingRecord = null;

        console.log('開啟新增紀錄表單');
        console.log('專案:', self.currentProject?.id);
        console.log('階段:', self.currentStage);

        // 更新 Modal 標題
        const stageTitle = self.stageNames[self.currentStage] || '新增歷程紀錄';
        $('#modal-stage-title').text(`新增紀錄 - ${stageTitle}`);

        // 隱藏所有表單，顯示對應階段的表單
        $('.process-form').addClass('hidden');
        $(`#form-${self.currentStage}`).removeClass('hidden');

        // 重置表單
        $(`#form-${self.currentStage}`)[0]?.reset();

        // 清空檔案列表
        self.clearFileList(self.currentStage);
        // ✅ 自動填入專案資訊
        self.prefillProjectInfo();
        // 顯示 Modal
        $('#process-add-modal').removeClass('hidden');
    },

    /**
     * 開啟編輯紀錄表單 Modal
     * @param {Object} record - 紀錄資料
     * @param {string} stage - 階段 (Process1/Process2/Process3 或 stage1/stage2/stage3)
     */
    openEditRecordForm: function(record, stage) {
        const self = this;

        // 設定編輯模式
        self.isEditMode = true;
        self.editingRecord = record;

        // 轉換階段格式
        let stageId = stage;
        if (stage.startsWith('Process')) {
            stageId = stage.replace('Process', 'stage');
        }
        self.currentStage = stageId;

        console.log('開啟編輯紀錄表單');
        console.log('紀錄:', record);
        console.log('階段:', stageId);

        // 更新 Modal 標題
        const stageTitle = self.stageNames[stageId] || '編輯歷程紀錄';
        $('#modal-stage-title').text(`編輯紀錄 - ${stageTitle}`);

        // 隱藏所有表單，顯示對應階段的表單
        $('.process-form').addClass('hidden');
        $(`#form-${stageId}`).removeClass('hidden');

        // 重置表單
        $(`#form-${stageId}`)[0]?.reset();

        // 清空檔案列表
        self.clearFileList(stageId);

        // 填入現有資料
        self.fillEditFormData(record, stageId);

        // 顯示 Modal
        $('#process-add-modal').removeClass('hidden');
    },

    /**
     * 填入編輯表單資料
     * @param {Object} record - 紀錄資料
     * @param {string} stageId - 階段 ID (stage1/stage2/stage3)
     */
    fillEditFormData: function(record, stageId) {
        const self = this;
        const stagePrefix = stageId.replace('stage', 's');

        // 共用欄位
        $(`#${stagePrefix}-district`).val(record.district || '');
        $(`#${stagePrefix}-record-type`).val(record.recordType || '');
        $(`#${stagePrefix}-record-title`).val(record.recordTitle || '');
        $(`#${stagePrefix}-project-name`).val(record.projectName || '');
        $(`#${stagePrefix}-execution-unit`).val(record.executionUnit || '');
        $(`#${stagePrefix}-previous-status`).val(record.previousMeetingStatus || '');
        $(`#${stagePrefix}-previous-resolution`).val(record.previousMeetingResolution || '');
        $(`#${stagePrefix}-current-status`).val(record.currentStatus || '');
        $(`#${stagePrefix}-current-resolution`).val(record.currentMeetingResolution || '');

        // 根據階段填入特定欄位
        if (stageId === 'stage1' || stageId === 'stage2') {
            $(`#${stagePrefix}-construction-unit`).val(record.constructionUnit || '');
        }

        if (stageId === 'stage2') {
            $(`#${stagePrefix}-category`).val(record.category || '');
        }

        if (stageId === 'stage3') {
            $(`#${stagePrefix}-budget`).val(record.budgetFiscalYearApprovedAmount || '');
            $(`#${stagePrefix}-contract-type`).val(record.contractType || '');
            $(`#${stagePrefix}-period`).val(record.constructionPeriod || '');
            // 日期欄位需要特殊處理（可能包含「預計」或「實際」前綴）
            self.fillDateField(`${stagePrefix}-announcement`, record.announcementCommencementDate);
            self.fillDateField(`${stagePrefix}-award`, record.awardCompletionDate);
        }
    },

    /**
     * 填入日期欄位（處理「預計 113.11.8」格式）
     * @param {string} prefix - 欄位前綴 (如 s3-announcement 或 s3-award)
     * @param {string} value - 日期值
     */
    fillDateField: function(prefix, value) {
        if (!value) return;

        // 解析「預計 113.11.8」或「實際 113.11.8」格式
        const match = value.match(/^(預計|實際)?\s*(\d+\.\d+\.\d+)?$/);
        if (match) {
            if (match[1]) {
                $(`#${prefix}-type`).val(match[1]);
            }
            if (match[2]) {
                // 將民國年轉換為西元年 yyyy-MM-dd 格式
                const parts = match[2].split('.');
                if (parts.length === 3) {
                    const year = parseInt(parts[0]) + 1911;
                    const month = parts[1].padStart(2, '0');
                    const day = parts[2].padStart(2, '0');
                    $(`#${prefix}-date`).val(`${year}-${month}-${day}`);
                }
            }
        }
    },
    /**
     * 自動填入專案資訊到表單
     * ✅ 新增函數：填入 project_name 和 district
     */
    prefillProjectInfo: function() {
        const self = this;
        
        if (!self.currentProject) {
            console.warn('無專案資料可填入');
            return;
        }

        // 取得專案名稱（工程名稱）
        const projectName = self.currentProject.name || 
                            self.currentProject._raw?.startEndLocation || 
                            '';

        // 取得行政區
        const district = self.currentProject._raw?.administrativeDistrict || 
                        self.currentProject.district || 
                        '';

        console.log('自動填入 - 工程名稱:', projectName);
        console.log('自動填入 - 行政區:', district);

        // 取得當前階段的表單前綴 (s1, s2, s3)
        const stagePrefix = self.currentStage.replace('stage', 's');

        // 填入工程名稱 (readonly 欄位)
        $(`#${stagePrefix}-project-name`).val(projectName);

        // 填入行政區 (select 欄位)
        const $districtSelect = $(`#${stagePrefix}-district`);
        if ($districtSelect.length > 0 && district) {
            // 設定選中的值
            $districtSelect.val(district);
            
            // 如果值不存在於選項中，嘗試加入
            if ($districtSelect.val() !== district) {
                console.warn(`行政區 "${district}" 不在選項中`);
            }
        }
    },
    /**
     * 關閉新增/編輯紀錄 Modal
     */
    closeAddRecordModal: function() {
        const self = this;

        $('#process-add-modal').addClass('hidden');

        // 重置所有表單
        $('.process-form').each(function() {
            this.reset();
        });

        // 重置編輯模式
        self.isEditMode = false;
        self.editingRecord = null;
    },

    /**
     * 清空檔案列表
     * @param {string} stage - 階段 ID
     */
    clearFileList: function(stage) {
        const stageNum = stage.replace('stage', 's');
        $(`#${stageNum}-file-list`).empty();
    },

    /**
     * 處理檔案選擇
     * @param {Event} e - change 事件
     * @param {string} stage - 階段 ID
     */
    handleFileSelect: function(e, stage) {
        const self = this;
        const files = e.target.files;
        const stageNum = stage.replace('stage', 's');
        const $fileList = $(`#${stageNum}-file-list`);

        Array.from(files).forEach((file, index) => {
            const fileId = `${stageNum}-file-${Date.now()}-${index}`;
            const fileSize = self.formatFileSize(file.size);
            const iconClass = self.getFileIconClass(file.name);

            const $item = $(`
                <div class="file-list-item" data-file-id="${fileId}">
                    <div class="file-info">
                        <i class="fa ${iconClass} file-icon"></i>
                        <span class="file-name">${self.escapeHtml(file.name)}</span>
                        <span class="file-size">(${fileSize})</span>
                    </div>
                    <button type="button" class="btn-remove-file" data-file-id="${fileId}">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            `);

            $fileList.append($item);
        });
    },

    /**
     * 移除檔案項目
     * @param {string} fileId - 檔案 ID
     */
    removeFileItem: function(fileId) {
        $(`.file-list-item[data-file-id="${fileId}"]`).remove();
    },

    /**
     * 格式化檔案大小
     * @param {number} bytes - 位元組數
     * @returns {string} - 格式化後的大小
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * 根據檔案名稱取得圖示類別
     * @param {string} fileName - 檔案名稱
     * @returns {string} - Font Awesome 類別
     */
    getFileIconClass: function(fileName) {
        const ext = this.getFileExtension(fileName);
        return this.fileIcons[ext] || this.fileIcons['default'];
    },

    /**
     * 提交新增/編輯紀錄表單
     */
    submitAddRecord: function() {
        const self = this;
        const $form = $(`#form-${self.currentStage}`);

        // 驗證必填欄位
        const isValid = $form[0]?.checkValidity();
        if (!isValid) {
            $form[0]?.reportValidity();
            return;
        }

        // 收集表單資料
        const formData = new FormData($form[0]);

        // 根據當前階段決定 API 端點
        const stageNum = self.currentStage.replace('stage', '');
        const isEdit = self.isEditMode && self.editingRecord;
        const apiEndpoint = isEdit
            ? `/api/RoadProject/UpdateProcess${stageNum}`
            : `/api/RoadProject/AddProcess${stageNum}`;
        const httpMethod = isEdit ? 'PUT' : 'POST';

        // 建立基礎資料物件（三個階段共用的欄位）
        const data = {
            ProjectId: self.projectId,
            District: formData.get('district'),
            RecordType: formData.get('record_type'),
            RecordTitle: formData.get('record_title'),
            ProjectName: formData.get('project_name') || self.currentProject?.name,
            ExecutionUnit: formData.get('execution_unit'),
            PreviousMeetingStatus: formData.get('previous_meeting_status'),
            PreviousMeetingResolution: formData.get('previous_meeting_resolution'),
            CurrentStatus: formData.get('current_status'),
            CurrentMeetingResolution: formData.get('current_meeting_resolution')
        };

        // 如果是編輯模式，加入 Id 和 ProcessId
        if (isEdit) {
            data.Id = self.editingRecord.id;
            data.ProcessId = self.editingRecord.processId;
        } else {
            data.CreatedAt = new Date().toISOString();
        }

        // 根據不同階段添加特定欄位
        switch (self.currentStage) {
            case 'stage1':
                // 階段1 特有欄位
                data.ConstructionUnit = formData.get('construction_unit');
                break;

            case 'stage2':
                // 階段2 特有欄位
                data.ConstructionUnit = formData.get('construction_unit');
                data.Category = formData.get('category');
                break;

            case 'stage3':
                // 階段3 特有欄位 - 工程資訊
                data.BudgetFiscalYearApprovedAmount = formData.get('budget_fiscal_year_approved_amount');
                data.ContractType = formData.get('contract_type');
                data.ConstructionPeriod = formData.get('construction_period');

                // 上網公告預計/實際開工 - 組合成字串 (例如: "預計 113.11.8")
                data.AnnouncementCommencementDate = self.formatDateField(
                    formData.get('announcement_commencement_type'),
                    formData.get('announcement_commencement_date_value')
                );

                // 決標日期預計/實際完工 - 組合成字串 (例如: "實際 113.11.8")
                data.AwardCompletionDate = self.formatDateField(
                    formData.get('award_completion_type'),
                    formData.get('award_completion_date_value')
                );
                break;
        }

        // 取得檔案列表（複製到 Array，避免表單 reset 後被清空）
        const stagePrefix = self.currentStage.replace('stage', 's');
        const fileInput = document.getElementById(`${stagePrefix}-files`);
        const filesArray = fileInput?.files ? Array.from(fileInput.files) : [];

        console.log(isEdit ? '編輯模式' : '新增模式');
        console.log('提交表單資料:', data);
        console.log('API 端點:', apiEndpoint);
        console.log('HTTP 方法:', httpMethod);
        console.log('當前階段:', self.currentStage);
        console.log('檔案數量:', filesArray.length);

        // 確認對話框
        if (!confirm(isEdit ? '確定要更新此紀錄嗎？' : '確定要新增此紀錄嗎？')) return;

        // 關閉 Modal
        self.closeAddRecordModal();
        showLoading(isEdit ? '更新中...' : '新增中...');

        // 呼叫 API
        fetch(apiEndpoint, {
            method: httpMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            console.log(isEdit ? '編輯結果:' : '新增結果:', result);
            if (result.success) {
                const processId = result.processId;
                console.log('Process ID:', processId);

                // 如果有檔案，上傳檔案
                if (filesArray.length > 0) {
                    self.uploadProcessFiles(processId, filesArray)
                        .then(() => {
                            console.log('檔案上傳完成');
                            alert(isEdit ? '紀錄更新成功！' : '紀錄新增成功！');
                            self.fetchHistoryData(self.projectId);
                            if (isEdit) {
                                $(document).trigger('recordUpdated', { recordId: data.Id, processNum: stageNum });
                            }
                        })
                        .catch(err => {
                            console.error('檔案上傳失敗:', err);
                            alert(isEdit ? '紀錄已更新，但部分檔案上傳失敗' : '紀錄已建立，但部分檔案上傳失敗');
                            self.fetchHistoryData(self.projectId);
                            if (isEdit) {
                                $(document).trigger('recordUpdated', { recordId: data.Id, processNum: stageNum });
                            }
                        })
                        .finally(() => hideLoading());
                } else {
                    alert(isEdit ? '紀錄更新成功！' : '紀錄新增成功！');
                    self.fetchHistoryData(self.projectId);
                    if (isEdit) {
                        $(document).trigger('recordUpdated', { recordId: data.Id, processNum: stageNum });
                    }
                    hideLoading();
                }

                // 重置編輯模式
                self.isEditMode = false;
                self.editingRecord = null;
            } else {
                alert(`${isEdit ? '編輯' : '新增'}失敗: ${result.message}`);
                hideLoading();
            }
        })
        .catch(err => {
            console.error(isEdit ? '編輯紀錄失敗:' : '新增紀錄失敗:', err);
            alert(`${isEdit ? '編輯' : '新增'}紀錄失敗，請稍後再試`);
            hideLoading();
        });
    },

    /**
     * 上傳多個檔案到指定的 Process
     * @param {number} processId - Process ID
     * @param {FileList} files - 檔案列表
     * @returns {Promise}
     */
    uploadProcessFiles: function(processId, files) {
        const uploadPromises = Array.from(files).map(file => {
            const formData = new FormData();
            formData.append('processId', processId);
            formData.append('file', file);

            return fetch('/api/RoadProject/UploadProcessFile', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(result => {
                console.log(`檔案 ${file.name} 上傳結果:`, result);
                return result;
            });
        });

        return Promise.all(uploadPromises);
    },

    /**
     * 格式化日期欄位
     * 將 type (預計/實際) 和 date (yyyy-MM-dd) 組合成民國年格式字串
     * @param {string} type - 預計/實際/空白
     * @param {string} dateValue - yyyy-MM-dd 格式的日期
     * @returns {string} - 例如 "預計 113.11.8" 或 "113.11.8"
     */
    formatDateField: function(type, dateValue) {
        if (!dateValue) return '';
        
        // 將 yyyy-MM-dd 轉換成民國年 yyy.M.d 格式
        const date = new Date(dateValue);
        const rocYear = date.getFullYear() - 1911;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const rocDateStr = `${rocYear}.${month}.${day}`;
        
        // 如果有選擇類型，加上前綴
        if (type && type !== '') {
            return `${type} ${rocDateStr}`;
        }
        
        return rocDateStr;
    },

    /**
     * 初始化 Modal 事件（在 init 中呼叫）
     */
    initModalEvents: function() {
        const self = this;

        // 關閉按鈕
        $(document).on('click', '#btn-close-add-modal, #btn-cancel-add', function() {
            self.closeAddRecordModal();
        });

        // 點擊背景關閉
        $(document).on('click', '.process-modal-backdrop', function() {
            self.closeAddRecordModal();
        });

        // 提交按鈕
        $(document).on('click', '#btn-submit-add', function() {
            self.submitAddRecord();
        });

        // 檔案選擇事件
        $(document).on('change', '.file-input', function(e) {
            const stage = $(this).closest('.process-form').data('stage');
            self.handleFileSelect(e, stage);
        });

        // 移除檔案按鈕
        $(document).on('click', '.btn-remove-file', function(e) {
            e.stopPropagation();
            const fileId = $(this).data('file-id');
            self.removeFileItem(fileId);
        });

        // 拖曳上傳效果（限定在歷程 modal 內）
        $(document).on('dragover', '#process-add-modal .file-upload-area', function(e) {
            e.preventDefault();
            $(this).addClass('dragover');
        });

        $(document).on('dragleave', '#process-add-modal .file-upload-area', function(e) {
            e.preventDefault();
            $(this).removeClass('dragover');
        });

        $(document).on('drop', '#process-add-modal .file-upload-area', function(e) {
            e.preventDefault();
            $(this).removeClass('dragover');
            const files = e.originalEvent.dataTransfer.files;
            const $input = $(this).find('.file-input');
            $input[0].files = files;
            $input.trigger('change');
        });

        console.log('Modal 事件初始化完成');
    },

    /**
     * 開啟單筆紀錄檢視頁面
     * @param {number|string} recordId - 紀錄 ID
     */
    openRecordView: function(recordId) {
        const self = this;

        console.log('開啟紀錄檢視, ID:', recordId);

        // 從快取中找到該筆紀錄
        const record = self.getRecordById(recordId);
        
        if (!record) {
            console.error('找不到紀錄:', recordId);
            return;
        }

        // 取得當前階段對應的 ProcessType
        const processType = self.currentStage.replace('stage', 'Process');
        ProcessView.openView(record._raw || record, self.currentProject, processType);
    },

    /**
     * 根據 ID 從快取中取得紀錄
     * @param {number|string} recordId - 紀錄 ID
     * @returns {Object|null} - 紀錄資料
     */
    getRecordById: function(recordId) {
        const self = this;

        if (!self.historyData || !self.historyData.stages) {
            return null;
        }

        // 在當前階段中尋找
        const currentStageData = self.historyData.stages.find(s => s.id === self.currentStage);
        if (currentStageData && currentStageData.records) {
            const record = currentStageData.records.find(r => r.id == recordId);
            if (record) return record;
        }

        // 如果當前階段找不到，搜尋所有階段
        for (const stage of self.historyData.stages) {
            if (stage.records) {
                const record = stage.records.find(r => r.id == recordId);
                if (record) return record;
            }
        }

        return null;
    },

    /**
     * 關閉歷程詳情頁面
     */
    closeProcessBox: function() {
        const self = this;

        // 清空資料
        self.currentProject = null;
        self.historyData = null;
        self.currentStage = 'stage1';

        // 關閉 Right-Box
        BoxManager.closeRightBox();

        // 觸發自定義事件（供其他模組監聽）
        $(document).trigger('processBoxClosed');
    },

    /**
     * 刷新當前歷程資料
     */
    refresh: function() {
        const self = this;

        if (self.currentProject) {
            self.fetchHistoryData(self.projectId);
        }
    }
};

export default ProcessBox;