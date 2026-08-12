import BoxManager from './box.js';
import { showLoading, hideLoading } from '../loading.js';

/**
 * 專案歷程詳情業務邏輯模組
 * 功能：顯示專案基本資訊、歷程記錄、佐證文件下載
 */
const ProcessBox = {
    currentProject: null,
    allProcessData: null,

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

    init: function() {
        const self = this;

        $('#page-process').on('click', '.btn-close-box', function() {
            self.closeProcessBox();
        });

        $('#page-process').on('click', '.timeline-card', function(e) {
            if ($(e.target).closest('.btn-card-download-file, .record-attachments').length) return;
            const recordId = $(this).closest('.timeline-item').data('record-id');
            const record = (self.allProcessData || []).find(r => r.id === recordId);
            if (record) self.openDetail(record);
        });

        $('#page-process').on('click', '.btn-card-download-file', function(e) {
            e.stopPropagation();
            self.downloadFile($(this).data('file-id'), $(this).data('file-name'));
        });

        $(document).on('click', '#page-process-detail .btn-delete-detail-file', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.file-list-item');
            const fileName = $item.find('.file-name').text();
            if (!confirm(`確定要刪除「${fileName}」嗎？`)) return;
            self.deleteDetailFile($item.data('file-id'), $item);
        });

        $(document).on('click', '#btn-back-to-process-list', function() {
            BoxManager.openRightBoxPage('page-process', '專案歷程');
        });

        $(document).on('click', '#btn-detail-edit', function() {
            if (self.currentDetailRecord) self.openEditDetail(self.currentDetailRecord);
        });

        $(document).on('click', '#btn-detail-delete', function() {
            if (self.currentDetailRecord) self.confirmDeleteDetail(self.currentDetailRecord);
        });

        $('#page-process').on('click', '.btn-add-record', function() {
            self.openAddRecordForm();
        });

        $('#page-process').on('click', '#btn-export-process', function() {
            self.exportProcessData();
        });


        $('#page-process').on('click', '.btn-download-file', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.file-list-item');
            const fileId = $item.data('file-id');
            const fileName = $item.find('.file-name').text();
            self.downloadFile(fileId, fileName);
        });


        self.initModalEvents();

        console.log('ProcessBox 業務邏輯初始化完成');
    },

    openProcessBox: function(project) {
        const self = this;

        if (!project || !project.id) {
            console.error('無效的專案資料');
            return;
        }

        self.currentProject = project;
        self.projectId = project.id;

        BoxManager.openRightBoxPage('page-process', '專案歷程');
        self.updateProjectInfo(project);
        self.fetchAllProcessData(self.projectId);
    },

    updateProjectInfo: function(project) {
        $('#process-no').text(project.id || '-');
        $('#process-title').text(project.name || '專案名稱');
        $('#process-create-date').text(project.createDate || '-');
        $('#process-budget').text(project.budget || '-');
        $('#process-pm').text(project.pm || '-');

    },

    fetchAllProcessData: function(projectId) {
        const self = this;

        $('#process-timeline').html(`
            <div class="timeline-loading" style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fa fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 10px;">資料載入中...</p>
            </div>
        `);

        fetch(`/api/RoadProject/GetAllProcessRecords/${projectId}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            self.allProcessData = data;
            self.renderAllStageTable([...data].reverse());
        })
        .catch(error => {
            console.error('載入總階段資料失敗:', error);
            $('#process-timeline').html(`
                <div class="timeline-error" style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fa fa-exclamation-circle fa-2x"></i>
                    <p style="margin-top: 10px;">載入失敗，請稍後再試</p>
                </div>
            `);
        });
    },

    renderAllStageTable: function(records) {
        const self = this;
        const $timeline = $('#process-timeline');
        $timeline.empty();

        if (!records || records.length === 0) {
            $timeline.html(`
                <div class="timeline-empty" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fa fa-inbox fa-2x"></i>
                    <p style="margin-top: 10px;">本專案尚無歷程記錄</p>
                </div>
            `);
            return;
        }

        const typeClassMap = {
            '重要里程碑': 'type-milestone',
            '會議記錄':   'type-meeting',
            '公文核定':   'type-official',
            '進度說明':   'type-progress',
            '局長補充格式': 'type-official',
            '檔案上傳':   'type-file'
        };

        const items = records.map(r => {
            const typeClass = typeClassMap[r.recordType] || 'type-progress';
            const currentStatus       = r.currentStatus ? self.escapeHtml(r.currentStatus) : '';
            const currentResolution   = r.currentMeetingResolution ? self.escapeHtml(r.currentMeetingResolution) : '';
            const districtHtml = r.district
                ? `<span class="record-date"><i class="fa fa-map-marker"></i> ${self.escapeHtml(r.district)}</span>`
                : '';
            const statusHtml = currentStatus
                ? `<p class="record-desc" style="margin-bottom:6px;"><b>最新辦理情形：</b>${currentStatus}</p>`
                : '';
            const resolutionHtml = currentResolution
                ? `<p class="record-desc" style="margin-bottom:0;"><b>本次會議裁示：</b>${currentResolution}</p>`
                : '';

            return `
                <div class="timeline-item" data-record-id="${r.id}" data-process-id="${r.processId || ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-card">
                        <div class="card-header">
                            <div class="card-title-group">
                                <span class="record-type ${typeClass}">${self.escapeHtml(r.recordType || '-')}</span>
                                <h4 class="record-title">${self.escapeHtml(r.recordTitle || '-')}</h4>
                            </div>
                            ${districtHtml}
                        </div>
                        ${statusHtml}
                        ${resolutionHtml}
                        <div class="card-files" id="card-files-${r.id}"></div>
                    </div>
                </div>
            `;
        }).join('');

        $timeline.html(`
            <div class="process-timeline">
                <div class="timeline-line"></div>
                ${items}
            </div>
        `);

        self.loadTimelineFiles(records);
    },

    addDateNoteItem: function(listId) {
        const $item = $(`
            <div class="date-note-item" style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                <input type="text" class="form-control date-note-date" style="flex:0 0 150px;" placeholder="113.5 或 113.5.15">
                <input type="text" class="form-control date-note-note" placeholder="備註">
                <button type="button" class="btn btn-sm btn-outline-danger btn-remove-date-note">
                    <i class="fa fa-trash">刪除</i>
                </button>
            </div>
        `);
        $(`#${listId}`).append($item);
    },

    collectDateNoteItems: function(listId) {
        const entries = [];
        $(`#${listId} .date-note-item`).each(function() {
            const dateVal = $(this).find('.date-note-date').val().trim();
            const note = $(this).find('.date-note-note').val().trim();
            if (!dateVal) return;
            entries.push({ date: dateVal, note: note || null });
        });
        return entries.length ? JSON.stringify(entries) : null;
    },

    parseDateNoteItems: function(json) {
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return json.split(',').map(s => ({ date: s.trim(), note: null }));
        }
    },

    formatDateNoteDisplay: function(json) {
        return this.parseDateNoteItems(json)
            .map(item => item.note ? `${item.date}(${item.note})` : item.date)
            .join('、');
    },

    addPublicHearingItem: function() {
        this.addDateNoteItem('public-hearing-list');
    },

    collectPublicHearings: function() {
        return this.collectDateNoteItems('public-hearing-list');
    },

    openAddRecordForm: function() {
        this.openAllProcessAddModal();
    },

    openAllProcessAddModal: function() {
        const self = this;
        const $form = $('#form-stage-all');
        $form[0]?.reset();
        ['public-hearing-list', 'market-price-review-list', 'negotiated-purchase-list',
         'pre-review-list', 'submission-list', 'approval-list',
         'design-dispatch-list', 'basic-design-approval-list',
         'detailed-design-approval-list', 'construction-execution-list'].forEach(id => $(`#${id}`).empty());
        $('#sa-file-list').empty();

        const now = new Date();
        const rocYear = now.getFullYear() - 1911;
        const autoTitle = `${rocYear}.${now.getMonth() + 1}.${now.getDate()}`;
        $('#sa-record-title').val(autoTitle);

        if (self.currentProject) {
            const projectName = self.currentProject.name || self.currentProject._raw?.startEndLocation || '';
            const district = self.currentProject._raw?.administrativeDistrict || self.currentProject.district || '';
            $('#sa-project-name').val(projectName);
            if (district) $('#sa-district').val(district);

            const raw = self.currentProject._raw;
            if (raw) {
                const landBudget = raw.landAcquisitionBudget;
                const constrBudget = raw.constructionBudget;
                $('#sa-land-budget').val(landBudget ? `${Math.round(landBudget / 10000).toLocaleString()} 萬元` : '');
                $('#sa-construction-budget-ref').val(constrBudget ? `${Math.round(constrBudget / 10000).toLocaleString()} 萬元` : '');
            }
        }

        if (self.allProcessData && self.allProcessData.length > 0) {
            const last = [...self.allProcessData].reverse().find(r => r.recordType !== '局長補充格式');
            $('#sa-previous-status').val(last?.currentStatus || '');
            $('#sa-previous-resolution').val(last?.currentMeetingResolution || '');
        }

        self.updateFormModeForRecordType();
        $('#all-process-add-modal').removeClass('hidden');
    },

    updateFormModeForRecordType: function() {
        const isFileUpload = $('#sa-record-type').val() === '檔案上傳';
        $('#form-stage-all').toggleClass('mode-file-upload', isFileUpload);
        // 隱藏區塊內若有 required 欄位，隱藏時一併解除，避免瀏覽器驗證時嘗試 focus 不可見欄位而噴錯
        $('#sa-current-status').prop('required', !isFileUpload);
    },

    closeAllProcessAddModal: function() {
        $('#all-process-add-modal').addClass('hidden');
        $('#form-stage-all')[0]?.reset();
        ['public-hearing-list', 'market-price-review-list', 'negotiated-purchase-list',
         'pre-review-list', 'submission-list', 'approval-list',
         'design-dispatch-list', 'basic-design-approval-list',
         'detailed-design-approval-list', 'construction-execution-list'].forEach(id => $(`#${id}`).empty());
        $('#sa-file-list').empty();
    },

    submitAllProcessRecord: function() {
        const self = this;
        const $form = $('#form-stage-all');

        if (!$form[0]?.checkValidity()) {
            $form[0]?.reportValidity();
            return;
        }

        const formData = new FormData($form[0]);

        const data = {
            ProjectId: self.projectId,
            District: formData.get('district') || null,
            RecordType: formData.get('record_type'),
            RecordTitle: formData.get('record_title'),
            ProjectName: formData.get('project_name') || self.currentProject?.name || null,
            ExecutionUnit: formData.get('execution_unit') || null,
            ConstructionUnit: formData.get('construction_unit') || null,
            Category: formData.get('category') || null,
            PublicHearing: self.collectPublicHearings(),
            MarketPriceReview: self.collectDateNoteItems('market-price-review-list'),
            NegotiatedPurchaseMeeting: self.collectDateNoteItems('negotiated-purchase-list'),
            ExpropriationPlanPreReview: self.collectDateNoteItems('pre-review-list'),
            ExpropriationPlanSubmission: self.collectDateNoteItems('submission-list'),
            ExpropriationApproval: self.collectDateNoteItems('approval-list'),
            BudgetFiscalYearApprovedAmount: formData.get('budget_fiscal_year_approved_amount') || null,
            ContractType: formData.get('contract_type') || null,
            ConstructionPeriod: formData.get('construction_period') || null,
            AnnouncementCommencementDate: self.formatDateField(
                formData.get('announcement_commencement_type'),
                formData.get('announcement_commencement_date_value')
            ) || null,
            AwardCompletionDate: self.formatDateField(
                formData.get('award_completion_type'),
                formData.get('award_completion_date_value')
            ) || null,
            DesignDispatch: self.collectDateNoteItems('design-dispatch-list'),
            BasicDesignApproval: self.collectDateNoteItems('basic-design-approval-list'),
            DetailedDesignApproval: self.collectDateNoteItems('detailed-design-approval-list'),
            ConstructionExecution: self.collectDateNoteItems('construction-execution-list'),
            PreviousMeetingStatus: formData.get('previous_meeting_status') || null,
            PreviousMeetingResolution: formData.get('previous_meeting_resolution') || null,
            CurrentStatus: formData.get('current_status'),
            CurrentMeetingResolution: formData.get('current_meeting_resolution') || null,
            LandAcquisitionBudget: self.currentProject?._raw?.landAcquisitionBudget || null,
            ConstructionBudget: self.currentProject?._raw?.constructionBudget || null,
            CreatedAt: new Date().toISOString()
        };

        const isEdit = !!self._editingRecordId;
        if (isEdit) data.Id = self._editingRecordId;

        const fileInput = document.getElementById('sa-files');
        const filesArray = fileInput?.files ? Array.from(fileInput.files) : [];

        if (!confirm(isEdit ? '確定要儲存修改嗎？' : '確定要新增此記錄嗎？')) return;

        self.closeAllProcessAddModal();
        showLoading(isEdit ? '更新中...' : '新增中...');

        const apiUrl    = isEdit ? '/api/RoadProject/UpdateAllProcessRecord' : '/api/RoadProject/AddAllProcessRecord';
        const apiMethod = isEdit ? 'PUT' : 'POST';

        fetch(apiUrl, {
            method: apiMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                const processId = result.processId || (isEdit ? self.currentDetailRecord?.processId : null);
                const uploadDone = (filesArray.length > 0 && processId)
                    ? self.uploadProcessFiles(processId, filesArray)
                    : Promise.resolve();

                uploadDone
                    .catch(err => console.error('檔案上傳失敗:', err))
                    .finally(() => {
                        alert(isEdit ? '記錄更新成功！' : '記錄新增成功！');
                        self._editingRecordId = null;
                        self.allProcessData = null;
                        BoxManager.openRightBoxPage('page-process', '專案歷程');
                        self.fetchAllProcessData(self.projectId);
                        hideLoading();
                    });
            } else {
                alert(`${isEdit ? '更新' : '新增'}失敗: ${result.message}`);
                hideLoading();
            }
        })
        .catch(err => {
            console.error(`${isEdit ? '更新' : '新增'}失敗:`, err);
            alert(`${isEdit ? '更新' : '新增'}記錄失敗，請稍後再試`);
            hideLoading();
        });
    },

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

    formatDateField: function(type, dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        const rocYear = date.getFullYear() - 1911;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const rocDateStr = `${rocYear}.${month}.${day}`;
        return (type && type !== '') ? `${type} ${rocDateStr}` : rocDateStr;
    },

    downloadFile: function(fileId, fileName) {
        fetch(`/api/RoadProject/DownloadProcessFile/${fileId}`, { method: 'GET' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.status === 404 ? '檔案不存在' : `下載失敗 (${response.status})`);
                }
                return response.blob();
            })
            .then(blob => {
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

    handleFileSelect: function(e, stage) {
        const self = this;
        const files = e.target.files;
        const stageNum = stage === 'stage-all' ? 'sa' : stage.replace('stage', 's');
        const $fileList = $(`#${stageNum}-file-list`);

        Array.from(files).forEach((file, index) => {
            const fileId = `${stageNum}-file-${Date.now()}-${index}`;
            const fileSize = self.formatFileSize(file.size);
            const iconClass = self.getFileIconClass(file.name);

            $fileList.append(`
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
        });
    },

    removeFileItem: function(fileId) {
        $(`.file-list-item[data-file-id="${fileId}"]`).remove();
    },

    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getFileIconClass: function(fileName) {
        const ext = this.getFileExtension(fileName);
        return this.fileIcons[ext] || this.fileIcons['default'];
    },

    getFileExtension: function(fileName) {
        if (!fileName) return 'default';
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : 'default';
    },

    initModalEvents: function() {
        const self = this;

        $(document).on('click', '#page-process-detail .btn-download-file', function(e) {
            e.stopPropagation();
            const $item = $(this).closest('.file-list-item');
            const fileId = $item.data('file-id');
            const fileName = $item.find('.file-name').text();
            self.downloadFile(fileId, fileName);
        });

        $(document).on('click', '#btn-close-all-process-modal, #btn-cancel-all-process', function() {
            self.closeAllProcessAddModal();
        });

        $(document).on('click', '#all-process-add-modal .process-modal-backdrop', function() {
            self.closeAllProcessAddModal();
        });

        $(document).on('click', '#btn-submit-all-process', function() {
            self.submitAllProcessRecord();
        });

        $(document).on('change', '#sa-record-type', function() {
            self.updateFormModeForRecordType();
        });

        $(document).on('click', '#btn-add-public-hearing', function() {
            self.addDateNoteItem('public-hearing-list');
        });

        $(document).on('click', '.btn-add-date-note', function() {
            self.addDateNoteItem($(this).data('list'));
        });

        $(document).on('click', '.btn-remove-date-note', function() {
            $(this).closest('.date-note-item').remove();
        });

        $(document).on('change', '.file-input', function(e) {
            const stage = $(this).closest('.process-form').data('stage');
            self.handleFileSelect(e, stage);
        });

        $(document).on('click', '.btn-remove-file', function(e) {
            e.stopPropagation();
            const fileId = $(this).data('file-id');
            self.removeFileItem(fileId);
        });

        $(document).on('dragover', '#all-process-add-modal .file-upload-area', function(e) {
            e.preventDefault();
            $(this).addClass('dragover');
        });

        $(document).on('dragleave', '#all-process-add-modal .file-upload-area', function(e) {
            e.preventDefault();
            $(this).removeClass('dragover');
        });

        $(document).on('drop', '#all-process-add-modal .file-upload-area', function(e) {
            e.preventDefault();
            $(this).removeClass('dragover');
            const files = e.originalEvent.dataTransfer.files;
            const $input = $(this).find('.file-input');
            $input[0].files = files;
            $input.trigger('change');
        });

        console.log('Modal 事件初始化完成');
    },

    openDetail: function(record) {
        const self = this;
        self.currentDetailRecord = record;
        $('#detail-project-name').text(self.currentProject?.name || '');
        $('#detail-record-title').text(record.recordTitle || '-');
        self.renderDetail(record);
        $('#btn-detail-edit').toggle(record.recordType !== '局長補充格式');
        BoxManager.openRightBoxPage('page-process-detail', '記錄詳情');
        if (record.processId) self.fetchDetailFiles(record.processId);
    },

    openEditDetail: function(record) {
        const self = this;
        const $form = $('#form-stage-all');
        $form[0]?.reset();
        ['public-hearing-list', 'market-price-review-list', 'negotiated-purchase-list',
         'pre-review-list', 'submission-list', 'approval-list',
         'design-dispatch-list', 'basic-design-approval-list',
         'detailed-design-approval-list', 'construction-execution-list'].forEach(id => $(`#${id}`).empty());
        $('#sa-file-list').empty();

        $('#sa-district').val(record.district || '');
        $('#sa-record-type').val(record.recordType || '');
        $('#sa-record-title').val(record.recordTitle || '');
        $('#sa-project-name').val(record.projectName || '');
        $('#sa-execution-unit').val(record.executionUnit || '');
        $('#sa-construction-unit').val(record.constructionUnit || '');
        $('#sa-category').val(record.category || '');
        $('#sa-land-budget').val(record.landAcquisitionBudget
            ? `${Math.round(record.landAcquisitionBudget / 10000).toLocaleString()} 萬元` : '');
        $('#sa-construction-budget-ref').val(record.constructionBudget
            ? `${Math.round(record.constructionBudget / 10000).toLocaleString()} 萬元` : '');
        $('#sa-budget').val(record.budgetFiscalYearApprovedAmount || '');
        $('#sa-contract-type').val(record.contractType || '');
        $('#sa-period').val(record.constructionPeriod || '');
        $('#sa-market-price-review').val('');
        $('#sa-previous-status').val(record.previousMeetingStatus || '');
        $('#sa-previous-resolution').val(record.previousMeetingResolution || '');
        $('#sa-current-status').val(record.currentStatus || '');
        $('#sa-current-resolution').val(record.currentMeetingResolution || '');

        const fillDateNoteList = (listId, json) => {
            self.parseDateNoteItems(json).forEach(item => {
                self.addDateNoteItem(listId);
                const $last = $(`#${listId} .date-note-item`).last();
                $last.find('.date-note-date').val(item.date || '');
                $last.find('.date-note-note').val(item.note || '');
            });
        };

        fillDateNoteList('public-hearing-list',             record.publicHearing);
        fillDateNoteList('market-price-review-list',        record.marketPriceReview);
        fillDateNoteList('negotiated-purchase-list',        record.negotiatedPurchaseMeeting);
        fillDateNoteList('pre-review-list',                 record.expropriationPlanPreReview);
        fillDateNoteList('submission-list',                 record.expropriationPlanSubmission);
        fillDateNoteList('approval-list',                   record.expropriationApproval);
        fillDateNoteList('design-dispatch-list',            record.designDispatch);
        fillDateNoteList('basic-design-approval-list',      record.basicDesignApproval);
        fillDateNoteList('detailed-design-approval-list',   record.detailedDesignApproval);
        fillDateNoteList('construction-execution-list',     record.constructionExecution);

        self._editingRecordId = record.id;
        self.updateFormModeForRecordType();
        $('#all-process-add-modal').removeClass('hidden');
    },

    confirmDeleteDetail: function(record) {
        const self = this;
        if (!confirm(`確定要刪除「${record.recordTitle || '此記錄'}」嗎？此操作無法復原。`)) return;

        showLoading('刪除中...');
        fetch(`/api/RoadProject/DeleteAllProcessRecord/${record.id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    alert('刪除成功');
                    self.currentDetailRecord = null;
                    self.allProcessData = null;
                    BoxManager.openRightBoxPage('page-process', '專案歷程');
                    self.fetchAllProcessData(self.projectId);
                } else {
                    alert(`刪除失敗：${result.message}`);
                }
            })
            .catch(() => alert('刪除失敗，請稍後再試'))
            .finally(() => hideLoading());
    },

    renderDetail: function(record) {
        const self = this;
        const typeClassMap = { '重要里程碑': 'type-milestone', '會議記錄': 'type-meeting', '公文核定': 'type-official', '進度說明': 'type-progress', '檔案上傳': 'type-file' };
        const typeClass = typeClassMap[record.recordType] || 'type-progress';

        const section = (icon, title, rows) => {
            const content = rows.filter(([, v]) => v).map(([label, value]) => `
                <div class="info-item">
                    <span class="info-label">${label}</span>
                    <div class="detail-content" style="margin:0;">${self.escapeHtml(value)}</div>
                </div>`).join('');
            return content ? `
                <div class="view-section">
                    <div class="section-header">
                        <h3 class="section-title"><i class="fa ${icon}"></i> ${title}</h3>
                    </div>
                    <div class="section-body"><div class="info-grid">${content}</div></div>
                </div>` : '';
        };

        const sectionFull = (icon, title, rows) => {
            const content = rows.filter(([, v]) => v).map(([label, value]) => `
                <div class="info-item" style="grid-column:1/-1;">
                    <span class="info-label">${label}</span>
                    <div class="detail-content" style="margin:0;white-space:pre-wrap;">${self.escapeHtml(value)}</div>
                </div>`).join('');
            return content ? `
                <div class="view-section">
                    <div class="section-header">
                        <h3 class="section-title"><i class="fa ${icon}"></i> ${title}</h3>
                    </div>
                    <div class="section-body"><div class="info-grid">${content}</div></div>
                </div>` : '';
        };

        const dn = key => self.formatDateNoteDisplay(record[key]) || null;
        const landBudgetDisplay = record.landAcquisitionBudget
            ? `${Math.round(record.landAcquisitionBudget / 10000).toLocaleString()} 萬元` : null;
        const constrBudgetDisplay = record.constructionBudget
            ? `${Math.round(record.constructionBudget / 10000).toLocaleString()} 萬元` : null;

        $('#detail-content-area').html(`
            <div class="view-section">
                <div class="section-body" style="padding-top:16px;">
                    <div class="card-title-group" style="gap:8px;">
                        <span class="record-type ${typeClass}">${self.escapeHtml(record.recordType || '-')}</span>
                        <h4 class="record-title">${self.escapeHtml(record.recordTitle || '-')}</h4>
                    </div>
                    <div style="margin-top:8px; font-size:13px; color:#64748b;">
                        ${record.district ? `<span style="margin-right:12px;"><i class="fa fa-map-marker"></i> ${self.escapeHtml(record.district)}</span>` : ''}
                        ${record.createdAt ? `<span><i class="fa fa-calendar"></i> ${self.formatDate(record.createdAt)}</span>` : ''}
                    </div>
                </div>
            </div>
            ${section('fa-info-circle', '基本資訊', [
                ['執行單位', record.executionUnit],
                ['工程單位', record.constructionUnit],
                ['工程名稱', record.projectName],
                ['類別',     record.category],
                ['關心議員', self.currentProject?._raw?.proposer]
            ])}
            ${section('fa-home', '用地取得資訊', [
                ['用地經費',            landBudgetDisplay],
                ['公聽會',              dn('publicHearing')],
                ['徵收市價地評會審查',  dn('marketPriceReview')],
                ['協議價購會',          dn('negotiatedPurchaseMeeting')],
                ['徵收計畫書地政局預審', dn('expropriationPlanPreReview')],
                ['徵收計畫書報部',      dn('expropriationPlanSubmission')],
                ['徵收核定',            dn('expropriationApproval')]
            ])}
            ${section('fa-building', '工程資訊', [
                ['工程經費',              constrBudgetDisplay],
                ['預算(年度)來源核定經費', record.budgetFiscalYearApprovedAmount],
                ['開口合約/專業發包',      record.contractType],
                ['工期',                  record.constructionPeriod],
                ['上網公告預計/實際開工',  record.announcementCommencementDate],
                ['決標日期預計/實際完工',  record.awardCompletionDate],
                ['設計派工',              dn('designDispatch')],
                ['基設核定',              dn('basicDesignApproval')],
                ['細設核定',              dn('detailedDesignApproval')],
                ['工程施做',              dn('constructionExecution')]
            ])}
            ${sectionFull('fa-history', '前次會議', [
                ['辦理情形', record.previousMeetingStatus],
                ['裁示',     record.previousMeetingResolution]
            ])}
            ${sectionFull('fa-file-text-o', '本次會議', [
                ['最新辦理情形', record.currentStatus],
                ['本次會議裁示', record.currentMeetingResolution]
            ])}
            ${record.recordType === '局長補充格式' ? `
            <div class="view-section" id="detail-image-section" style="display:none;">
                <div class="section-header">
                    <h3 class="section-title"><i class="fa fa-picture-o"></i> 開瓶計畫附圖</h3>
                </div>
                <div class="section-body" id="detail-image-zone" style="display:flex;flex-wrap:wrap;gap:10px;padding:10px 0;"></div>
            </div>` : ''}
            <div class="view-section">
                <div class="section-header">
                    <h3 class="section-title"><i class="fa fa-paperclip"></i> 佐證文件</h3>
                    <span class="file-count" id="detail-file-count"></span>
                </div>
                <div class="section-body">
                    <div class="file-list" id="detail-file-list"></div>
                    <div class="file-empty" id="detail-file-empty" style="display:none;">
                        <i class="fa fa-folder-open-o"></i><p>尚無上傳文件</p>
                    </div>
                </div>
            </div>
        `);
    },

    loadTimelineFiles: function(records) {
        const self = this;
        records.filter(r => r.processId).forEach(r => {
            fetch(`/api/RoadProject/GetProcessFiles/${r.processId}`)
                .then(res => res.ok ? res.json() : [])
                .then(files => {
                    if (!files.length) return;
                    const items = files.map(f => {
                        const ext = self.getFileExtension(f.fileName);
                        const icon = self.fileIcons[ext] || self.fileIcons['default'];
                        return `
                            <div class="card-file-row">
                                <i class="fa ${icon} card-file-icon"></i>
                                <span class="card-file-name">${self.escapeHtml(f.fileName)}</span>
                                <span class="card-file-size">${self.escapeHtml(f.fileSize || '')}</span>
                                <button type="button" class="btn-card-download-file"
                                    data-file-id="${f.id}"
                                    data-file-name="${self.escapeHtml(f.fileName)}"
                                    title="下載">
                                    <img src="/svg/download.svg" alt="下載" />
                                </button>
                            </div>`;
                    }).join('');
                    $(`#card-files-${r.id}`).html(`
                        <div class="record-attachments" style="margin-top:10px;">
                            <h5 class="attachments-title">
                                <i class="fa fa-paperclip"></i> 佐證文件（${files.length}）
                            </h5>
                            ${items}
                        </div>`);
                })
                .catch(() => {});
        });
    },

    deleteDetailFile: function(fileId, $item) {
        const self = this;
        fetch(`/api/RoadProject/DeleteProcessFile/${fileId}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    $item.remove();
                    const count = $('#detail-file-list .file-list-item').length;
                    $('#detail-file-count').text(`${count} 個檔案`);
                    if (count === 0) $('#detail-file-empty').show();
                } else {
                    alert(`刪除失敗：${result.message}`);
                }
            })
            .catch(() => alert('刪除失敗，請稍後再試'));
    },

    fetchDetailFiles: function(processId) {
        const self = this;
        $('#detail-file-list').empty();
        $('#detail-file-empty').hide();
        $('#detail-file-count').text('載入中...');

        fetch(`/api/RoadProject/GetProcessFiles/${processId}`)
            .then(r => r.ok ? r.json() : [])
            .then(files => {
                $('#detail-file-count').text(`${files.length} 個檔案`);
                if (!files.length) { $('#detail-file-empty').show(); return; }

                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                files.forEach(f => {
                    const ext = self.getFileExtension(f.fileName);
                    const icon = self.fileIcons[ext] || self.fileIcons['default'];
                    $('#detail-file-list').append(`
                        <div class="file-list-item" data-file-id="${f.id}">
                            <div class="file-info">
                                <i class="fa ${icon} file-icon"></i>
                                <span class="file-name">${self.escapeHtml(f.fileName)}</span>
                                <span class="file-size">${self.escapeHtml(f.fileSize || '')}</span>
                            </div>
                            <div class="file-actions">
                                <button type="button" class="btn-download-file" title="下載">
                                    <img src="/svg/download.svg" alt="下載" />
                                </button>
                                <button type="button" class="btn-delete-detail-file" title="刪除">
                                    <img src="/svg/remove_0.svg" alt="刪除" />
                                </button>
                            </div>
                        </div>
                    `);

                    if (imageExts.includes(ext) && $('#detail-image-zone').length) {
                        $('#detail-image-section').show();
                        fetch(`/api/RoadProject/DownloadProcessFile/${f.id}`)
                            .then(r => r.ok ? r.blob() : null)
                            .then(blob => {
                                if (!blob) return;
                                const url = URL.createObjectURL(blob);
                                $('#detail-image-zone').append(
                                    `<img src="${url}" style="max-width:100%;max-height:320px;object-fit:contain;border-radius:4px;border:1px solid #e2e8f0;" />`
                                );
                            });
                    }
                });
            })
            .catch(() => { $('#detail-file-count').text('0 個檔案'); $('#detail-file-empty').show(); });
    },

    closeProcessBox: function() {
        const self = this;
        self.currentProject = null;
        self.allProcessData = null;
        BoxManager.closeBox('right-box');
        $(document).trigger('processBoxClosed');
    },

    refresh: function() {
        const self = this;
        if (self.projectId) {
            self.allProcessData = null;
            self.fetchAllProcessData(self.projectId);
        }
    },

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

    escapeHtml: function(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    exportProcessData: function() {
        const self = this;
        if (!self.allProcessData || self.allProcessData.length === 0) {
            alert('尚無歷程記錄可匯出');
            return;
        }

        const raw = self.currentProject?._raw || {};
        const last = [...self.allProcessData].reverse().find(r => r.recordType !== '局長補充格式') || {};

        const projectName = last.projectName || self.currentProject?.name || '';
        const executionUnit = last.executionUnit || '';
        const proposer = raw.proposer || '';
        const currentStatus = last.currentStatus || '';
        const roadLength = raw.roadLength != null ? `${raw.roadLength} 公尺` : '';
        const startDate = last.announcementCommencementDate || '';
        const endDate = last.awardCompletionDate || '';

        const roadWidth = raw.currentRoadWidth || '';
        const fmtBudget = v => {
            if (!v) return '';
            const wan = Math.round(v / 10000);
            if (wan >= 10000) {
                const yi = Math.floor(wan / 10000);
                const remaining = wan % 10000;
                return remaining > 0 ? `${yi}億${remaining.toLocaleString()}萬元` : `${yi}億元`;
            }
            return `${wan.toLocaleString()}萬元`;
        };
        const constrBudget = fmtBudget(raw.constructionBudget);
        const landBudget   = fmtBudget(raw.landAcquisitionBudget);
        const totalBudget  = fmtBudget(raw.totalBudget);

        const fmtDN = json => {
            if (!json) return '';
            try {
                const arr = JSON.parse(json);
                if (!Array.isArray(arr)) return json;
                return arr.map(i => i.note ? `${i.date}(${i.note})` : i.date).filter(Boolean).join('、');
            } catch { return json; }
        };

        const publicHearing             = fmtDN(last.publicHearing);
        const marketPriceReview         = fmtDN(last.marketPriceReview);
        const negotiatedPurchaseMeeting = fmtDN(last.negotiatedPurchaseMeeting);
        const expropriationPlanPreReview   = fmtDN(last.expropriationPlanPreReview);
        const expropriationPlanSubmission  = fmtDN(last.expropriationPlanSubmission);
        const expropriationApproval     = fmtDN(last.expropriationApproval);

        $('#supplement-export-modal').remove();
        $('#sep-modal-styles').remove();

        $('head').append(`<style id="sep-modal-styles">
            .sep-doc { font-family:"標楷體",serif; font-size:16px; line-height:2; color:#1e293b; }
            .sep-header-para { margin:0 0 2px 0; }
            .sep-label-title { font-weight:700; color:#cc0000; font-size:20px; }
            .sep-label { font-weight:700; }
            .sep-data-table { width:100%; border-collapse:collapse; margin-top:6px; }
            .sep-data-table td { border:1px solid #94a3b8; padding:5px 10px; font-size:16px; vertical-align:middle; }
            .sep-data-table td.sep-key { width:27%; }
            .sep-img-zone { margin-top:10px; border:1px dashed #cbd5e1; min-height:90px; display:flex; align-items:center; justify-content:center; border-radius:4px; overflow:hidden; }
        </style>`);

        const modal = $(`
            <div id="supplement-export-modal" style="
                position:fixed;inset:0;z-index:9999;display:flex;
                align-items:center;justify-content:center;background:rgba(0,0,0,0.45);">
                <div style="background:#fff;border-radius:10px;width:860px;max-height:88vh;
                    display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.2);">

                    <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;
                        display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <strong style="font-size:15px;">匯出補充格式</strong>
                        <button id="sep-close" style="border:none;background:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1;">&times;</button>
                    </div>

                    <div style="display:flex;flex:1;overflow:hidden;">

                        <!-- 左側：圖片上傳 -->
                        <div style="width:210px;flex-shrink:0;border-right:1px solid #e2e8f0;
                            padding:16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;">
                            <div style="font-size:13px;font-weight:600;color:#334155;">開瓶計畫附圖</div>
                            <label id="sep-upload-label" style="display:flex;flex-direction:column;
                                align-items:center;justify-content:center;border:2px dashed #cbd5e1;
                                border-radius:8px;padding:16px 8px;cursor:pointer;font-size:12px;
                                color:#94a3b8;text-align:center;gap:6px;min-height:110px;">
                                <span style="font-size:28px;line-height:1;">+</span>
                                <span>點擊上傳圖片</span>
                                <input type="file" id="sep-img-input" accept="image/*" style="display:none;">
                            </label>
                            <img id="sep-img-thumb" style="display:none;width:100%;border-radius:6px;border:1px solid #e2e8f0;object-fit:contain;max-height:140px;">
                            <button id="sep-clear-img" style="display:none;font-size:12px;color:#ef4444;border:none;background:none;cursor:pointer;padding:0;">移除圖片</button>
                        </div>

                        <!-- 右側：預覽 -->
                        <div style="flex:1;overflow-y:auto;padding:18px 20px;">
                            <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;letter-spacing:.5px;">匯出預覽</div>
                            <div class="sep-doc">
                                <p class="sep-header-para"><span class="sep-label-title">題目</span><span class="sep-label">：</span>${self.escapeHtml(projectName)}</p>
                                <p class="sep-header-para"><span class="sep-label">報告機關(科室)：</span>${self.escapeHtml(executionUnit)}</p>
                                <p class="sep-header-para" style="border-bottom:2px solid #000;padding-bottom:2px;"><span class="sep-label">關心議員：</span>${self.escapeHtml(proposer)}</p>
                                <p class="sep-header-para"><span class="sep-label">執行現況：</span></p>
                                <table class="sep-data-table">
                                    <tr><td class="sep-key">長度</td><td>${self.escapeHtml(roadLength)}</td></tr>
                                    <tr><td class="sep-key">路寬</td><td>${self.escapeHtml(roadWidth)}</td></tr>
                                    <tr><td class="sep-key">工程費</td><td>${self.escapeHtml(constrBudget)}</td></tr>
                                    <tr><td class="sep-key">用地費</td><td>${self.escapeHtml(landBudget)}</td></tr>
                                    <tr><td class="sep-key">總經費</td><td>${self.escapeHtml(totalBudget)}</td></tr>
                                </table>
                                <table class="sep-data-table" style="margin-top:20px;">
                                    <tr><td class="sep-key">公聽會</td><td>${self.escapeHtml(publicHearing)}</td></tr>
                                    <tr><td class="sep-key">徵收市價地評會審查</td><td>${self.escapeHtml(marketPriceReview)}</td></tr>
                                    <tr><td class="sep-key">協議價購會</td><td>${self.escapeHtml(negotiatedPurchaseMeeting)}</td></tr>
                                    <tr><td class="sep-key">徵收計畫書地政局預審</td><td>${self.escapeHtml(expropriationPlanPreReview)}</td></tr>
                                    <tr><td class="sep-key">徵收計劃書報部</td><td>${self.escapeHtml(expropriationPlanSubmission)}</td></tr>
                                    <tr><td class="sep-key">徵收核定</td><td>${self.escapeHtml(expropriationApproval)}</td></tr>
                                </table>
                                <p class="sep-header-para" style="white-space:pre-wrap;"><span>${self.escapeHtml(currentStatus)}</span></p>
                                <div class="sep-img-zone" id="sep-preview-img-zone">
                                    <span style="color:#cbd5e1;font-size:12px;">開瓶計畫附圖（上傳後顯示）</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;">
                        <button id="sep-cancel" style="padding:7px 18px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;">取消</button>
                        <button id="sep-confirm" style="padding:7px 18px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;font-size:14px;">確認匯出</button>
                    </div>
                </div>
            </div>`);

        $('body').append(modal);

        let imageDataUrl = null;

        modal.on('change', '#sep-img-input', function() {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                imageDataUrl = e.target.result;
                $('#sep-img-thumb').attr('src', imageDataUrl).show();
                $('#sep-clear-img').show();
                $('#sep-preview-img-zone').html(`<img src="${imageDataUrl}" style="max-width:100%;max-height:220px;object-fit:contain;">`);
            };
            reader.readAsDataURL(file);
        });

        modal.on('click', '#sep-clear-img', function() {
            imageDataUrl = null;
            $('#sep-img-input').val('');
            $('#sep-img-thumb').attr('src', '').hide();
            $(this).hide();
            $('#sep-preview-img-zone').html('<span style="color:#cbd5e1;font-size:12px;">開瓶計畫附圖（上傳後顯示）</span>');
        });

        const closeModal = () => {
            $('#sep-modal-styles').remove();
            modal.remove();
        };

        modal.on('click', '#sep-close, #sep-cancel', closeModal);
        modal.on('click', function(e) { if (e.target === this) closeModal(); });

        modal.on('click', '#sep-confirm', async () => {
            closeModal();

            const payload = {
                projectId: self.projectId,
                projectName,
                executionUnit,
                proposer,
                currentStatus,
                roadLength,
                currentRoadWidth: roadWidth,
                constructionBudget: constrBudget,
                landAcquisitionBudget: landBudget,
                totalBudget,
                startDate,
                endDate,
                publicHearing,
                marketPriceReview,
                negotiatedPurchaseMeeting,
                expropriationPlanPreReview,
                expropriationPlanSubmission,
                expropriationApproval,
                imageBase64: imageDataUrl || null
            };

            try {
                showLoading();
                const response = await fetch('/api/RoadProject/ExportSupplementWord', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('伺服器回傳錯誤');
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
                a.download = `局長補充資料_${projectName}_${today}.docx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // 儲存匯出記錄至專案歷程
                const fileName = `局長補充資料_${projectName}_${today}.docx`;
                const recordRes = await fetch('/api/RoadProject/AddAllProcessRecord', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ProjectId: self.projectId,
                        RecordType: '局長補充格式',
                        RecordTitle: fileName.replace('.docx', ''),
                        ProjectName: projectName,
                        ExecutionUnit: executionUnit,
                        CurrentStatus: currentStatus,
                        CreatedAt: new Date().toISOString()
                    })
                });
                const recordResult = await recordRes.json();

                // 將 Word 檔上傳為佐證文件
                if (recordResult.success && recordResult.processId) {
                    const wordFile = new File([blob], fileName, {
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    const formData = new FormData();
                    formData.append('processId', recordResult.processId);
                    formData.append('file', wordFile);
                    await fetch('/api/RoadProject/UploadProcessFile', { method: 'POST', body: formData });

                    // 一併上傳開瓶計畫附圖
                    if (imageDataUrl) {
                        const mimeType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
                        const ext = mimeType === 'image/png' ? 'png' : 'jpg';
                        const imgBytes = Uint8Array.from(atob(imageDataUrl.split(',')[1]), c => c.charCodeAt(0));
                        const imgFile = new File([imgBytes], `開瓶計畫附圖_${projectName}_${today}.${ext}`, { type: mimeType });
                        const imgFormData = new FormData();
                        imgFormData.append('processId', recordResult.processId);
                        imgFormData.append('file', imgFile);
                        await fetch('/api/RoadProject/UploadProcessFile', { method: 'POST', body: imgFormData });
                    }
                }
                self.fetchAllProcessData(self.projectId);
            } catch (e) {
                alert('匯出 Word 失敗：' + e.message);
            } finally {
                hideLoading();
            }
        });
    },

};

export default ProcessBox;