import BoxManager from './box.js';

/**
 * 單筆歷程紀錄檢視模組
 * 功能：顯示單筆歷程紀錄的完整詳細資訊、編輯、刪除
 */
const ProcessView = {
    // 當前檢視的紀錄資料
    currentRecord: null,

    // 當前專案資料
    currentProject: null,

    // 當前階段
    currentStage: null,

    // 當前 Process 編號 (1, 2, 3)
    currentProcessNum: null,

    // 紀錄類型對照表（用於樣式判斷）
    recordTypes: {
        '重要里程碑': 'type-milestone',
        '會議紀錄': 'type-meeting',
        '公文核定': 'type-official',
        '進度說明': 'type-progress'
    },

    // 階段名稱對照表
    stageNames: {
        'stage1': '爭取預算與前期規畫階段',
        'stage2': '意願調查及用地取得階段',
        'stage3': '設計與施工階段',
        'Process1': '爭取預算與前期規畫階段',
        'Process2': '意願調查及用地取得階段',
        'Process3': '設計與施工階段'
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
        'default': 'fa-file-o'
    },

    /**
     * 初始化檢視模組
     */
    init: function() {
        const self = this;

        // 綁定返回按鈕事件
        $(document).on('click', '#btn-back-to-process, #btn-back-to-list', function() {
            self.closeView();
        });

        // 綁定編輯按鈕事件
        $(document).on('click', '#btn-edit-record', function() {
            self.openEditForm();
        });

        // 綁定刪除按鈕事件
        $(document).on('click', '#btn-delete-record', function() {
            self.openDeleteConfirm();
        });

        // 綁定刪除確認 Modal 事件
        $(document).on('click', '#btn-close-delete-modal, #btn-cancel-delete', function() {
            self.closeDeleteConfirm();
        });

        $(document).on('click', '#btn-confirm-delete', function() {
            self.confirmDelete();
        });

        // 綁定附件下載事件
        $(document).on('click', '#page-process-view .btn-download-file', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.file-list-item');
            const fileId = $item.data('file-id');
            const fileName = $item.find('.file-name').text();
            self.downloadFile(fileId, fileName);
        });

        // 綁定附件刪除事件
        $(document).on('click', '#page-process-view .btn-delete-file', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.file-list-item');
            const fileId = $item.data('file-id');
            const fileName = $item.find('.file-name').text();
            self.confirmDeleteFile(fileId, fileName);
        });

        // 監聽紀錄更新事件，刷新 ProcessView
        $(document).on('recordUpdated', function(e, data) {
            console.log('紀錄已更新，刷新 ProcessView:', data);
            if (self.currentRecord && self.currentRecord.id === data.recordId) {
                self.fetchRecordData(data.recordId, data.processNum);
            }
        });

        console.log('ProcessView 模組初始化完成');
    },

    /**
     * 開啟檢視頁面（從 API 取得完整資料）
     * @param {Object} record - 紀錄基本資料（需包含 id）
     * @param {Object} project - 專案資料
     * @param {string} stage - 階段 ID (stage1/stage2/stage3 或 Process1/Process2/Process3)
     */
    openView: function(record, project, stage) {
        const self = this;
        console.log('開啟檢視頁面:', record, project, stage);
        if (!record || !record.id) {
            console.error('無效的紀錄資料，缺少 ID');
            return;
        }

        console.log('開啟紀錄檢視:', record);
        console.log('專案:', project);
        console.log('階段:', stage);

        // 儲存當前資料
        self.currentProject = project;
        self.currentStage = stage;

        // 取得 Process 編號 (1, 2, 3)
        const processNum = self.getProcessNumber(stage);

        // 開啟頁面並顯示載入中
        BoxManager.openRightBoxPage('page-process-view', '紀錄詳情');
        self.showLoading();

        // 從 API 取得完整資料
        self.fetchRecordData(record.id, processNum);
    },

    /**
     * 從階段名稱取得 Process 編號
     * @param {string} stage - 階段名稱
     * @returns {string} - Process 編號 (1, 2, 3)
     */
    getProcessNumber: function(stage) {
        if (!stage) return '1';
        
        // 處理 Process1, Process2, Process3 格式
        if (stage.startsWith('Process')) {
            return stage.replace('Process', '');
        }
        
        // 處理 stage1, stage2, stage3 格式
        if (stage.startsWith('stage')) {
            return stage.replace('stage', '');
        }

        return '1';
    },

    /**
     * 從 API 載入紀錄資料
     * @param {number} recordId - 紀錄 ID
     * @param {string} processNum - Process 編號 (1, 2, 3)
     */
    fetchRecordData: function(recordId, processNum) {
        const self = this;

        const apiEndpoint = `/api/RoadProject/GetProcess${processNum}/${recordId}`;
        console.log('呼叫 API:', apiEndpoint);

        fetch(apiEndpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API 回傳紀錄資料:', data);

            // 儲存完整資料
            self.currentRecord = data;
            self.currentProcessNum = processNum;

            // 取得佐證文件
            if (data.processId) {
                return self.fetchProcessFiles(data.processId)
                    .then(files => {
                        data.files = files;
                        return data;
                    });
            }
            return data;
        })
        .then(data => {
            // 取得修改歷程記錄
            if (data.processId) {
                return self.fetchEditLogs(data.processId)
                    .then(logs => {
                        data.editLogs = logs;
                        return data;
                    });
            }
            return data;
        })
        .then(data => {
            // 渲染頁面
            self.renderView(data, self.currentProject, self.currentStage);
        })
        .catch(error => {
            console.error('載入紀錄失敗:', error);
            self.showError('載入失敗，請稍後再試');
        });
    },

    /**
     * 從 API 取得佐證文件列表
     * @param {string} processId - Process GUID
     * @returns {Promise<Array>} - 檔案列表
     */
    fetchProcessFiles: function(processId) {
        return fetch(`/api/RoadProject/GetProcessFiles/${processId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (!response.ok) {
                console.warn('取得佐證文件失敗:', response.status);
                return [];
            }
            return response.json();
        })
        .then(files => {
            console.log('佐證文件:', files);
            // 轉換欄位名稱以符合前端格式
            return files.map(f => ({
                id: f.id,
                name: f.fileName,
                size: f.fileSize,
                type: f.fileType
            }));
        })
        .catch(error => {
            console.error('取得佐證文件錯誤:', error);
            return [];
        });
    },

    /**
     * 從 API 取得修改歷程記錄
     * @param {string} processId - Process GUID
     * @returns {Promise<Array>} - 歷程記錄列表
     */
    fetchEditLogs: function(processId) {
        return fetch(`/api/RoadProject/GetProcessEditLogs/${processId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => {
            if (!response.ok) return [];
            return response.json();
        })
        .catch(error => {
            console.error('取得修改歷程失敗:', error);
            return [];
        });
    },

    /**
     * 從 API 載入並開啟檢視頁面（透過 ID 直接開啟）
     * @param {number} recordId - 紀錄 ID
     * @param {string} processType - Process 類型 (Process1/Process2/Process3 或 1/2/3)
     * @param {Object} project - 專案資料
     */
    openViewById: function(recordId, processType, project) {
        const self = this;

        // 儲存專案資料
        self.currentProject = project;
        self.currentStage = processType;

        // 取得 Process 編號
        const processNum = self.getProcessNumber(processType);

        // 顯示載入中
        BoxManager.openRightBoxPage('page-process-view', '紀錄詳情');
        self.showLoading();

        // 從 API 取得資料
        self.fetchRecordData(recordId, processNum);
    },

    /**
     * 顯示載入中狀態
     */
    showLoading: function() {

        $('.view-content-area .view-section').hide();

        if ($('.view-content-area .view-loading').length === 0) {
            $('.view-content-area').prepend(`
                <div class="view-loading" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #94a3b8;">
                    <i class="fa fa-spinner fa-spin fa-3x"></i>
                    <p style="margin-top: 16px;">資料載入中...</p>
                </div>
            `);
        } else {
            $('.view-content-area .view-loading').show();
        }
    },

    /**
     * 顯示錯誤狀態
     * @param {string} message - 錯誤訊息
     */
    showError: function(message) {
        // 隱藏所有內容區塊
        $('.view-content-area .view-section').hide();
        
        // 移除 loading
        $('.view-content-area .view-loading').remove();
        
        // 如果錯誤元素不存在，則插入
        if ($('.view-content-area .view-error').length === 0) {
            $('.view-content-area').prepend(`
                <div class="view-error" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #ef4444;">
                    <i class="fa fa-exclamation-circle fa-3x"></i>
                    <p style="margin-top: 16px;">${this.escapeHtml(message)}</p>
                </div>
            `);
        } else {
            $('.view-content-area .view-error p').text(message);
            $('.view-content-area .view-error').show();
        }
    },

    /**
     * 渲染檢視頁面內容
     * @param {Object} record - 紀錄資料
     * @param {Object} project - 專案資料
     * @param {string} stage - 階段
     */
    renderView: function(record, project, stage) {
        const self = this;

        // ✅ 移除 loading，顯示內容區塊
        $('.view-content-area .view-loading').remove();
        $('.view-content-area .view-error').remove();
        $('.view-content-area .view-section').show();

        // 更新麵包屑
        $('#view-project-name').text(project?.name || '專案');
        $('#view-stage-name').text(self.stageNames[stage] || stage);

        // 更新標題
        $('#view-record-title').text(record.recordTitle || record.title || '無標題');

        // 更新基本資訊
        self.renderBasicInfo(record);

        // 更新前次會議辦理情形
        $('#view-previous-status').text(record.previousMeetingStatus || '尚無資料');
        $('#view-previous-resolution').text(record.previousMeetingResolution || '尚無資料');

        // 更新本次會議辦理情形
        $('#view-current-meeting-status').text(record.currentStatus || '尚無資料');
        $('#view-current-resolution').text(record.currentMeetingResolution || '尚無資料');

        // 更新附件列表
        self.renderAttachments(record.files || record.attachments || []);

        // 更新修改歷程
        self.renderHistory(record);
    },

    /**
     * 渲染基本資訊區塊
     * @param {Object} record - 紀錄資料
     */
    renderBasicInfo: function(record) {
        const self = this;

        // 紀錄類型
        const recordType = record.recordType || record.type || '進度說明';
        const typeClass = self.recordTypes[recordType] || 'type-progress';
        $('#view-record-type')
            .text(recordType)
            .removeClass('type-milestone type-meeting type-official type-progress')
            .addClass(typeClass);

        // 建立日期
        $('#view-created-at').text(self.formatDate(record.createdAt));

        // 區域
        $('#view-district').text(record.district || '-');

        // 執行單位
        $('#view-execution-unit').text(record.executionUnit || '-');

        // 根據階段顯示不同欄位
        const processNum = self.currentProcessNum || self.getProcessNumber(self.currentStage);

        if (processNum === '3') {
            // Stage 3: 隱藏施工單位，顯示工程資訊區塊
            $('#info-construction-unit').addClass('hidden');
            $('#info-category').addClass('hidden');
            $('#section-construction-info').removeClass('hidden');

            // 填入 Stage 3 專屬欄位
            $('#view-budget-approved').text(record.budgetFiscalYearApprovedAmount || '-');
            $('#view-contract-type').text(record.contractType || '-');
            $('#view-construction-period').text(record.constructionPeriod || '-');
            $('#view-announcement-date').text(record.announcementCommencementDate || '-');
            $('#view-award-date').text(record.awardCompletionDate || '-');
        } else if (processNum === '2') {
            // Stage 2: 顯示施工單位和類別
            $('#info-construction-unit').removeClass('hidden');
            $('#info-category').removeClass('hidden');
            $('#section-construction-info').addClass('hidden');

            $('#view-construction-unit').text(record.constructionUnit || '-');
            $('#view-category').text(record.category || '-');
        } else {
            // Stage 1: 顯示施工單位，隱藏類別和工程資訊
            $('#info-construction-unit').removeClass('hidden');
            $('#info-category').addClass('hidden');
            $('#section-construction-info').addClass('hidden');
            $('#view-construction-unit').text(record.constructionUnit || '-');
        }
    },

    /**
     * 根據狀態文字取得對應的 CSS class
     * @param {string} status - 狀態文字
     * @returns {string} - CSS class
     */
    getStatusClass: function(status) {
        if (!status) return 'status-active';
        
        if (status.includes('完成') || status.includes('結案')) {
            return 'status-completed';
        } else if (status.includes('待') || status.includes('審核')) {
            return 'status-pending';
        } else {
            return 'status-active';
        }
    },

    /**
     * 渲染附件列表
     * @param {Array} files - 附件陣列
     */
    renderAttachments: function(files) {
        const self = this;
        const $container = $('#view-file-list');
        const $empty = $('#view-file-empty');
        $container.empty();

        // 更新檔案數量
        $('#view-file-count').text(`${files.length} 個檔案`);

        if (!files || files.length === 0) {
            $container.hide();
            $empty.show();
            return;
        }

        $empty.hide();
        $container.show();

        files.forEach(file => {
            const ext = self.getFileExtension(file.name || file.fileName);
            const iconClass = self.fileIcons[ext] || self.fileIcons['default'];

            const $item = $(`
                <div class="file-list-item" data-file-id="${file.id || ''}">
                    <div class="file-info">
                        <i class="fa ${iconClass} file-icon"></i>
                        <span class="file-name">${self.escapeHtml(file.name || file.fileName)}</span>
                        <span class="file-size">(${file.size || '-'})</span>
                    </div>
                    <div class="file-actions">
                        <button type="button" class="btn-download-file" title="下載">
                            <img src="/svg/download.svg" alt="下載" />
                        </button>
                        <button type="button" class="btn-delete-file" title="刪除">
                            <img src="/svg/remove_0.svg" alt="刪除" />
                        </button>
                    </div>
                </div>
            `);

            $container.append($item);
        });
    },

    /**
     * 渲染修改歷程
     * @param {Object} record - 紀錄資料
     */
    renderHistory: function(record) {
        const self = this;
        const $container = $('#view-history-list');
        $container.empty();

        const logs = record.editLogs || [];

        if (logs.length === 0) {
            // 無歷程記錄時顯示建立時間
            const createdTime = self.formatDateTime(record.createdAt);
            $container.append(`
                <div class="history-item">
                    <div class="history-icon">
                        <i class="fa fa-plus-circle"></i>
                    </div>
                    <div class="history-content">
                        <span class="history-action">建立紀錄</span>
                        <span class="history-time">${createdTime}</span>
                    </div>
                </div>
            `);
            return;
        }

        logs.forEach(log => {
            const icon = log.operationType === '建立' ? 'fa-plus-circle' : 'fa-pencil';
            $container.append(`
                <div class="history-item">
                    <div class="history-icon">
                        <i class="fa ${icon}"></i>
                    </div>
                    <div class="history-content">
                        <span class="history-action">${self.escapeHtml(log.operationType + '紀錄')}</span>
                        <span class="history-time">${self.formatDateTime(log.recordTime)}</span>
                    </div>
                </div>
            `);
        });
    },

    /**
     * 開啟編輯表單
     */
    openEditForm: function() {
        const self = this;

        console.log('開啟編輯表單:', self.currentRecord);

        // 觸發自定義事件，讓 ProcessBox 處理編輯邏輯
        $(document).trigger('openEditRecord', {
            record: self.currentRecord,
            project: self.currentProject,
            stage: self.currentStage
        });
    },

    /**
     * 開啟刪除確認 Modal
     */
    openDeleteConfirm: function() {
        const self = this;

        const title = self.currentRecord?.recordTitle || self.currentRecord?.title || '此紀錄';
        $('#delete-record-title').text(title);
        $('#delete-confirm-modal').removeClass('hidden');
    },

    /**
     * 關閉刪除確認 Modal
     */
    closeDeleteConfirm: function() {
        $('#delete-confirm-modal').addClass('hidden');
    },

    /**
     * 確認刪除
     */
    confirmDelete: function() {
        const self = this;

        if (!self.currentRecord || !self.currentRecord.id) {
            alert('無法刪除：找不到紀錄 ID');
            return;
        }

        // 使用已儲存的 processNum，或從 stage 解析
        const processNum = self.currentProcessNum || self.getProcessNumber(self.currentStage);
        const apiEndpoint = `/api/RoadProject/DeleteProcess${processNum}/${self.currentRecord.id}`;

        console.log('刪除紀錄:', apiEndpoint);

        // 關閉 Modal
        self.closeDeleteConfirm();

        // 保存資料（closeView 會清空 currentRecord）
        const recordId = self.currentRecord.id;
        const stage = self.currentStage;

        // 呼叫刪除 API
        fetch(apiEndpoint, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(result => {
            console.log('刪除結果:', result);

            if (result.success) {
                // 關閉檢視頁面並刷新列表
                self.closeView();

                // 觸發刷新事件
                $(document).trigger('recordDeleted', {
                    recordId: recordId,
                    stage: stage,
                    processNum: processNum
                });
            } else {
                alert(`刪除失敗：${result.message}`);
            }
        })
        .catch(error => {
            console.error('刪除失敗:', error);
            alert('刪除失敗，請稍後再試');
        });
    },

    /**
     * 下載檔案
     * @param {string} fileId - 檔案 ID
     * @param {string} fileName - 檔案名稱
     */
    downloadFile: function(fileId, fileName) {
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
     * 確認刪除檔案
     * @param {string} fileId - 檔案 ID
     * @param {string} fileName - 檔案名稱
     */
    confirmDeleteFile: function(fileId, fileName) {
        const self = this;

        if (confirm(`確定要刪除檔案「${fileName}」嗎？此操作無法復原。`)) {
            self.deleteFile(fileId);
        }
    },

    /**
     * 刪除檔案
     * @param {string} fileId - 檔案 ID
     */
    deleteFile: function(fileId) {
        const self = this;

        fetch(`/api/RoadProject/DeleteProcessFile/${fileId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // 重新載入檔案列表
                if (self.currentRecord && self.currentRecord.processId) {
                    self.fetchProcessFiles(self.currentRecord.processId)
                        .then(files => {
                            self.currentRecord.files = files;
                            self.renderAttachments(files);
                        });
                }
            } else {
                alert(`刪除失敗：${result.message}`);
            }
        })
        .catch(error => {
            console.error('刪除檔案失敗:', error);
            alert('刪除檔案失敗，請稍後再試');
        });
    },

    /**
     * 關閉檢視頁面
     */
    closeView: function() {
        const self = this;

        // 清空資料
        self.currentRecord = null;

        // 返回歷程列表頁面
        BoxManager.openRightBoxPage('page-process', '專案歷程');

        // 觸發自定義事件
        $(document).trigger('processViewClosed');
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
     * 格式化日期時間
     * @param {string} dateString - ISO 日期字串
     * @returns {string} - 格式化後的日期時間 (YYYY-MM-DD HH:mm:ss)
     */
    formatDateTime: function(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return dateString;
        }
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
    }
};

export default ProcessView;