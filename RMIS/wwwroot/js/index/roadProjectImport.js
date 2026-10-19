import BoxManager from './box.js';
import { showLoading, hideLoading } from '../loading.js';

/**
 * 道路專案匯入模組
 * 功能：匯入 Excel 道路專案資料、照片壓縮檔
 */
const RoadProjectImport = {

    // 已選擇的檔案
    excelFile: null,
    zipFile: null,

    // 是否正在匯入中
    isImporting: false,

    /**
     * 初始化匯入模組
     */
    init: function() {
        const self = this;

        // 清除上傳
        $(document).on('click', '#btn-cancel-project-import', function() {
            self.clearUpload();
        });

        // 提交
        $(document).on('click', '#btn-submit-project-import', function() {
            self.submitImport();
        });

        // 上傳區域點擊
        $(document).on('click', '#excelUploadArea', function() { $('#excelFileInput').click(); });
        $(document).on('click', '#zipUploadArea',   function() { $('#zipFileInput').click(); });

        // 檔案選擇事件
        $(document).on('change', '#excelFileInput', function(e) {
            if (e.target.files.length > 0) self.setExcelFile(e.target.files[0]);
        });
        $(document).on('change', '#zipFileInput', function(e) {
            if (e.target.files.length > 0) self.setZipFile(e.target.files[0]);
        });

        // 移除檔案按鈕
        $(document).on('click', '.btn-remove-file', function() {
            const target = $(this).data('target');
            if      (target === 'excel') self.removeExcelFile();
            else if (target === 'zip')   self.removeZipFile();
        });

        // 拖曳事件
        self.setupDragAndDrop();

        console.log("RoadProjectImport 模組初始化完成");
    },

    /**
     * 設定拖曳上傳功能
     */
    setupDragAndDrop: function() {
        const self = this;

        const areas = [
            { areaId: '#excelUploadArea', accept: '.xlsx', onDrop: f => self.setExcelFile(f), hint: '.xlsx 格式的 Excel 檔案' },
            { areaId: '#zipUploadArea',   accept: '.zip',  onDrop: f => self.setZipFile(f),   hint: '.zip 格式的壓縮檔' },
        ];

        areas.forEach(({ areaId, accept, onDrop, hint }) => {
            $(document).on('dragover', areaId, function(e) {
                e.preventDefault();
                $(this).addClass('drag-over');
            });
            $(document).on('dragleave', areaId, function(e) {
                e.preventDefault();
                $(this).removeClass('drag-over');
            });
            $(document).on('drop', areaId, function(e) {
                e.preventDefault();
                $(this).removeClass('drag-over');
                const files = e.originalEvent.dataTransfer.files;
                if (files.length > 0 && files[0].name.endsWith(accept)) {
                    onDrop(files[0]);
                } else {
                    alert(`請上傳 ${hint}`);
                }
            });
        });
    },

    /**
     * 計算目前已選擇的檔案總大小（bytes）
     */
    getTotalSize: function({ excel, zip } = {}) {
        return (
            ((excel !== undefined ? excel : this.excelFile)?.size || 0) +
            ((zip   !== undefined ? zip   : this.zipFile)?.size   || 0)
        );
    },

    // ── 道路專案 Excel ──
    setExcelFile: function(file) {
        if (this._checkSize({ excel: file })) return;
        this.excelFile = file;
        $('#excelUploadArea').addClass('hidden');
        $('#excelFileInfo').removeClass('hidden').find('.file-name').text(file.name);
    },
    removeExcelFile: function() {
        this.excelFile = null;
        $('#excelFileInput').val('');
        $('#excelUploadArea').removeClass('hidden');
        $('#excelFileInfo').addClass('hidden');
    },

    // ── 道路專案照片 ZIP ──
    setZipFile: function(file) {
        if (this._checkSize({ zip: file })) return;
        this.zipFile = file;
        $('#zipUploadArea').addClass('hidden');
        $('#zipFileInfo').removeClass('hidden').find('.file-name').text(file.name);
    },
    removeZipFile: function() {
        this.zipFile = null;
        $('#zipFileInput').val('');
        $('#zipUploadArea').removeClass('hidden');
        $('#zipFileInfo').addClass('hidden');
    },

    /**
     * 大小檢查輔助（超限時清除對應 input 並回傳 true）
     */
    _checkSize: function(override) {
        const totalSize = this.getTotalSize(override);
        if (totalSize > 100 * 1024 * 1024) {
            alert(`檔案總大小超過限制（100 MB），目前合計 ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
            const key = Object.keys(override)[0];
            const inputMap = {
                excel: '#excelFileInput',
                zip:   '#zipFileInput',
            };
            $(inputMap[key]).val('');
            return true;
        }
        return false;
    },

    /**
     * 開啟匯入頁面
     */
    openImport: function() {
        this.excelFile   = null;
        this.zipFile     = null;
        this.isImporting = false;

        ['#excelFileInput', '#zipFileInput'].forEach(id => $(id).val(''));
        ['#excelUploadArea', '#zipUploadArea'].forEach(id => $(id).removeClass('hidden'));
        ['#excelFileInfo', '#zipFileInfo'].forEach(id => $(id).addClass('hidden'));
        $('#importResultSection').addClass('hidden');

        BoxManager.openRightBoxPage('page-project-import', '道路專案匯入');
    },

    /**
     * 清除上傳的檔案
     */
    clearUpload: function() {
        this.removeExcelFile();
        this.removeZipFile();
        $('#importResultSection').addClass('hidden');
    },

    /**
     * 關閉匯入頁面
     */
    closeImport: function() {
        BoxManager.closeRightBox();
    },

    /**
     * 提交匯入：先檢查 Excel 中的專案編號，再執行匯入
     */
    submitImport: async function() {
        const self = this;

        if (!self.excelFile) {
            alert('請選擇道路專案 Excel');
            return;
        }

        const totalSize = self.getTotalSize();
        if (totalSize > 100 * 1024 * 1024) {
            alert(`檔案總大小超過限制（100 MB），目前合計 ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
            return;
        }

        if (self.isImporting) return;
        self.isImporting = true;

        const $submitBtn = $('#btn-submit-project-import');
        const originalText = $submitBtn.text();
        $submitBtn.addClass('btn-loading').prop('disabled', true);
        $('#importResultSection').addClass('hidden');

        try {
            // 1. 匯入前檢查專案編號
            $submitBtn.text('檢查中...');
            showLoading('檢查專案編號中...', '#right-box');
            const proceed = await self.checkProjectIds();
            hideLoading('#right-box');
            if (!proceed) return;

            // 2. 執行匯入
            $submitBtn.text('匯入中...');
            showLoading('匯入中...', '#right-box');

            const formData = new FormData();
            formData.append('ExcelFile', self.excelFile);
            if (self.zipFile) formData.append('PhotoZipFile', self.zipFile);

            const response = await fetch('/Admin/ImportRoadProjectByExcel', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            self.showResult(result);
            if (result.success) {
                $(document).trigger('projectAdded');
            }
        } catch (error) {
            console.error('匯入失敗:', error);
            self.showResult({
                success: false,
                message: '匯入發生錯誤: ' + error.message,
                errors: []
            });
        } finally {
            self.isImporting = false;
            $submitBtn.text(originalText).removeClass('btn-loading').prop('disabled', false);
            hideLoading('#right-box');
        }
    },

    /**
     * 匯入前檢查 Excel 中的專案編號：
     * - Excel 內有重複編號 → 顯示錯誤並中止
     * - 既有專案的建立者非本人 → 顯示無更新權限並中止
     * - 編號已存在於系統 → 詢問是否更新（覆蓋）舊專案
     * @returns {Promise<boolean>} 是否繼續匯入
     */
    checkProjectIds: async function() {
        const formData = new FormData();
        formData.append('ExcelFile', this.excelFile);

        const response = await fetch('/Admin/CheckRoadProjectImport', {
            method: 'POST',
            body: formData
        });
        const check = await response.json();

        if (!check.success) {
            this.showResult({ success: false, message: check.message, errors: check.errors || [] });
            return false;
        }

        if (check.duplicateInFile && check.duplicateInFile.length > 0) {
            this.showResult({
                success: false,
                message: 'Excel 中有重複的專案編號，請修正後再匯入',
                errors: check.duplicateInFile.map(d => `專案編號 ${d.projectId} 重複出現於第 ${d.rowNumbers.join('、')} 列`)
            });
            return false;
        }

        if (check.noPermissionProjects && check.noPermissionProjects.length > 0) {
            this.showResult({
                success: false,
                message: '未具有現存專案更新權限，以下專案非本人建立，無法更新',
                errors: check.noPermissionProjects.map(p => `專案 ${p.projectId}${p.projectName ? `（${p.projectName}）` : ''}`)
            });
            return false;
        }

        const existing = check.existingProjects || [];
        if (existing.length > 0) {
            const maxShow = 15;
            const lines = existing.slice(0, maxShow)
                .map(p => `・${p.projectId}${p.projectName ? `（${p.projectName}）` : ''}`);
            if (existing.length > maxShow) lines.push(`…等共 ${existing.length} 筆`);

            const newCount = check.totalCount - existing.length;
            let msg = `Excel 共 ${check.totalCount} 筆，其中 ${existing.length} 筆專案編號已存在於系統：\n\n`
                    + lines.join('\n')
                    + `\n\n是否以 Excel 內容更新（覆蓋）這些舊專案？`;
            if (this.zipFile) msg += '\n※ 這些專案原有的照片將被壓縮檔內容取代。';
            if (newCount > 0) msg += `\n（另有 ${newCount} 筆為新增專案）`;

            return confirm(msg);
        }

        return true;
    },

    /**
     * 顯示匯入結果
     */
    showResult: function(result) {
        const $resultSection = $('#importResultSection');
        const $resultContent = $('#importResultContent');

        $resultSection.removeClass('hidden success error');

        if (result.success) {
            $resultSection.addClass('success');
            let html = '<div class="result-title">匯入成功</div>';
            const parts = [];
            if (result.importedCount > 0) parts.push(`新增 ${result.importedCount} 筆`);
            if (result.updatedCount > 0) parts.push(`更新 ${result.updatedCount} 筆`);
            if (parts.length > 0) {
                html += `<div class="result-message">${parts.join('、')}</div>`;
            }
            $resultContent.html(html);
        } else {
            $resultSection.addClass('error');
            let errorHtml = `
                <div class="result-title">匯入失敗</div>
                <div class="result-message">${result.message}</div>
            `;
            if (result.errors && result.errors.length > 0) {
                errorHtml += '<ul class="error-list">';
                result.errors.forEach(err => { errorHtml += `<li>${err}</li>`; });
                errorHtml += '</ul>';
            }
            $resultContent.html(errorHtml);
        }
    }
};

export default RoadProjectImport;
