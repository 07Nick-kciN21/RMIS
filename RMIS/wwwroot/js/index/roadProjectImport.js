import BoxManager from './box.js';

/**
 * 道路專案匯入模組
 * 功能：匯入 Excel 道路專案資料、照片壓縮檔、歷程 Excel、歷程文件壓縮檔
 */
const RoadProjectImport = {

    // 已選擇的檔案
    excelFile: null,
    zipFile: null,
    processExcelFile: null,
    processDocZipFile: null,

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
        $(document).on('click', '#excelUploadArea',          function() { $('#excelFileInput').click(); });
        $(document).on('click', '#zipUploadArea',            function() { $('#zipFileInput').click(); });
        $(document).on('click', '#processExcelUploadArea',   function() { $('#processExcelFileInput').click(); });
        $(document).on('click', '#processDocZipUploadArea',  function() { $('#processDocZipFileInput').click(); });

        // 檔案選擇事件
        $(document).on('change', '#excelFileInput', function(e) {
            if (e.target.files.length > 0) self.setExcelFile(e.target.files[0]);
        });
        $(document).on('change', '#zipFileInput', function(e) {
            if (e.target.files.length > 0) self.setZipFile(e.target.files[0]);
        });
        $(document).on('change', '#processExcelFileInput', function(e) {
            if (e.target.files.length > 0) self.setProcessExcelFile(e.target.files[0]);
        });
        $(document).on('change', '#processDocZipFileInput', function(e) {
            if (e.target.files.length > 0) self.setProcessDocZipFile(e.target.files[0]);
        });

        // 移除檔案按鈕
        $(document).on('click', '.btn-remove-file', function() {
            const target = $(this).data('target');
            if      (target === 'excel')          self.removeExcelFile();
            else if (target === 'zip')            self.removeZipFile();
            else if (target === 'processExcel')   self.removeProcessExcelFile();
            else if (target === 'processDocZip')  self.removeProcessDocZipFile();
        });

        // 欄位說明 Tab 切換
        $(document).on('click', '.col-doc-tab', function() {
            const tab = $(this).data('tab');
            $('.col-doc-tab').removeClass('active');
            $(this).addClass('active');
            $('.col-doc-panel').addClass('hidden');
            $(`#colDoc${tab.charAt(0).toUpperCase() + tab.slice(1)}`).removeClass('hidden');
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
            { areaId: '#excelUploadArea',         accept: '.xlsx', onDrop: f => self.setExcelFile(f),         hint: '.xlsx 格式的 Excel 檔案' },
            { areaId: '#zipUploadArea',            accept: '.zip',  onDrop: f => self.setZipFile(f),           hint: '.zip 格式的壓縮檔' },
            { areaId: '#processExcelUploadArea',   accept: '.xlsx', onDrop: f => self.setProcessExcelFile(f),  hint: '.xlsx 格式的 Excel 檔案' },
            { areaId: '#processDocZipUploadArea',  accept: '.zip',  onDrop: f => self.setProcessDocZipFile(f), hint: '.zip 格式的壓縮檔' },
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
    getTotalSize: function({ excel, zip, processExcel, processDocZip } = {}) {
        return (
            (excel         !== undefined ? excel         : this.excelFile)?.size         || 0) +
            ((zip          !== undefined ? zip           : this.zipFile)?.size           || 0) +
            ((processExcel !== undefined ? processExcel  : this.processExcelFile)?.size  || 0) +
            ((processDocZip!== undefined ? processDocZip : this.processDocZipFile)?.size || 0
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

    // ── 歷程 Excel ──
    setProcessExcelFile: function(file) {
        if (this._checkSize({ processExcel: file })) return;
        this.processExcelFile = file;
        $('#processExcelUploadArea').addClass('hidden');
        $('#processExcelFileInfo').removeClass('hidden').find('.file-name').text(file.name);
    },
    removeProcessExcelFile: function() {
        this.processExcelFile = null;
        $('#processExcelFileInput').val('');
        $('#processExcelUploadArea').removeClass('hidden');
        $('#processExcelFileInfo').addClass('hidden');
    },

    // ── 歷程文件 ZIP ──
    setProcessDocZipFile: function(file) {
        if (this._checkSize({ processDocZip: file })) return;
        this.processDocZipFile = file;
        $('#processDocZipUploadArea').addClass('hidden');
        $('#processDocZipFileInfo').removeClass('hidden').find('.file-name').text(file.name);
    },
    removeProcessDocZipFile: function() {
        this.processDocZipFile = null;
        $('#processDocZipFileInput').val('');
        $('#processDocZipUploadArea').removeClass('hidden');
        $('#processDocZipFileInfo').addClass('hidden');
    },

    /**
     * 大小檢查輔助（超限時清除對應 input 並回傳 true）
     */
    _checkSize: function(override) {
        const totalSize = this.getTotalSize(override);
        if (totalSize > 100 * 1024 * 1024) {
            alert(`檔案總大小超過限制（100 MB），目前合計 ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
            // 清除超限的那個 input
            const key = Object.keys(override)[0];
            const inputMap = {
                excel:         '#excelFileInput',
                zip:           '#zipFileInput',
                processExcel:  '#processExcelFileInput',
                processDocZip: '#processDocZipFileInput',
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
        // 重置狀態
        this.excelFile         = null;
        this.zipFile           = null;
        this.processExcelFile  = null;
        this.processDocZipFile = null;
        this.isImporting       = false;

        // 重置 UI
        ['#excelFileInput', '#zipFileInput', '#processExcelFileInput', '#processDocZipFileInput'].forEach(id => $(id).val(''));
        ['#excelUploadArea', '#zipUploadArea', '#processExcelUploadArea', '#processDocZipUploadArea'].forEach(id => $(id).removeClass('hidden'));
        ['#excelFileInfo', '#zipFileInfo', '#processExcelFileInfo', '#processDocZipFileInfo'].forEach(id => $(id).addClass('hidden'));
        $('#importResultSection').addClass('hidden');

        // 重置 Tab 為道路專案
        $('.col-doc-tab').removeClass('active');
        $('.col-doc-tab[data-tab="project"]').addClass('active');
        $('.col-doc-panel').addClass('hidden');
        $('#colDocProject').removeClass('hidden');

        BoxManager.openRightBoxPage('page-project-import', '道路專案匯入');
    },

    /**
     * 清除上傳的檔案
     */
    clearUpload: function() {
        this.removeExcelFile();
        this.removeZipFile();
        this.removeProcessExcelFile();
        this.removeProcessDocZipFile();
        $('#importResultSection').addClass('hidden');
    },

    /**
     * 關閉匯入頁面
     */
    closeImport: function() {
        BoxManager.closeRightBox();
    },

    /**
     * 提交匯入
     */
    submitImport: function() {
        const self = this;

        if (!self.excelFile && !self.processExcelFile) {
            alert('請至少選擇道路專案 Excel 或歷程 Excel');
            return;
        }

        if (self.excelFile == null && self.processExcelFile != null) {
            // 僅匯入歷程（允許）
        }

        if (self.processDocZipFile && !self.processExcelFile) {
            alert('上傳歷程文件壓縮檔時，請同時提供歷程 Excel');
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
        $submitBtn.text('匯入中...').addClass('btn-loading').prop('disabled', true);
        showLoading('匯入中...', '#right-box');

        // 建立 FormData
        const formData = new FormData();
        if (self.excelFile)         formData.append('ExcelFile',         self.excelFile);
        if (self.zipFile)           formData.append('PhotoZipFile',      self.zipFile);
        if (self.processExcelFile)  formData.append('ProcessExcelFile',  self.processExcelFile);
        if (self.processDocZipFile) formData.append('ProcessDocZipFile', self.processDocZipFile);

        fetch('/Admin/ImportRoadProjectByExcel', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            self.showResult(result);
            if (result.success) {
                $(document).trigger('projectAdded');
            }
        })
        .catch(error => {
            console.error('匯入失敗:', error);
            self.showResult({
                success: false,
                message: '匯入發生錯誤: ' + error.message,
                errors: []
            });
        })
        .finally(() => {
            self.isImporting = false;
            $submitBtn.text(originalText).removeClass('btn-loading').prop('disabled', false);
            hideLoading('#right-box');
        });
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
            if (result.importedCount > 0) {
                html += `<div class="result-message">成功匯入 ${result.importedCount} 筆道路專案資料</div>`;
            }
            if (result.processImportedCount > 0) {
                html += `<div class="result-message">成功匯入 ${result.processImportedCount} 筆歷程資料</div>`;
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
