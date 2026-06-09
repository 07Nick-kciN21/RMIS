/**
 * Excel 匯入道路專案模組
 */
(function() {
    'use strict';

    const $excelFile = document.getElementById('excel-file');
    const $zipFile = document.getElementById('photo-zip-file');
    const $excelUploadArea = document.getElementById('excel-upload-area');
    const $zipUploadArea = document.getElementById('zip-upload-area');
    const $excelFileName = document.getElementById('excel-file-name');
    const $zipFileName = document.getElementById('zip-file-name');
    const $form = document.getElementById('import-form');
    const $btnImport = document.getElementById('btn-import');
    const $result = document.getElementById('import-result');
    const $loading = document.getElementById('import-loading');
    const $downloadTemplate = document.getElementById('download-template');

    // 初始化
    function init() {
        bindFileUploadEvents($excelFile, $excelUploadArea, $excelFileName);
        bindFileUploadEvents($zipFile, $zipUploadArea, $zipFileName);
        bindFormSubmit();
        bindDownloadTemplate();
    }

    // 綁定檔案上傳事件
    function bindFileUploadEvents(fileInput, uploadArea, fileNameSpan) {
        // 拖曳事件
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                updateFileName(fileInput, uploadArea, fileNameSpan);
            }
        });

        // 檔案選擇事件
        fileInput.addEventListener('change', function() {
            updateFileName(fileInput, uploadArea, fileNameSpan);
        });
    }

    // 更新檔案名稱顯示
    function updateFileName(fileInput, uploadArea, fileNameSpan) {
        if (fileInput.files.length > 0) {
            fileNameSpan.textContent = fileInput.files[0].name;
            uploadArea.classList.add('has-file');
        } else {
            fileNameSpan.textContent = '';
            uploadArea.classList.remove('has-file');
        }
    }

    // 綁定表單提交
    function bindFormSubmit() {
        $form.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!$excelFile.files.length) {
                alert('請選擇 Excel 檔案');
                return;
            }

            // 顯示載入中
            $loading.classList.remove('hidden');
            $result.classList.add('hidden');
            $btnImport.disabled = true;

            try {
                const formData = new FormData();
                formData.append('ExcelFile', $excelFile.files[0]);

                if ($zipFile.files.length > 0) {
                    formData.append('PhotoZipFile', $zipFile.files[0]);
                }

                const response = await fetch('/Admin/ImportRoadProjectByExcel', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                showResult(data);
            } catch (error) {
                console.error('匯入失敗:', error);
                showResult({
                    success: false,
                    message: '匯入發生錯誤: ' + error.message,
                    errors: []
                });
            } finally {
                $loading.classList.add('hidden');
                $btnImport.disabled = false;
            }
        });
    }

    // 顯示結果
    function showResult(data) {
        $result.classList.remove('hidden', 'success', 'error');
        $result.classList.add(data.success ? 'success' : 'error');

        const $message = $result.querySelector('.result-message');
        const $details = $result.querySelector('.result-details');

        $message.textContent = data.message || (data.success ? '匯入成功' : '匯入失敗');

        if (data.errors && data.errors.length > 0) {
            let html = '<ul>';
            data.errors.forEach(function(err) {
                html += `<li>${err}</li>`;
            });
            html += '</ul>';
            $details.innerHTML = html;
        } else if (data.importedCount) {
            $details.innerHTML = `<p>成功匯入 ${data.importedCount} 筆專案資料</p>`;
        } else {
            $details.innerHTML = '';
        }

        // 滾動到結果區域
        $result.scrollIntoView({ behavior: 'smooth' });
    }

    // 下載範本
    function bindDownloadTemplate() {
        $downloadTemplate.addEventListener('click', function(e) {
            e.preventDefault();
            generateTemplate();
        });
    }

    // 產生 Excel 範本
    function generateTemplate() {
        // 使用 SheetJS (XLSX) 產生範本
        // 如果沒有 SheetJS，則提示下載
        if (typeof XLSX === 'undefined') {
            alert('請聯繫管理員取得範本檔案');
            return;
        }

        const headers = [
            '專案代號', '提案人', '行政區', '起點', '終點', '起訖位置',
            '道路長度', '現況路寬', '計畫路寬', '公有土地', '私有土地', '公私土地',
            '工程經費', '用地經費', '補償經費', '合計經費', '備註',
            '審議年度', '案件類型', '工程名稱', 'RC數量', '鐵皮屋數量', '審議結果',
            '拓寬範圍座標', '街景照片座標', '施工進度'
        ];

        const sampleData = [
            'RP20240101001', '王小明', '桃園區', '中正路', '民生路', '中正路至民生路',
            '500', '8', '12', '5', '10', '3',
            '1000000', '2000000', '500000', '3500000', '備註說明',
            '113', '新案', '中正路拓寬工程', '2', '1', '通過',
            '[{"lat":24.993,"lng":121.301},{"lat":24.994,"lng":121.302}]',
            '[{"lat":24.993,"lng":121.301,"photoName":"photo1.jpg"}]',
            '0'
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
        XLSX.utils.book_append_sheet(wb, ws, '道路專案');
        XLSX.writeFile(wb, '道路專案匯入範本.xlsx');
    }

    // DOM 載入完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
