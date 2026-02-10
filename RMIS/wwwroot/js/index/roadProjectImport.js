import BoxManager from './box.js';

/**
 * 道路專案匯入模組
 * 功能：匯入 Excel 道路專案資料與照片壓縮檔
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

        // 綁定清除上傳按鈕事件
        $(document).on('click', '#btn-cancel-project-import', function() {
            self.clearUpload();
        });

        // 綁定提交按鈕事件
        $(document).on('click', '#btn-submit-project-import', function() {
            self.submitImport();
        });

        // 綁定 Excel 上傳區域點擊事件
        $(document).on('click', '#excelUploadArea', function() {
            $('#excelFileInput').click();
        });

        // 綁定 ZIP 上傳區域點擊事件
        $(document).on('click', '#zipUploadArea', function() {
            $('#zipFileInput').click();
        });

        // 綁定 Excel 檔案選擇事件
        $(document).on('change', '#excelFileInput', function(e) {
            if (e.target.files.length > 0) {
                self.setExcelFile(e.target.files[0]);
            }
        });

        // 綁定 ZIP 檔案選擇事件
        $(document).on('change', '#zipFileInput', function(e) {
            if (e.target.files.length > 0) {
                self.setZipFile(e.target.files[0]);
            }
        });

        // 綁定移除檔案按鈕
        $(document).on('click', '.btn-remove-file', function() {
            const target = $(this).data('target');
            if (target === 'excel') {
                self.removeExcelFile();
            } else if (target === 'zip') {
                self.removeZipFile();
            }
        });

        // 設定拖曳事件
        self.setupDragAndDrop();

        console.log("RoadProjectImport 模組初始化完成");
    },

    /**
     * 設定拖曳上傳功能
     */
    setupDragAndDrop: function() {
        const self = this;

        // Excel 上傳區域拖曳
        $(document).on('dragover', '#excelUploadArea', function(e) {
            e.preventDefault();
            $(this).addClass('drag-over');
        });

        $(document).on('dragleave', '#excelUploadArea', function(e) {
            e.preventDefault();
            $(this).removeClass('drag-over');
        });

        $(document).on('drop', '#excelUploadArea', function(e) {
            e.preventDefault();
            $(this).removeClass('drag-over');
            const files = e.originalEvent.dataTransfer.files;
            if (files.length > 0 && files[0].name.endsWith('.xlsx')) {
                self.setExcelFile(files[0]);
            } else {
                alert('請上傳 .xlsx 格式的 Excel 檔案');
            }
        });

        // ZIP 上傳區域拖曳
        $(document).on('dragover', '#zipUploadArea', function(e) {
            e.preventDefault();
            $(this).addClass('drag-over');
        });

        $(document).on('dragleave', '#zipUploadArea', function(e) {
            e.preventDefault();
            $(this).removeClass('drag-over');
        });

        $(document).on('drop', '#zipUploadArea', function(e) {
            e.preventDefault();
            $(this).removeClass('drag-over');
            const files = e.originalEvent.dataTransfer.files;
            if (files.length > 0 && files[0].name.endsWith('.zip')) {
                self.setZipFile(files[0]);
            } else {
                alert('請上傳 .zip 格式的壓縮檔');
            }
        });
    },

    /**
     * 設定 Excel 檔案
     */
    setExcelFile: function(file) {
        this.excelFile = file;
        $('#excelUploadArea').addClass('hidden');
        $('#excelFileInfo').removeClass('hidden').find('.file-name').text(file.name);
    },

    /**
     * 移除 Excel 檔案
     */
    removeExcelFile: function() {
        this.excelFile = null;
        $('#excelFileInput').val('');
        $('#excelUploadArea').removeClass('hidden');
        $('#excelFileInfo').addClass('hidden');
    },

    /**
     * 設定 ZIP 檔案
     */
    setZipFile: function(file) {
        this.zipFile = file;
        $('#zipUploadArea').addClass('hidden');
        $('#zipFileInfo').removeClass('hidden').find('.file-name').text(file.name);
    },

    /**
     * 移除 ZIP 檔案
     */
    removeZipFile: function() {
        this.zipFile = null;
        $('#zipFileInput').val('');
        $('#zipUploadArea').removeClass('hidden');
        $('#zipFileInfo').addClass('hidden');
    },

    /**
     * 開啟匯入頁面
     */
    openImport: function() {
        const self = this;

        // 重置狀態
        self.excelFile = null;
        self.zipFile = null;
        self.isImporting = false;

        // 重置 UI
        $('#excelFileInput').val('');
        $('#zipFileInput').val('');
        $('#excelUploadArea').removeClass('hidden');
        $('#zipUploadArea').removeClass('hidden');
        $('#excelFileInfo').addClass('hidden');
        $('#zipFileInfo').addClass('hidden');
        $('#importResultSection').addClass('hidden');

        // 使用 BoxManager 開啟右側 Box
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
     * 提交匯入
     */
    submitImport: function() {
        const self = this;

        // 驗證 Excel 檔案
        if (!self.excelFile) {
            alert('請選擇 Excel 檔案');
            return;
        }

        // 防止重複提交
        if (self.isImporting) {
            return;
        }

        self.isImporting = true;
        const $submitBtn = $('#btn-submit-project-import');
        const originalText = $submitBtn.text();
        $submitBtn.text('匯入中...').addClass('btn-loading').prop('disabled', true);

        // 建立 FormData
        const formData = new FormData();
        formData.append('ExcelFile', self.excelFile);
        if (self.zipFile) {
            formData.append('PhotoZipFile', self.zipFile);
        }

        // 呼叫 API
        fetch('/Admin/ImportRoadProjectByExcel', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            self.showResult(result);

            // 如果成功，觸發專案列表刷新
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
            $resultContent.html(`
                <div class="result-title">匯入成功</div>
                <div class="result-message">成功匯入 ${result.importedCount} 筆道路專案資料</div>
            `);
        } else {
            $resultSection.addClass('error');
            let errorHtml = `
                <div class="result-title">匯入失敗</div>
                <div class="result-message">${result.message}</div>
            `;

            if (result.errors && result.errors.length > 0) {
                errorHtml += '<ul class="error-list">';
                result.errors.forEach(err => {
                    errorHtml += `<li>${err}</li>`;
                });
                errorHtml += '</ul>';
            }

            $resultContent.html(errorHtml);
        }
    }
};

export default RoadProjectImport;
