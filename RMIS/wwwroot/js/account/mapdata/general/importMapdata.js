let map = null;
let isAdvancedExpanded = false;
// 全域變數
let uploadedImages = [];
let uploadedPhotos = [];
let selectedSyncLayers = [];
let advancedConfig = {};
let associatedLayerConfig = null;
$(document).ready(function () {
    initLayerSelect();
    initAdvancedOptions();
    // 初始化leaflet地圖
    map = L.map('map').setView([24.99305818692662, 121.3010601], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    $('#formatSelect').on('change', function () {
        const format = $(this).val();
        const $fileInput = $('#Xlsx_or_Kml');
        if (format === 'xlsx') {
            $fileInput.attr('accept', '.xlsx');
        } else if (format === 'kml') {
            $fileInput.attr('accept', '.kml,.xml');
        } else {
            $fileInput.removeAttr('accept');
        }
    });
    // 預設初始化一次
    $('#formatSelect').trigger('change');

    $('#Xlsx_or_Kml').on('change', function () {
        $("#result").empty();
        var format = $('#formatSelect').val();
        console.log(format);
        // 獲取選擇的檔案
        const file = this.files[0];
        // 沒有選擇檔案就不做事
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isXlsx = fileName.endsWith('.xlsx');
        const isKmlOrXml = fileName.endsWith('.kml') || fileName.endsWith('.xml');
        // ✅ 檢查格式與選項是否匹配
        if (format === 'xlsx' && isXlsx) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                showResult_xlsx(content);
            };
            reader.readAsArrayBuffer(file);
        } else if (format === 'kml' && isKmlOrXml) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                showResult_kml(content);
            };
            reader.readAsText(file);
        } else {
            alert("檔案格式與選取類型不符，請重新選擇！");
            $(this).val(""); // ✅ 清除已選擇的檔案（阻擋上傳）
            return; // ✅ 阻止後續處理
        }
        $("#showContainer").removeClass("d-none");
    });

    $('#submit').on('click', function (e) {
        e.preventDefault();

        const payload = {
            LayerId: $("#LayerId").val(),
            LayerName: $("#LayerName").val(),
            LayerKind: $("#LayerKind").val(),
            LayerSvg: $("#LayerSvg").val(),
            LayerColor: $("#LayerColor").val(),
            District: $("#District").val(),
            ImportMapdataAreas: unifiedFeatures, // 這裡是 JS 陣列
            Associated_table: advancedConfig.associated_table || null,
        };
        // const formData = new FormData();

        // formData.append("LayerId", $("#LayerId").val());
        // formData.append("LayerName", $("#LayerName").val());
        // formData.append("LayerKind", $("#LayerKind").val());
        // formData.append("LayerSvg", $("#LayerSvg").val());
        // formData.append("LayerColor", $("#LayerColor").val());
        // formData.append("District", $("#District").val());
        // formData.append("ImportMapdataAreas", unifiedFeatures);
        // ✅ 加入所有照片檔案（每張圖為 IFormFile）
        // uploadedPhotos.forEach((photo, i) => {
        //     formData.append("Photos", photo.file, photo.name);
        // });

        // // 如果也要上傳原始的 Xlsx/Kml 檔案（選填）
        // const file = $('#Xlsx_or_Kml')[0].files[0];
        // if (file) {
        //     formData.append("Xlsx_or_Kml", file);
        // }

        showLoading();
        // if(advancedConfig.advanced)
        $.ajax({
            url: '/Mapdata/General/Import',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload), // ✅ 傳送 JSON
            success: function (data) {
                if (data.success) {
                    alert('匯入成功！');
                } else {
                    alert(data.message || '匯入失敗');
                }
                hideLoading();
                location.reload(); // ✅ 重新載入頁面
            },
            error: function (xhr) {
                alert('匯入過程發生錯誤');
                console.error(xhr);
                hideLoading();
            }
        });
        // 在這裡可以隱藏 loading spinner 或其他 UI 元素
        console.log("AJAX 請求完成");
        // $.ajax({
        //     url: '/Mapdata/General/Import',
        //     type: 'POST',
        //     data: formData,
        //     processData: false,       // ✅ 不處理成 query string
        //     contentType: false,       // ✅ 讓瀏覽器自動設 Content-Type
        //     success: function (data) {
        //         alert(data.success ? '匯入成功！' : (data.message || '匯入失敗'));
        //         hideLoading();
        //         location.reload();
        //     },
        //     error: function (xhr) {
        //         console.error(xhr);
        //         alert('匯入過程發生錯誤');
        //         hideLoading();
        //     }
        // });
    });


    $('#goback').on('click', function (e) {
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
        if (returnUrl) {
            window.location.href = returnUrl;
        } else {
            history.back(); // 若沒有 returnUrl 就用瀏覽器返回
        }
    });
});

function collectPhotoUploadData() {
    return uploadedPhotos.map(photo => ({
        name: photo.name,
        size: photo.size,
        type: photo.type,
        dataUrl: photo.dataUrl,           // base64 圖片資料
        uploadTime: photo.uploadTime,
        dateCreated: photo.dateCreated ? photo.dateCreated.toISOString() : null
    }));
}

function initLayerSelect(){
    var id = $("#LayerId").val();

    $.ajax({
        url: `/Mapdata/General/Get/Layer?id=${id}`,
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                var layers = data.layers;
                var $select = $("#mapdataLayerSelector");
                $select.empty(); // 清空舊內容
                $select.append($("<option selected disabled>").val(-1).text("請選擇圖層")); // 添加預設選項            
                $.each(layers, function (i, layer) {
                    $select.append($("<option>").val(layer.id).text(layer.name));
                });
            }
            console.log("AJAX 請求完成");
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    })
}

function initAdvancedOptions() {
    var id = $("#LayerId").val();
    $.ajax({
        url: `/Mapdata/General/Get/LayerConfig?layerId=${id}`, // 新增配置API
        type: "GET",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                var layerConfig = JSON.parse(data.layerConfig);
                advancedConfig = layerConfig; // 儲存全域變數
                console.log("advancedConfig", advancedConfig);
                
                if(advancedConfig.advanced){
                    if(advancedConfig.associated_layer){
                        console.log("關聯圖層配置:", advancedConfig.associated_layer);
                        // 如果associated_layer存在
                        associatedLayer = advancedConfig.associated_layer;
                        if (associatedLayer && associatedLayer.length > 0) {                            
                            console.log("關聯圖層:", associatedLayer);
                        }                                
                    }
                    loadAdvancedModules();
                    return true;
                }
                else {
                    // hideAdvancedOptions();
                }
            }
        }
    });
}


/**
 * 載入進階功能模組
 * @param {Object} config - 圖層配置物件
 */
function loadAdvancedModules() {
    const $advancedContainer = $("#advancedContainer");
    
    // 清空現有內容
    $advancedContainer.empty();
    
    // 顯示進階選項切換按鈕
    $("#advancedToggle").show();
    
    // 根據配置載入對應模組
    if (advancedConfig.modules && advancedConfig.modules.length > 0) {
        advancedConfig.modules.forEach(module => {
            switch(module) {
                case 'photo_upload':
                    $advancedContainer.append(createPhotoUploadModule());
                    initializePhotoUpload();
                    break;
                // case 'layer_sync':
                //     $advancedContainer.append(createLayerSyncModule(advancedConfig.settings));
                //     initializeLayerSync(advancedConfig.settings);
                //     break;
                // case 'display_settings':
                //     $advancedContainer.append(createDisplaySettingsModule(advancedConfig.settings));
                //     initializeDisplaySettings(advancedConfig.settings);
                //     break;
                // default:
                //     console.warn(`未知的模組類型: ${module}`);
            }
        });
        
        // 如果設定自動展開
        if (advancedConfig.settings && advancedConfig.settings.auto_expand) {
            setTimeout(() => {
                toggleAdvanced();
            }, 100);
        }
    }
}

function toggleAdvanced() {
    const toggle = document.querySelector('.advanced-toggle');
    const options = document.getElementById('advancedOptions');
    
    isAdvancedExpanded = !isAdvancedExpanded;
    
    if (isAdvancedExpanded) {
        toggle.classList.add('expanded');
        options.classList.add('expanded');
    } else {
        toggle.classList.remove('expanded');
        options.classList.remove('expanded');
    }
}


/**
 * 創建照片上傳模組（簡化版）
 * @param {Object} settings - 模組設定
 * @param {Object} associatedLayer - 關聯圖層資訊
 */
function createPhotoUploadModule() {
    const allowedFormats = advancedConfig.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const maxFileSize = advancedConfig.max_file_size || 10; // MB
    
    return $(`
        <div class="advanced-module fade-in" data-module="photo_upload">
            <div class="module-header">
                <h6 class="module-title">
                    照片上傳
                </h6>
                <span class="help-icon" 
                      data-bs-toggle="tooltip" 
                      data-bs-placement="right" 
                      title="上傳與此圖層相關的照片，支援 ${allowedFormats.join('、').toUpperCase()} 格式，最大 ${maxFileSize}MB">
                    ❔
                </span>
            </div>
            
            <div class="photo-upload-controls mb-3">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('photoInput').click()">
                            📷 選擇照片
                        </button>
                        <input type="file" id="photoInput" multiple accept="image/*" style="display: none;">
                        <small class="text-muted ms-2">支援多選</small>
                    </div>
                    <div class="col-md-6 text-end">
                        <span class="photo-count">已上傳 <span id="photoCount" class="fw-bold text-primary">0</span> 張</span>
                    </div>
                </div>
            </div>
        
            
            <div class="image-preview-container" id="photoPreviewContainer" style="display: none;">
                <div class="preview-header mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">照片預覽</h6>
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="clearAllPhotos()">
                            🗑️ 清空全部
                        </button>
                    </div>
                </div>
                <div class="photo-grid" id="photoGrid">
                    <!-- 照片預覽將在這裡動態生成 -->
                </div>
            </div>
        </div>
    `);
}

/**
 * 初始化照片上傳功能
 * @param {Object} settings - 設定參數
 * @param {Object} associatedLayer - 關聯圖層資訊
 */
function initializePhotoUpload() {
    const maxFileSize = (advancedConfig.max_file_size || 10) * 1024 * 1024; // 轉換為 bytes
    const allowedFormats = advancedConfig.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    const $uploadArea = $("#photoUploadArea");
    const $input = $("#photoInput");
    const $previewContainer = $("#photoPreviewContainer");
    
    // 重置上傳的照片陣列
    uploadedPhotos = [];
    
    // 點擊上傳區域觸發文件選擇
    $uploadArea.on('click', function(e) {
        if (!$(e.target).is('input')) {
            $input.click();
        }
    });
    
    // 文件選擇處理
    $input.on('change', function(e) {
        handlePhotoFiles(e.target.files, maxFileSize, allowedFormats);
        // 清空 input，允許重複選擇相同檔案
        $(this).val('');
    });
    
    // 拖拽功能
    setupPhotoDragAndDrop($uploadArea, maxFileSize, allowedFormats);
    
    // 初始化 tooltip
    initializeTooltips();
    
    console.log('照片上傳模組初始化完成', { maxFileSize });
}

/**
 * 設定照片拖拽功能
 * @param {jQuery} $element - 目標元素
 * @param {number} maxFileSize - 最大檔案大小
 * @param {Array} allowedFormats - 允許格式
 */
function setupPhotoDragAndDrop($element, maxFileSize, allowedFormats) {
    $element.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('dragover');
    });
    
    $element.on('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('dragover');
    });
    
    $element.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('dragover');
        
        const files = e.originalEvent.dataTransfer.files;
        handlePhotoFiles(files, maxFileSize, allowedFormats);
    });
}

/**
 * 處理照片檔案上傳
 * @param {FileList} files - 檔案列表
 * @param {number} maxFileSize - 最大檔案大小
 * @param {Array} allowedFormats - 允許格式
 */
function handlePhotoFiles(files, maxFileSize, allowedFormats) {
    const fileArray = Array.from(files);
    
    let validFiles = [];
    let errors = [];
    
    // 驗證每個檔案
    for (let file of fileArray) {
        // 檢查文件類型
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedFormats.includes(fileExtension)) {
            errors.push(`"${file.name}" 格式不支援，請選擇 ${allowedFormats.join('、').toUpperCase()} 格式的照片`);
            continue;
        }
        
        // 檢查文件大小
        if (file.size > maxFileSize) {
            errors.push(`"${file.name}" 檔案大小超過 ${maxFileSize / 1024 / 1024}MB 限制`);
            continue;
        }
        
        // 檢查是否重複
        const isDuplicate = uploadedPhotos.some(photo => 
            photo.name === file.name && photo.size === file.size
        );
        if (isDuplicate) {
            errors.push(`"${file.name}" 已經上傳過了`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    // 顯示錯誤訊息
    if (errors.length > 0) {
        alert(errors.join('\n'));
    }
    
    // 處理有效的檔案
    if (validFiles.length > 0) {
        processValidPhotos(validFiles);
    }
}

/**
 * 處理有效的照片檔案
 * @param {Array} validFiles - 有效的檔案陣列
 */
function processValidPhotos(validFiles) {
    let processedCount = 0;
    
    validFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const photoData = {
                id: `photo_${Date.now()}_${Math.floor(Math.random() * 10000)}`, // ← 產生唯一字串 ID
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: e.target.result,
                uploadTime: new Date().toISOString(),
                description: '' // 預設空描述
            };
            
            // 嘗試讀取 EXIF GPS 資料
            extractPhotoMetadata(file, photoData);
            
            uploadedPhotos.push(photoData);
            processedCount++;
            
            // 當所有檔案處理完成時更新界面
            if (processedCount === validFiles.length) {
                updatePhotoPreview();
                console.log('照片上傳完成', uploadedPhotos);
            }
        };
        
        reader.onerror = function() {
            console.error('讀取檔案失敗:', file.name);
            processedCount++;
            
            if (processedCount === validFiles.length) {
                updatePhotoPreview();
            }
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * 更新照片預覽界面
 */
function updatePhotoPreview() {
    const $container = $("#photoPreviewContainer");
    const $grid = $("#photoGrid");
    const $count = $("#photoCount");
    
    // 更新計數
    $count.text(uploadedPhotos.length);
    
    if (uploadedPhotos.length === 0) {
        $container.hide();
        return;
    }
    
    // 顯示預覽容器
    $container.show();
    $grid.empty();
    
    // 生成照片預覽
    uploadedPhotos.forEach((photo, index) => {
        const $photoItem = createPhotoPreviewItem(photo, index);
        $grid.append($photoItem);
    });
    
    // 添加一些動畫效果
    $grid.find('.image-preview').each(function(index) {
        $(this).css('animation-delay', (index * 0.1) + 's');
    });
}

/**
 * 創建照片預覽項目
 * @param {Object} photo - 照片資料
 * @param {number} index - 索引
 * @returns {jQuery} 照片預覽元素
 */
function createPhotoPreviewItem(photo, index) {
    const $photoItem = $(`
        <div class="photo-item-wrapper fade-in">
            <div class="image-preview" data-photo-id="${photo.id}">
                <img src="${photo.dataUrl}" alt="${photo.name}" loading="lazy">
                <button type="button" class="image-remove-btn" onclick="removePhoto('${photo.id}')" title="移除照片">×</button>
            </div>
            <div class="photo-filename" title="${photo.name}">
                ${truncateFileName(photo.name, 20)}
            </div>
        </div>
    `);

    return $photoItem;
}




/**
 * 移除照片
 * @param {string} photoId - 照片ID
 */
function removePhoto(photoId) {
    // 添加確認對話框
    if (!confirm('確定要移除這張照片嗎？')) {
        return;
    }
    
    const photoIndex = uploadedPhotos.findIndex(photo => String(photo.id) === String(photoId));
    console.log('移除照片ID:', photoId, '索引:', photoIndex);
    if (photoIndex > -1) {
        const removedPhoto = uploadedPhotos.splice(photoIndex, 1)[0];
        console.log('移除照片:', removedPhoto.name);
        
        // 添加移除動畫
        const $photoElement = $(`.image-preview[data-photo-id="${photoId}"]`);
        $photoElement.addClass('removing');
        
        setTimeout(() => {
            updatePhotoPreview();
        }, 300);
    }
}

/**
 * 清空所有照片
 */
function clearAllPhotos() {
    if (uploadedPhotos.length === 0) {
        return;
    }
    
    if (!confirm(`確定要清空所有 ${uploadedPhotos.length} 張照片嗎？此操作無法復原。`)) {
        return;
    }
    
    uploadedPhotos = [];
    updatePhotoPreview();
    console.log('已清空所有照片');
}

/**
 * 更新照片描述
 * @param {string} photoId - 照片ID
 * @param {string} description - 描述文字
 */
function updatePhotoDescription(photoId, description) {
    const photo = uploadedPhotos.find(p => p.id === photoId);
    if (photo) {
        photo.description = description.trim();
        console.log('更新照片描述:', photo.name, '→', photo.description);
    }
}

/**
 * 提取照片元資料（簡化版EXIF讀取）
 * @param {File} file - 圖片檔案
 * @param {Object} photoData - 照片資料物件
 */
function extractPhotoMetadata(file, photoData) {
    // 簡化的 EXIF 資料提取
    if (file.type === 'image/jpeg') {
        // 這裡可以整合 EXIF.js 或其他 EXIF 讀取庫
        // 暫時模擬一些 GPS 資料用於展示
        if (Math.random() > 0.8) { // 20% 機率模擬有 GPS 資料
            photoData.gpsData = {
                lat: 24.99305 + (Math.random() - 0.5) * 0.02,
                lng: 121.30106 + (Math.random() - 0.5) * 0.02,
                altitude: Math.floor(Math.random() * 200) + 50
            };
        }
    }
    
    // 記錄照片的建立時間
    photoData.dateCreated = file.lastModified ? new Date(file.lastModified) : new Date();
}

/**
 * 格式化檔案大小
 * @param {number} bytes - 位元組數
 * @returns {string} 格式化後的大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * 截斷檔案名稱
 * @param {string} fileName - 檔案名稱
 * @param {number} maxLength - 最大長度
 * @returns {string} 截斷後的檔案名稱
 */
function truncateFileName(fileName, maxLength) {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
    
    return truncatedName + '.' + extension;
}

/**
 * 收集照片上傳資料
 * @returns {Array} 照片資料陣列
 */
function collectPhotoUploadData() {
    return uploadedPhotos.map(photo => ({
        name: photo.name,
        size: photo.size,
        type: photo.type,
        dataUrl: photo.dataUrl,
        description: photo.description || '',
        gpsData: photo.gpsData || null,
        uploadTime: photo.uploadTime,
        dateCreated: photo.dateCreated ? photo.dateCreated.toISOString() : null
    }));
}


/**
 * 初始化 tooltips
 */
function initializeTooltips() {
    // 確保 Bootstrap tooltip 已載入
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
}

/**
 * 隱藏進階功能
 */
function hideAdvancedFeatures() {
    $("#advancedToggle").hide();
    $("#advancedContainer").empty();
    uploadedImages = [];
    selectedSyncLayers = [];
    advancedConfig = {};
}

/**
 * 收集進階功能資料
 * @returns {Object} 進階功能資料
 */
function collectAdvancedData() {
    const advancedData = {};
    
    // 收集圖片資料
    if ($("#advancedContainer").find('[data-module="image_gallery"]').length > 0) {
        advancedData.images = uploadedImages.map(img => ({
            name: img.name,
            size: img.size,
            dataUrl: img.dataUrl
        }));
    }
    
    // 收集圖層同步資料
    if ($("#advancedContainer").find('[data-module="layer_sync"]').length > 0) {
        advancedData.syncLayers = selectedSyncLayers;
    }
    
    // 收集顯示設定
    if ($("#advancedContainer").find('[data-module="display_settings"]').length > 0) {
        advancedData.displaySettings = {
            opacity: $("#opacityRange").val(),
            zoomLevel: $("#zoomLevelSelect").val()
        };
    }
    
    return advancedData;
}

function showResult_xlsx(buffer) {
    const kind = $("#LayerKind").val();
    const svg = $("#LayerSvg").val();
    const color = $("#LayerColor").val();
    
    if(advancedConfig.advanced){
        // 檢查是否有 associated_layer 配置
        if (advancedConfig.associated_layer && advancedConfig.associated_layer.length > 0) {
            
            // 優先使用 ExtendedData 中的 layerType
            const layerType = feature.properties.layerType;
            
            let matchedLayer = null;
            
            if (layerType) {
                // 方法一：使用 ExtendedData 的 layerType 精確匹配
                matchedLayer = advancedConfig.associated_layer.find(layer => 
                    layer.Name === layerType
                );
            }
            
            if (matchedLayer) {
                feature.layerConfig = matchedLayer;
            }
        }
    }
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const xlsxJson = XLSX.utils.sheet_to_json(worksheet);

    // 清除 map 與畫面
    if (window.xlsxLayer) {
        map.removeLayer(window.xlsxLayer);
    }
    $("#showContainer").removeClass("d-none");
    $("#result").empty();

    const features = [];
    const groups = {};
    
    const props = {};
    console.log("Processing XLSX data:", xlsxJson);
    for (const row of xlsxJson) {
        const lat = parseFloat(row["pile_lat"]);
        const lng = parseFloat(row["pile_lon"]);
        if (isNaN(lat) || isNaN(lng)) continue;
        const roadId = row["road_id"] || `group_${Math.random()}`;
        if (!groups[roadId]) {
            groups[roadId] = [];
            props[roadId] = row; // 儲存第一個屬性
        }
        groups[roadId].push([lng, lat]);

        if (kind === "point") {
            features.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties: row
            });
        }
    }
    console.log("Grouped coordinates:", props);
    if (kind === "line" || kind === "arrowline") {
        for (const roadId in groups) {
            const coords = groups[roadId];
            if (coords.length >= 2) {
                features.push({
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: coords },
                    properties: props[roadId]
                });
            }
        }
    } else if (kind === "plane") {
        for (const roadId in groups) {
            const coords = groups[roadId];
            if (coords.length >= 3) {
                coords.push(coords[0]); // 封閉 polygon
                features.push({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [coords] },
                    properties: props[roadId]
                });
            }
        }
    }

    const geojson = { type: "FeatureCollection", features };

    const layer = L.geoJSON(geojson, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: Map.customIcon || L.icon({
                    iconUrl: `/img/${svg}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            });
        },
        style: function (feature) {
            if (feature.geometry.type === "LineString") {
                return { color: color, weight: 3 };
            }
            if (feature.geometry.type === "Polygon") {
                return { color: color, fillColor: color, weight: 2, fillOpacity: 0.5 };
            }
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;
            console.log("Processing feature properties:", p);
            if (!p) return;
            let html = `<b>${p.road_name || '未命名圖層'}</b><br><table>`;
            let prop = JSON.parse((p.pile_prop || "{}").replace(/\bNaN\b/g, "null")) || {};
            for (const key in prop) {
                console.log("Processing property:", key, prop[key]);
                if(key != "施工範圍"){
                    html += `<tr><td style="width: 30%;><b>${key}</b></td><td>${prop[key]}</td></tr>`
                }
                
            };
            html += '</table>';
            layer.bindPopup(html);
        }
        // onEachFeature: function (feature, layer) {
        //     const p = feature.properties;
        //     if (!p) return;
        //     let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
        //     for (const key in p) {
        //         if (key !== 'name') html += `<tr><td><b>${key}</b></td><td>${p[key]}</td></tr>`;
        //     }
        //     html += '</table>';
        //     layer.bindPopup(html);
        // }
    }).addTo(map);
    // 🡺 加上箭頭裝飾
    if (kind === "arrowline") {
        layer.eachLayer(function (l) {
            if (l instanceof L.Polyline && !(l instanceof L.Polygon)) {
                const decorator = L.polylineDecorator(l, {
                    patterns: [
                        {
                            offset: '100%',
                            repeat: 0,      // 不重複，僅在尾端顯示箭頭
                            symbol: L.Symbol.arrowHead({
                                pixelSize: 25,
                                pathOptions: {
                                    fillOpacity: 1,
                                    weight: 0,
                                    color: color,
                                    interactive: false, // 禁用互動
                                }
                            })
                        }
                    ]
                });
                decorator.addTo(map);
            }
        });
    }
    window.xlsxLayer = layer;
    if (layer.getBounds && layer.getLayers().length > 0) {
        map.fitBounds(layer.getBounds());
    } else {
        alert('⚠️ Excel 檔案中沒有有效圖形。');
    }
    console.log(xlsxJson)

    // 生成表格容器
    unifiedFeatures = []; // 清空
    // for (const roadId in groups) {
    //     // 以 road_id 與 pile_dir 分組
    //     const placemarkRows = xlsxJson.filter(r => r.road_id == roadId);
    //     const converted = placemarkRows.map((r, i) => ({
    //         Index: i,
    //         Latitude: parseFloat(r.pile_lat),
    //         Longitude: parseFloat(r.pile_lon),
    //         Property: (r.pile_prop || "{}").replace(/\bNaN\b/g, "null")
    //     }));
    //     console.log("Converted placemark rows:", converted);
    //     const ImportMapdataArea = {
    //         name: placemarkRows[0].road_name,
    //         MapdataPoints: converted
    //     }
    //     unifiedFeatures.push(ImportMapdataArea);
    //     var pile_dir = placemarkRows[0].pile_dir || 1;
    //     var road_name = `${placemarkRows[0].road_name} - 方向 ${pile_dir}` || roadId;
    //     const container = generateAreaContainer_unified(road_name, converted);
    //     $("#result").append(container);
    // }
    const groupedByRoadAndDir = {};

xlsxJson.forEach(row => {
    const roadId = row.road_id;
    const pileDir = row.pile_dir || '1'; // 預設為 1，如果是空值
    const key = `${roadId}_${pileDir}`;

    if (!groupedByRoadAndDir[key]) {
        groupedByRoadAndDir[key] = [];
    }
    groupedByRoadAndDir[key].push(row);
});

// 遍歷分組後的資料
for (const key in groupedByRoadAndDir) {
    const placemarkRows = groupedByRoadAndDir[key];

    const converted = placemarkRows.map((r, i) => ({
        Index: i,
        Latitude: parseFloat(r.pile_lat),
        Longitude: parseFloat(r.pile_lon),
        Property: (r.pile_prop || "{}").replace(/\bNaN\b/g, "null")
    }));

    console.log("Converted placemark rows:", converted);

    const road_name = placemarkRows[0].road_name;
    const pile_dir = placemarkRows[0].pile_dir || 1;
    const displayName = `${road_name} - 方向 ${pile_dir}`;

    const ImportMapdataArea = {
        name: displayName,
        MapdataPoints: converted
    };

    unifiedFeatures.push(ImportMapdataArea);

    const container = generateAreaContainer_unified(displayName, converted);
    $("#result").append(container);
}
}

function showResult_kml(kmlContent) {
    var kind = $("#LayerKind").val();
    var svg = $("#LayerSvg").val();
    var color = $("#LayerColor").val();
    // 在這裡處理 KML 內容
    // 移除 #map的d-none class
    // 將 KML 內容顯示在地圖上
    const kmlText = kmlContent;
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const geojson = toGeoJSON.kml(kmlDoc);

    // 過濾 geojson.features 根據 kind
    geojson.features = geojson.features.filter(feature => {
        const type = feature.geometry.type;
        if(advancedConfig.advanced){
            // 檢查是否有 associated_layer 配置
            if (advancedConfig.associated_layer && advancedConfig.associated_layer.length > 0) {            
            // 優先使用 ExtendedData 中的 layerType
            const layerType = feature.properties.layerType;
            
            let matchedLayer = null;
            console.log("layerType:", advancedConfig.associated_layer);
            if (layerType) {
                // 方法一：使用 ExtendedData 的 layerType 精確匹配
                matchedLayer = advancedConfig.associated_layer.find(layer => 
                    layer.Name === layerType
                );
            }
            console.log("matchedLayer:", matchedLayer, layerType);
            if (matchedLayer) {
                feature.layerConfig = matchedLayer;
            }
        }
        
        return true; // 特殊模式保留所有幾何類型
    }
        if (kind === "point") {
            return type === "Point";
        } else if (kind === "arrowline" || kind === "line") {
            return type === "LineString";
        } else if (kind === "plane") {
            return type === "Polygon";
        }
        return true; // 預設保留所有
    });


    // 清除原圖層（如需要）
    if (window.kmlLayer) {
        map.removeLayer(window.kmlLayer);
    }

    // 解析並加到地圖上
    // 顯示為 geoJSON 圖層
    const geoJsonLayer = L.geoJSON(geojson, {
        // 處理 Point → 自訂 marker icon
        pointToLayer: function (feature, latlng) {
            // return L.marker(latlng, {
            //     icon: Map.customIcon || L.icon({
            //         iconUrl: `/img/${svg}`,
            //         iconSize: [32, 32],
            //         iconAnchor: [16, 32],
            //         popupAnchor: [0, -32]
            //     })
            // }).bindPopup(feature.properties || '地點');
            const layerConfig = feature.layerConfig;
            console.log("layerConfig feature:", layerConfig);
            if (layerConfig) {
                console.log(`/img/${layerConfig.GeoName}`);
                // 使用 associated_layer 的圖標配置
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: `/img/${layerConfig.GeoName}`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32]
                    })
                });
            } else {
                // 使用預設圖標
                return L.marker(latlng, {
                    icon: Map.customIcon || L.icon({
                        iconUrl: `/img/${svg}`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32]
                    })
                });
            }
        },
        // style: function (feature) {
        //     const isLine = feature.geometry.type === 'LineString';
        //     const isPolygon = feature.geometry.type === 'Polygon';

        //     if (isLine) {
        //         return {
        //             color: color,
        //             weight: 3
        //         };
        //     }
        //     if (isPolygon) {
        //         return {
        //             color: color,
        //             weight: 2,
        //             fillColor: color,
        //             fillOpacity: 0.5
        //         };
        //     }
        // },
        style: function (feature) {
            const layerConfig = feature.layerConfig;
            // 如果有 layerConfig 且包含顏色配置，優先使用；否則使用預設顏色
            const featureColor = (layerConfig && layerConfig.Color) ? layerConfig.Color : color;
            
            if (feature.geometry.type === "LineString") {
                return { color: featureColor, weight: 3 };
            }
            if (feature.geometry.type === "Polygon") {
                return { 
                    color: featureColor, 
                    fillColor: featureColor, 
                    weight: 2, 
                    fillOpacity: 0.5 
                };
            }
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;
            if (!p) return;
            console.log("Processing feature properties:", p);
            // 組合 popup HTML
            let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
            for (const key in p) {
                if (key !== 'name') {
                    html += `<tr><td style="width: 30%;"><b>${key}</b></td><td>${p[key]}</td></tr>`;
                }
            }
            html += '</table>';
            layer.bindPopup(html);
        }
    }).addTo(map);

    // 🡺 加上箭頭裝飾
    if (kind === "arrowline") {
        geoJsonLayer.eachLayer(function (l) {
            if (l instanceof L.Polyline && !(l instanceof L.Polygon)) {
                const decorator = L.polylineDecorator(l, {
                    patterns: [
                        {
                            offset: '100%',
                            repeat: 0,      // 不重複，僅在尾端顯示箭頭
                            symbol: L.Symbol.arrowHead({
                                pixelSize: 25,
                                pathOptions: {
                                    fillOpacity: 1,
                                    weight: 0,
                                    color: color,
                                    interactive: false, // 禁用互動
                                }
                            })
                        }
                    ]
                });
                decorator.addTo(map);
            }
        });
    }
    const folders = Array.from(kmlDoc.getElementsByTagName("Folder"));
    unifiedFeatures = [];
    folders.forEach((folder, folderIndex) => {
        const folderName = folder.getElementsByTagName("name")[0]?.textContent || `群組${folderIndex + 1}`;
        const placemarks = Array.from(folder.getElementsByTagName("Placemark"));
        const filteredPlacemarks = placemarks.filter(pm => {
            const coordsElements = pm.getElementsByTagName("coordinates");
            console.log(coordsElements.length);
            if (kind === "point") {
                return coordsElements.length === 1; // Point
            } else if (kind === "arrowline" || kind === "line") {
                return coordsElements.length >= 1 && pm.getElementsByTagName("LineString").length > 0; // LineString
            } else if (kind === "plane") {
                return pm.getElementsByTagName("Polygon").length > 0; // Polygon
            }
            return true; // 預設保留所有
        });
        const unified = [];
        console.log("filteredPlacemarks", filteredPlacemarks);
        filteredPlacemarks.forEach((pm) => {
            const coordsElements = pm.getElementsByTagName("coordinates");
            const coordSet = [];

            Array.from(coordsElements).forEach(coordEl => {
                const coordsText = coordEl.textContent.trim();
                const coordLines = coordsText.split(/\s+/);

                coordLines.forEach(coord => {
                    const [lon, lat] = coord.split(",");
                    if (lat && lon) {
                        coordSet.push([parseFloat(lat), parseFloat(lon)]);
                    }
                });
            });

            const dataMap = {};
            const dataTags = pm.getElementsByTagName("Data");
            Array.from(dataTags).forEach(data => {
                const key = data.getAttribute("name");
                const val = data.getElementsByTagName("value")[0]?.textContent || '';
                dataMap[key] = val;
            });

            coordSet.forEach((coord, idx) => {
                const [lat, lon] = coord;
                unified.push({
                    Index: kind === "point" ? unified.length : (idx),
                    Latitude: lat,
                    Longitude: lon,
                    Property: kind === "point" || idx==0 ? JSON.stringify(dataMap).replace(/\bNaN\b/g, "null") : null
                });
            });
        });
        const ImportMapdataArea ={
            name:folderName,
            MapdataPoints:unified
        }
        unifiedFeatures.push(ImportMapdataArea);
        const container = generateAreaContainer_unified(folderName, unified);
        $("#result").append(container);
    });
    // 儲存為全域變數，方便後續移除
    window.kmlLayer = geoJsonLayer;

    if (geoJsonLayer.getBounds && geoJsonLayer.getLayers().length > 0) {
        map.fitBounds(geoJsonLayer.getBounds());
    } else {
        alert('⚠️ KML 檔案中沒有有效圖形。');
        // 清空#Xlsx_or_Kml
        $("#Xlsx_or_Kml").val("");
    }
}

// 生成區域容器
function generateAreaContainer_kml(folderName, placemarkList) {
    const $container = $(`
        <div class="areaContainer">
            <div class="card-header bg-primary text-white">
                <strong class="layerName">${folderName}</strong>
            </div>
            <table class="table table-bordered table-sm">
                <thead class="table-primary">
                    <tr>
                        <th>Index</th>
                        <th>緯度</th>
                        <th>經度</th>
                        <th>資訊</th>
                    </tr>
                </thead>
                <tbody class="mapdataPointBody"></tbody>
            </table>
        </div>
    `);
    const kind = $("#LayerKind").val();
    const $tbody = $container.find(".mapdataPointBody");
    let globalIndex = 1;

    placemarkList.forEach((pm) => {
        const coordsElements = pm.getElementsByTagName("coordinates");
        const coordSet = [];

        Array.from(coordsElements).forEach(coordEl => {
            const coordsText = coordEl.textContent.trim();
            const coordLines = coordsText.split(/\s+/);

            coordLines.forEach(coord => {
                const [lon, lat] = coord.split(",");
                if (lat && lon) {
                    coordSet.push([parseFloat(lat), parseFloat(lon)]);
                }
            });
        });

        // ExtendedData
        const dataMap = {};
        const dataTags = pm.getElementsByTagName("Data");
        Array.from(dataTags).forEach(data => {
            const key = data.getAttribute("name");
            const val = data.getElementsByTagName("value")[0]?.textContent || '';
            dataMap[key] = val;
        });

        let infoHtml = "";
        for (const key in dataMap) {
            infoHtml += `<b>${key}</b>: ${dataMap[key]}<br>`;
        }

        coordSet.forEach((coord, idx) => {
            const [lat, lon] = coord;
            const displayIndex = (kind === "point") ? globalIndex++ : (idx + 1);
            const $tr = $(`
                <tr>
                    <td>${displayIndex}</td>
                    <td>${lat.toFixed(6)}</td>
                    <td>${lon.toFixed(6)}</td>
                    <td>${idx === 0 ? infoHtml : ''}</td>
                </tr>
            `);
            $tbody.append($tr);
        });
    });

    return $container;
}

function generateAreaContainer_unified(name, mapdataPoints){
    const $container = $(`<div class="areaContainer">
        <div class="card-header bg-primary text-white">
            <strong class="layerName">${name}</strong>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-primary">
                <tr>
                    <th>Index</th>
                    <th>緯度</th>
                    <th>經度</th>
                    <th style="width: 450px;">資訊</th>
                </tr>
            </thead>
            <tbody class="mapdataPointBody"></tbody>
        </table>
    </div>`);
    const $tbody = $container.find(".mapdataPointBody");
    mapdataPoints.forEach(point => {
        let infoHtml = '';
        const props = point.Property ? JSON.parse(point.Property) : {};
        for (const key in props) {
            infoHtml += `<b>${key}</b>: ${props[key]}<br>`;
        }
        const $tr = $(`<tr>
            <td>${point.Index}</td>
            <td>${point.Latitude.toFixed(6)}</td>
            <td>${point.Longitude.toFixed(6)}</td>
            <td>${infoHtml}</td>
        </tr>`);
        $tbody.append($tr);
    });
    return $container;
}

function generateAreaContainer_xlsx(roadName, placemarkList) {
    const $container = $(`
        <div class="areaContainer">
            <div class="card-header bg-primary text-white">
                <strong class="layerName">${roadName}</strong>
            </div>
            <table class="table table-bordered table-sm">
                <thead class="table-primary">
                    <tr>
                        <th>Index</th>
                        <th>緯度</th>
                        <th>經度</th>
                        <th style="width: 60%;">資訊</th>
                    </tr>
                </thead>
                <tbody class="mapdataPointBody"></tbody>
            </table>
        </div>
    `);

    const $tbody = $container.find(".mapdataPointBody");
    const coordSet = [];
    
    placemarkList.forEach((pm, placemarkIndex) => {
        if(pm.pile_prop){
            jsonStr = pm.pile_prop.replace(/\bNaN\b/g, "null");
            coordSet.push({ latitude : [parseFloat(pm.pile_lat), parseFloat(pm.pile_lon)], prop : jsonStr});
        }
        else{
            coordSet.push({ latitude : [parseFloat(pm.pile_lat), parseFloat(pm.pile_lon)], prop : null });
        }
    });
    const dataMap = {};
    for (const key in dataMap) {
        infoHtml += `<b>${key}</b>: ${dataMap[key]}<br>`;
    }
    coordSet.forEach((coord, idx) => {
        const [lat, lon] = coord.latitude;
        let infoHtml = "";
        if(coord.prop != null){
            const jsonStr = coord.prop.replace(/\bNaN\b/g, "null");
            const coordProp = JSON.parse(jsonStr);
            for (const key in coordProp) {
                infoHtml += `<b>${key}</b>: ${coordProp[key]}<br>`;
            }
        }
        
        // for (const key in coord.prop) {
        //     infoHtml += `<b>${key}</b>: ${coord.prop[key]}<br>`;
        // }
        const $tr = $(`
            <tr>
                <td>${idx + 1}</td>
                <td>${lat.toFixed(6)}</td>
                <td>${lon.toFixed(6)}</td>
                <td>${infoHtml != "" ? infoHtml : ""}</td>
            </tr>
        `);
        $tbody.append($tr);
    });
    return $container;

}

function getQueryParam(key) {
    let query = window.location.search.substring(1);
    let vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
        let pair = vars[i].split("=");
        if (decodeURIComponent(pair[0]) === key) {
            return decodeURIComponent(pair[1]);
        }
    }
    return null;
}

function showLoading() {
    $(".loadingSpinner").show();
}

function hideLoading() {
    $(".loadingSpinner").hide();
}
