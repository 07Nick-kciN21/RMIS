let map = null;
let isAdvancedExpanded = false;
// 全域變數
let uploadedImages = [];
let uploadedPhotos = [];
let selectedSyncLayers = [];
let advancedConfig = {};
let associatedLayerConfig = null;
let matchedLayer = null;
window.associatedLayers = []; // 儲存關聯圖層的全域變數
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
        // 清空地圖
        if(window.associatedLayer){
            window.associatedLayers.forEach(layer => map.removeLayer(layer));
            window.associatedLayers = []; // 清空
        }
        if (window.xlsxLayer) {
            map.removeLayer(window.xlsxLayer);
            window.xlsxLayer = null; // 清除全域變數
        }
        if (window.kmlLayer) {
            map.removeLayer(window.kmlLayer);
            window.kmlLayer = null; // 清除全域變數
        }

        // 清空照片上傳區域
        uploadedPhotos = []; // 清空已上傳的照片
        $("#photoPreviewContainer").hide();
        $("#photoGrid").empty();
        $("#photoCount").text("0");

        // ✅ 新增：清空照片上傳模組
        clearPhotoUploadModule();

        var format = $('#formatSelect').val();
        console.log(format);
        // 獲取選擇的檔案
        const file = this.files[0];
        // 沒有選擇檔案就不做事
        if (!file){
            // ✅ 沒有檔案時也要清空
            clearPhotoUploadModule(); 
            return;
        }            

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

function clearPhotoUploadModule() {
    projectPhotoData = {};
    $("#photoSections").html(`
        <div class="text-center text-muted py-4">
            <i class="fas fa-file-upload fa-2x mb-2"></i>
            <p>請先上傳 Excel 或 KML 檔案，系統將自動識別需要上傳照片的專案</p>
        </div>
    `);
    $("#photoUploadSummary").hide();
    $("#totalPhotoProgress").text("等待資料載入...");
}

function collectPhotoUploadData() {
    const allPhotoData = [];
    
    Object.keys(projectPhotoData).forEach(projectId => {
        const project = projectPhotoData[projectId];
        project.uploadedPhotos.forEach(photo => {
            allPhotoData.push({
                projectId: projectId,
                projectName: project.name,
                name: photo.name,
                size: photo.size,
                type: photo.type,
                dataUrl: photo.dataUrl,
                uploadTime: photo.uploadTime,
                dateCreated: photo.dateCreated ? photo.dateCreated.toISOString() : null
            });
        });
    });
    
    return allPhotoData;
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
                console.log(data.layerConfig);
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
    return $(`
        <div class="advanced-module fade-in" data-module="photo_upload">
            <div class="module-header">
                <h6 class="module-title">
                    <i class="fas fa-images"></i> 街景照片上傳
                </h6>
                <span class="help-icon" 
                      data-bs-toggle="tooltip" 
                      data-bs-placement="right" 
                      title="上傳與此圖層相關的照片，支援 ${allowedFormats.join('、').toUpperCase()} 格式">
                    ❔
                </span>
            </div>

            <!-- 圖片上傳容器 -->
            <div class="photo-upload-container" style="border: 2px dashed #dee2e6; border-radius: 8px; background: #f8f9fa; padding: 20px;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge bg-secondary" id="totalPhotoProgress">等待資料載入...</span>
                </div>

                <!-- 動態生成的圖片上傳區塊 -->
                <div id="photoSections" style="max-height: 400px;overflow-y: auto;">
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-file-upload fa-2x mb-2"></i>
                        <p>請先上傳 Excel 或 KML 檔案，系統將自動識別需要上傳照片的專案</p>
                    </div>
                </div>

                <!-- 上傳狀態總覽 -->
                <div class="mt-4 p-3 border rounded" id="photoUploadSummary" style="display: none;">
                    <h6>上傳狀態總覽</h6>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-warning" id="pendingPhotoCount">0</div>
                                <small>待上傳</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-info" id="uploadingPhotoCount">0</div>
                                <small>上傳中</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-success" id="completePhotoCount">0</div>
                                <small>已完成</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-danger" id="errorPhotoCount">0</div>
                                <small>失敗</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

// 新增全域變數來儲存專案照片資料
let projectPhotoData = {};

// 修改 initializePhotoUpload() 函數：
function initializePhotoUpload() {
    const maxFileSize = (advancedConfig.max_file_size || 10) * 1024 * 1024;
    const allowedFormats = advancedConfig.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    // 重置專案照片資料
    projectPhotoData = {};
    
    console.log('照片上傳模組初始化完成', { maxFileSize, allowedFormats });
}

// 新增函數：根據上傳的檔案資料生成照片上傳區塊
function generatePhotoUploadSections(dataSource, format) {
    console.log('生成照片上傳區塊', { dataSource, format });
    const $photoSections = $("#photoSections");
    $photoSections.empty();
    
    projectPhotoData = {};
    
    if (format === 'xlsx') {
        generatePhotoSectionsFromXlsx(dataSource);
    } else if (format === 'kml') {
        generatePhotoSectionsFromKml(dataSource);
    }
    
    updatePhotoUploadSummary();
}


// 從 Excel 資料生成照片區塊
function generatePhotoSectionsFromXlsx(xlsxJson) {
    const groupedProjects = {};
    const photoFields = advancedConfig.photo_field?.prop || [];
    const photoLayers = advancedConfig.photo_field?.layer || [];
    
    xlsxJson.forEach(row => {
        const projectId = row.road_id;
        if (!projectId) return;
        
        if (!groupedProjects[projectId]) {
            groupedProjects[projectId] = {
                name: row.road_name || '未命名專案',
                proposer: row.proposer || '',
                district: row.district || '',
                requiredPhotos: 0,
                photoFieldNames: [],
                expectedFilenames: [], // 新增：儲存期望的檔名
                uploadedPhotos: []
            };
        }
        
        // 解析 pile_prop 中的照片檔名
        if (row.pile_prop) {
            try {
                const prop = JSON.parse(row.pile_prop.replace(/\bNaN\b/g, "null"));
                
                // 1. 檢查 photo_field.prop 欄位（如：施工前照片、施工後照片）
                photoFields.forEach(fieldName => {
                    if (prop[fieldName]) {
                        groupedProjects[projectId].photoFieldNames.push(fieldName);
                        groupedProjects[projectId].expectedFilenames.push({
                            fieldName: fieldName,
                            filename: prop[fieldName] // 直接的檔名
                        });
                        groupedProjects[projectId].requiredPhotos++;
                    }
                });
                
                // 2. 檢查 photo_field.layer 欄位（如：街景照片）
                photoLayers.forEach(layerName => {
                    if (prop[layerName] && typeof prop[layerName] === 'object') {
                        // 解析 {"wsx852.png": ["24.911446, 121.158393"]} 格式
                        Object.keys(prop[layerName]).forEach(filename => {
                            groupedProjects[projectId].photoFieldNames.push(`${layerName}`);
                            groupedProjects[projectId].expectedFilenames.push({
                                fieldName: layerName,
                                filename: filename
                            });
                            groupedProjects[projectId].requiredPhotos++;
                        });
                    }
                });
                
            } catch (e) {
                console.warn('解析 pile_prop 失敗:', e);
            }
        }
    });
    
    Object.keys(groupedProjects).forEach(projectId => {
        projectPhotoData[projectId] = groupedProjects[projectId];
    });
    
    generatePhotoSectionUI(groupedProjects);
}

// 從 KML 資料生成照片區塊  
function generatePhotoSectionsFromKml(kmlContent) {
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    const folders = Array.from(kmlDoc.getElementsByTagName("Folder"));
    
    const photoFields = advancedConfig.photo_field?.prop || [];
    const photoLayers = advancedConfig.photo_field?.layer || [];
    
    folders.forEach(folder => {
        const folderName = folder.getElementsByTagName("name")[0]?.textContent || '未命名專案';
        const placemarks = Array.from(folder.getElementsByTagName("Placemark"));
        
        const projectId = folderName.replace(/\s+/g, '_');
        console.log('處理專案', projectId, folderName);
        const projectData = {
            name: folderName,
            proposer: '',
            district: '',
            requiredPhotos: 0,
            photoFieldNames: [],
            expectedFilenames: [],
            uploadedPhotos: []
        };
        
        placemarks.forEach(pm => {
            const dataTags = pm.getElementsByTagName("Data");
            
            // 1. 檢查主要圖形的 prop 欄位
            photoFields.forEach(fieldName => {
                const dataElement = Array.from(dataTags).find(data => 
                    data.getAttribute("name") === fieldName
                );
                if (dataElement) {
                    const filename = dataElement.getElementsByTagName("value")[0]?.textContent;
                    if (filename && filename.trim()) {
                        projectData.photoFieldNames.push(fieldName);
                        projectData.expectedFilenames.push({
                            fieldName: fieldName,
                            filename: filename.trim()
                        });
                        projectData.requiredPhotos++;
                    }
                }
            });
            
            // 2. 檢查 layer 類型的 Placemark（街景照片等）
            const layerTypeElement = Array.from(dataTags).find(data => 
                data.getAttribute("name") === "layerType"
            );
            const imageUrlElement = Array.from(dataTags).find(data => 
                data.getAttribute("name") === "imageUrl"
            );
            
            if (layerTypeElement && imageUrlElement) {
                const layerType = layerTypeElement.getElementsByTagName("value")[0]?.textContent;
                const imageUrl = imageUrlElement.getElementsByTagName("value")[0]?.textContent;
                
                if (photoLayers.includes(layerType) && imageUrl && imageUrl.trim()) {
                    projectData.photoFieldNames.push(layerType);
                    projectData.expectedFilenames.push({
                        fieldName: layerType,
                        filename: imageUrl.trim()
                    });
                    projectData.requiredPhotos++;
                }
            }
        });
        
        if (projectData.requiredPhotos > 0) {
            projectPhotoData[projectId] = projectData;
        }
    });
    
    generatePhotoSectionUI(projectPhotoData);
}

// 生成照片上傳區塊 UI
function generatePhotoSectionUI(projects) {
    const $photoSections = $("#photoSections");
    console.log('生成照片上傳區塊 UI', projects);
    Object.keys(projects).forEach(projectId => {
        const project = projects[projectId];
        console.log('生成專案區塊', projectId, project);
        const sectionHtml = `
            <div class="photo-section" data-project="${projectId}" style="border: 1px solid #e9ecef; border-radius: 6px; background: white; margin-bottom: 15px; padding: 15px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <span class="status-indicator status-pending" style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #ffc107; margin-right: 8px;"></span>
                        <span class="section-id" style="font-weight: bold; color: #495057;">專案代號：${projectId}</span>
                        <span class="photo-count" style="color: #6c757d; font-size: 0.9em;">(需要 ${project.requiredPhotos} 張照片)</span>
                    </div>
                    <button class="collapse-btn" onclick="togglePhotoSection(this)" style="background: none; border: none; color: #6c757d; cursor: pointer; font-size: 18px;">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                
                <div class="section-content">
                    <div class="data-preview" style="background: #f8f9fa; border-radius: 4px; padding: 10px; margin-bottom: 10px; font-size: 0.9em;">
                        <strong>${project.name}</strong><br>
                    </div>
                    <!-- 新增：圖檔名顯示區域 -->
                    <div class="expected-filenames mb-3" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px;">
                        <h6 style="margin-bottom: 8px; color: #856404;"><i class="fas fa-file-image"></i> 建議檔名格式：</h6>
                        <div class="filename-list" style="font-size: 0.85em; color: #856404;">
                            ${generateExpectedFilenames(projectId, project)}
                        </div>
                    </div>
                    <div class="upload-zone" onclick="triggerProjectFileInput('${projectId}')" 
                         ondrop="handleProjectDrop(event, '${projectId}')" 
                         ondragover="handleProjectDragOver(event)"
                         ondragleave="handleProjectDragLeave(event)"
                         style="border: 2px dashed #28a745; border-radius: 6px; padding: 20px; text-align: center; background: #f8fff8; cursor: pointer;">
                        <i class="fas fa-cloud-upload-alt fa-2x text-success mb-2"></i>
                        <p class="mb-0">點擊或拖拽圖片到此處</p>
                        <small class="text-muted">支援 JPG、PNG 格式，單檔最大 5MB</small>
                    </div>
                    
                    <input type="file" id="fileInput_${projectId}" multiple accept="image/*" style="display: none;" onchange="handleProjectFileSelect(event, '${projectId}')">
                    
                    <div class="progress-bar-container" style="margin-top: 10px; display: none;">
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <div class="photo-preview" id="preview_${projectId}" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                        <!-- 已上傳的圖片會顯示在這裡 -->
                    </div>
                </div>
            </div>
        `;
        $photoSections.append(sectionHtml);
    });
    
    $("#photoUploadSummary").show();
    $("#totalPhotoProgress").text(`0/${Object.keys(projects).length} 專案已完成`);
}

function generateExpectedFilenames(projectId, project) {
    let filenameHtml = '';
    
    if (project.expectedFilenames && project.expectedFilenames.length > 0) {
        project.expectedFilenames.forEach(item => {
            filenameHtml += `
                <div class="filename-item mb-1" style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${item.fieldName}：</strong></span>
                    <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; color: #d63384;">${item.filename}</code>
                </div>
            `;
        });
    } else {
        filenameHtml = `
            <div class="filename-item text-muted">
                <i class="fas fa-info-circle"></i> 此專案沒有指定的圖片檔名
            </div>
        `;
    }
    
    return filenameHtml;
}
// 專案照片上傳相關函數
function triggerProjectFileInput(projectId) {
    document.getElementById(`fileInput_${projectId}`).click();
}


function handleProjectFileSelect(event, projectId) {
    const files = event.target.files;
    uploadProjectFiles(files, projectId);
    $(event.target).val(''); // 清空以允許重複選擇
}

function handleProjectDrop(event, projectId) {
    event.preventDefault();
    event.stopPropagation();
    
    const uploadZone = event.currentTarget;
    uploadZone.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    uploadProjectFiles(files, projectId);
}

function handleProjectDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleProjectDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

function uploadProjectFiles(files, projectId) {
    const maxFileSize = (advancedConfig.max_file_size || 10) * 1024 * 1024;
    const allowedFormats = advancedConfig.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    const previewContainer = document.getElementById(`preview_${projectId}`);
    const progressContainer = document.querySelector(`[data-project="${projectId}"] .progress-bar-container`);
    const progressBar = document.querySelector(`[data-project="${projectId}"] .progress-bar`);
    
    const project = projectPhotoData[projectId];
    const expectedFilenames = project.expectedFilenames?.map(item => item.filename) || [];

    let validFiles = [];
    let errors = [];
    
    Array.from(files).forEach(file => {
        
        // 檢查格式
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedFormats.includes(fileExtension)) {
            errors.push(`"${file.name}" 格式不支援`);
            return;
        }
        
        // 檢查大小
        if (file.size > maxFileSize) {
            errors.push(`"${file.name}" 檔案過大`);
            return;
        }
        
        // 檢查重複
        const isDuplicate = projectPhotoData[projectId].uploadedPhotos.some(photo => 
            photo.name === file.name && photo.size === file.size
        );
        if (isDuplicate) {
            errors.push(`"${file.name}" 已上傳過`);
            return;
        }
        
        validFiles.push(file);
    });
    
    if (errors.length > 0) {
        alert(errors.join('\n'));
    }
    
    if (validFiles.length > 0) {
        progressContainer.style.display = 'block';
        updateProjectStatus(projectId, 'uploading');
        
        let processedCount = 0;
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const photoData = {
                    id: `${projectId}_${Date.now()}_${Math.random()}`,
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: e.target.result,
                    uploadTime: new Date().toISOString()
                };
                
                projectPhotoData[projectId].uploadedPhotos.push(photoData);
                
                // 建立預覽
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                photoItem.style.cssText = 'position: relative; width: 120px; height: 120px; border-radius: 6px; overflow: hidden; border: 2px solid #dee2e6;';
                photoItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button class="remove-btn" onclick="removeProjectPhoto(this, '${projectId}', '${photoData.id}')" 
                            style="position: absolute; top: 5px; right: 5px; background: rgba(220, 53, 69, 0.8); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewContainer.appendChild(photoItem);
                
                processedCount++;
                if (processedCount === validFiles.length) {
                    simulateProjectUpload(progressBar, () => {
                        updateProjectStatus(projectId, 'complete');
                        updatePhotoUploadSummary();
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

function removeProjectPhoto(button, projectId, photoId) {
    if (confirm('確定要移除此照片嗎？')) {
        button.parentElement.remove();
        const index = projectPhotoData[projectId].uploadedPhotos.findIndex(photo => photo.id === photoId);
        if (index > -1) {
            projectPhotoData[projectId].uploadedPhotos.splice(index, 1);
        }
        updateProjectStatus(projectId, 'pending');
        updatePhotoUploadSummary();
    }
}

function simulateProjectUpload(progressBar, callback) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(callback, 500);
        }
        progressBar.style.width = progress + '%';
    }, 200);
}

function updateProjectStatus(projectId, status) {
    const section = document.querySelector(`[data-project="${projectId}"]`);
    const indicator = section.querySelector('.status-indicator');
    
    indicator.classList.remove('status-pending', 'status-uploading', 'status-complete', 'status-error');
    indicator.classList.add(`status-${status}`);
    
    // 更新背景顏色
    const colors = {
        pending: '#ffc107',
        uploading: '#17a2b8', 
        complete: '#28a745',
        error: '#dc3545'
    };
    indicator.style.backgroundColor = colors[status];
}

function updatePhotoUploadSummary() {
    let pending = 0, uploading = 0, complete = 0, error = 0;
    
    Object.keys(projectPhotoData).forEach(projectId => {
        const project = projectPhotoData[projectId];
        const uploadedCount = project.uploadedPhotos.length;
        const requiredCount = project.requiredPhotos;
        
        if (uploadedCount === 0) {
            pending++;
        } else if (uploadedCount < requiredCount) {
            uploading++;
        } else {
            complete++;
        }
    });
    
    document.getElementById('pendingPhotoCount').textContent = pending;
    document.getElementById('uploadingPhotoCount').textContent = uploading;
    document.getElementById('completePhotoCount').textContent = complete;
    document.getElementById('errorPhotoCount').textContent = error;
    
    const totalProjects = Object.keys(projectPhotoData).length;
    document.getElementById('totalPhotoProgress').textContent = `${complete}/${totalProjects} 專案已完成`;
}

function togglePhotoSection(button) {
    const section = button.closest('.photo-section');
    const content = section.querySelector('.section-content');
    const icon = button.querySelector('i');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.className = 'fas fa-chevron-down';
    } else {
        content.style.display = 'none';
        icon.className = 'fas fa-chevron-right';
    }
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
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const xlsxJson = XLSX.utils.sheet_to_json(worksheet);

    // 清除 map 與畫面
    if (window.xlsxLayer) {
        window.associatedLayers.forEach(layer => map.removeLayer(layer));
        window.associatedLayers = []; // 清空
        map.removeLayer(window.xlsxLayer);
    }
    $("#showContainer").removeClass("d-none");
    $("#result").empty();

    const features = []; // GeoJSON features 結構
    const groups = {}; // key: road_id, value: [[lng, lat]]
    const props = {}; // key: road_id, value: 屬性資料
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
    // 匹配的圖層列表(名稱待修改) 
    let associated_layers = [];
    // 額外處理 pile_prop 中的關聯圖示點位
    if (advancedConfig.advanced && advancedConfig.associated_layer?.length > 0) {
        // associated_layers
        associated_layers = advancedConfig.associated_layer;
    }
    console.log("associated_layers:", associated_layers);
    // 關聯欄位
    let associated_fields = [];
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
            console.log("Feature properties:", feature);
            if (!p) return;
            let html = `<b>${p.road_name || '未命名圖層'}</b><br><table>`;
            let prop = JSON.parse((p.pile_prop || "{}").replace(/\bNaN\b/g, "null")) || {};
            for (const key in prop) {
                const value = prop[key];
                // 如果是關鍵欄位的座標資料，則處理為關聯圖示點位
                const layerDef = associated_layers.find(ld => ld.Name === key);
                if (layerDef) {
                    associated_fields.push(key); // 收集關聯欄位
                    if (layerDef.GeoType === "point" && typeof value === "object") {
                        console.log("Processing point coordinates for layer:", layerDef.Name, value);
                        for (const [imgName, coordList] of Object.entries(value)) {
                            // 預期 coordList 是 [lng, lon]
                            const coordStr = coordList[0];
                            const [lng, lon] = coordStr.split(',').map(parseFloat);
                            console.log("Processed point coordinates:", coordStr);
                            if (!isNaN(lng) && !isNaN(lon)) {
                                const marker = L.marker([lng, lon], {
                                    icon: L.icon({
                                        iconUrl: `/img/${layerDef.GeoName}`,
                                        iconSize: [32, 32],
                                        iconAnchor: [16, 32],
                                        popupAnchor: [0, -32]
                                    })
                                }).bindPopup(`<b>${layerDef.Name}</b><br>${imgName}`);                                
                                marker.addTo(map);
                                window.associatedLayers.push(marker); // 儲存關聯圖示點位
                            }
                        }
                    } else if (layerDef.GeoType === "line" && typeof value === "object") {
                        for (const [imgName, coordList] of Object.entries(value)) {
                            console.log("Processing line coordinates for image:", imgName, coordList);
                            if(coordList.length < 2) continue; // 至少需要兩個點
                            const lineCoords = coordList.map(coordStr => {
                                const [lng, lon] = coordStr.split(',').map(parseFloat);
                                return !isNaN(lng) && !isNaN(lon) ? [lng, lon] : null;
                            }).filter(c => c);
                            console.log("Processed line coordinates:", lineCoords);
                            if (lineCoords.length >= 2) {
                                const polyline = L.polyline(lineCoords, {
                                    color: layerDef.GeoColor || color,
                                    weight: 3
                                }).bindPopup(`<b>${layerDef.Name}</b><br>${imgName}`);
                                polyline.addTo(map);
                                window.associatedLayers.push(polyline);
                            }
                        }
                    } else if (layerDef.GeoType === "plane" && Array.isArray(value) && value.length >= 3) {
                        const polygonCoords = value.map(coordStr => {
                            const [lon, lat] = coordStr.split(',').map(parseFloat);
                            return !isNaN(lat) && !isNaN(lon) ? [lat, lon] : null;
                        }).filter(c => c);

                        if (polygonCoords.length >= 3) {
                            const polygon = L.polygon(polygonCoords, {
                                color: layerDef.GeoColor || color,
                                fillColor: layerDef.GeoColor || color,
                                weight: 2,
                                fillOpacity: 0.5
                            }).bindPopup(`<b>${layerDef.Name}</b>`);
                            polygon.addTo(map);
                            window.associatedLayers.push(polygon);
                        }
                    }
                    continue; // 👈 不加到 popup 表格
                }

                // 不是 associated_layer 的欄位，加到 popup 表格中
                html += `<tr><td style="width: 30%;"><b>${key}</b></td><td>${Array.isArray(value) ? value.join("<br>") : value}</td></tr>`;
            }
            html += '</table>';
            layer.bindPopup(html);
        }
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
    
    // 生成表格容器
    unifiedFeatures = []; // 清空
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

        const container = generateAreaContainer_unified(displayName, converted, associated_fields);
        $("#result").append(container);
    }

    if (advancedConfig.advanced && advancedConfig.modules && advancedConfig.modules.includes('photo_upload')) {
        generatePhotoUploadSections(xlsxJson, 'xlsx');
    }
}

function showResult_kml(kmlContent) {
    // 清除原圖層（如需要）
    if (window.kmlLayer) {
        window.associatedLayers.forEach(layer => map.removeLayer(layer));
        window.associatedLayers = []; // 清空
        map.removeLayer(window.kmlLayer);
    }

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
        // 檢查是否為associated_layer中的type
        if (advancedConfig.advanced) {
            const layerType = feature.properties.layerType;

            // 試著找到符合 layerType 的圖層設定
            let matchedLayer = null;
            if (layerType && Array.isArray(advancedConfig.associated_layer)) {
                matchedLayer = advancedConfig.associated_layer.find(layer => layer.Name === layerType);
            }

            // 如果 matchedLayer 有找到，就掛上 layerConfig 屬性
            if (matchedLayer) {
                feature.layerConfig = matchedLayer;
            }

            // advanced 模式只保留：geometry 符合 kind 或 layerType 符合
            const geometryMatch =
                (kind === "point" && type === "Point") ||
                ((kind === "line" || kind === "arrowline") && type === "LineString") ||
                (kind === "plane" && type === "Polygon");

            return geometryMatch || !!matchedLayer;
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

    // 解析並加到地圖上
    // 顯示為 geoJSON 圖層
    const geoJsonLayer = L.geoJSON(geojson, {
        // 處理 Point → 自訂 marker icon
        pointToLayer: function (feature, latlng) {
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
            console.log("Processing feature", feature);
            if (!p) return;
            // 組合 popup HTML
            let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
            for (const key in p) {
                if (key !== 'name') {
                    html += `<tr><td style="width: 40%;"><b>${key}</b></td><td>${p[key]}</td></tr>`;
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

    if (advancedConfig.advanced && advancedConfig.modules && advancedConfig.modules.includes('photo_upload')) {
        generatePhotoUploadSections(kmlContent, 'kml');
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

function generateAreaContainer_unified(name, mapdataPoints, associated_fields=[]){
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
