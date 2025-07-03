// modules/photoUpload.js - 照片上傳模組
export class PhotoUpload {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    }

    /**
     * 初始化照片上傳功能 - 保持原有功能
     */
    initializePhotoUpload() {
        this.maxFileSize = (window.advancedConfig.max_file_size || 10) * 1024 * 1024;
        this.allowedFormats = window.advancedConfig.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        // 重置專案照片資料
        window.projectPhotoData = {};
        
        console.log('照片上傳模組初始化完成', { 
            maxFileSize: this.maxFileSize, 
            allowedFormats: this.allowedFormats 
        });
    }

    /**
     * 清空照片上傳模組 - 保持原有功能
     */
    clearPhotoUploadModule() {
        window.projectPhotoData = {};
        $("#photoSections").html(`
            <div class="text-center text-muted py-4">
                <i class="fas fa-file-upload fa-2x mb-2"></i>
                <p>請先上傳 Excel 或 KML 檔案，系統將自動識別需要上傳照片的專案</p>
            </div>
        `);
        $("#photoUploadSummary").hide();
        $("#totalPhotoProgress").text("等待資料載入...");
    }

    /**
     * 根據上傳的檔案資料生成照片上傳區塊 - 保持原有功能
     */
    generatePhotoUploadSections(dataSource, format) {
        console.log('生成照片上傳區塊', { dataSource, format });
        const $photoSections = $("#photoSections");
        $photoSections.empty();
        
        window.projectPhotoData = {};
        
        if (format === 'xlsx') {
            this.generatePhotoSectionsFromXlsx(dataSource);
        } else if (format === 'kml') {
            this.generatePhotoSectionsFromKml(dataSource);
        }
        
        this.updatePhotoUploadSummary();
    }

    /**
     * 從 Excel 資料生成照片區塊
     */
    generatePhotoSectionsFromXlsx(xlsxJson) {
        const groupedProjects = {};
        const photoFields = window.advancedConfig.photo_field?.prop || [];
        const photoLayers = ["街景照片"];
        console.log(photoFields, photoLayers);
        xlsxJson.forEach(row => {
            const projectId = String(row.road_id).trim();
            if (!projectId) return;
            
            if (!groupedProjects[projectId]) {
                groupedProjects[projectId] = {
                    name: row.road_name || '未命名專案',
                    proposer: row.proposer || '',
                    district: row.district || '',
                    requiredPhotos: 0,
                    photoFieldNames: [],
                    expectedFilenames: [],
                    uploadedPhotos: []
                };
            }
            
            // 解析 pile_prop 中的照片檔名
            if (row.pile_prop) {
                try {
                    const prop = JSON.parse(row.pile_prop.replace(/\bNaN\b/g, "null"));
                    console.log(prop);
                    // 檢查 photo_field.prop 欄位
                    photoFields.forEach(fieldName => {
                        if (prop[fieldName]) {
                            groupedProjects[projectId].photoFieldNames.push(fieldName);
                            groupedProjects[projectId].expectedFilenames.push({
                                fieldName: fieldName,
                                filename: prop[fieldName]
                            });
                            groupedProjects[projectId].requiredPhotos++;
                        }
                    });
                    
                    // 檢查 photo_field.layer 欄位
                    photoLayers.forEach(layerName => {
                        if (prop[layerName] && typeof prop[layerName] === 'object') {
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
        console.log('分組後的專案資料:', groupedProjects);
        Object.keys(groupedProjects).forEach(projectId => {
            window.projectPhotoData[projectId] = groupedProjects[projectId];
        });
        
        this.generatePhotoSectionUI(groupedProjects);
    }

    /**
     * 從 KML 資料生成照片區塊
     */
    generatePhotoSectionsFromKml(kmlContent) {
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
        const folders = Array.from(kmlDoc.getElementsByTagName("Folder"));
        
        const photoFields = window.advancedConfig.photo_field?.prop || [];
        const photoLayers = window.advancedConfig.photo_field?.layer || [];
        
        folders.forEach(folder => {
            const folderName = folder.getElementsByTagName("name")[0]?.textContent || '未命名專案';
            const placemarks = Array.from(folder.getElementsByTagName("Placemark"));
            
            const projectId = folderName.replace(/\s+/g, '_');
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
                
                // 檢查主要圖形的 prop 欄位
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
                
                // 檢查 layer 類型的 Placemark
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
                window.projectPhotoData[projectId] = projectData;
            }
        });
        
        this.generatePhotoSectionUI(window.projectPhotoData);
    }

    /**
     * 生成照片上傳區塊 UI
     */
    generatePhotoSectionUI(projects) {
        const $photoSections = $("#photoSections");
        
        Object.keys(projects).forEach(projectId => {
            const project = projects[projectId];
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
                        
                        <div class="expected-filenames mb-3" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px;">
                            <h6 style="margin-bottom: 8px; color: #856404;"><i class="fas fa-file-image"></i> 建議檔名格式：</h6>
                            <div class="filename-list" style="font-size: 0.85em; color: #856404;">
                                ${this.generateExpectedFilenames(projectId, project)}
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

    /**
     * 生成期望檔名顯示
     */
    generateExpectedFilenames(projectId, project) {
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

    /**
     * 觸發專案檔案輸入 - 保持原有功能
     */
    triggerProjectFileInput(projectId) {
        document.getElementById(`fileInput_${projectId}`).click();
    }

    /**
     * 處理專案檔案選擇 - 保持原有功能
     */
    handleProjectFileSelect(event, projectId) {
        const files = event.target.files;
        this.uploadProjectFiles(files, projectId);
        $(event.target).val(''); // 清空以允許重複選擇
    }

    /**
     * 處理專案拖拽上傳 - 保持原有功能
     */
    handleProjectDrop(event, projectId) {
        event.preventDefault();
        event.stopPropagation();
        
        const uploadZone = event.currentTarget;
        uploadZone.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        this.uploadProjectFiles(files, projectId);
    }

    /**
     * 處理拖拽懸停 - 保持原有功能
     */
    handleProjectDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }

    /**
     * 處理拖拽離開 - 保持原有功能
     */
    handleProjectDragLeave(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
    }

    /**
     * 上傳專案檔案 - 保持原有功能
     */
    uploadProjectFiles(files, projectId) {
        const previewContainer = document.getElementById(`preview_${projectId}`);
        const progressContainer = document.querySelector(`[data-project="${projectId}"] .progress-bar-container`);
        const progressBar = document.querySelector(`[data-project="${projectId}"] .progress-bar`);
        
        const project = window.projectPhotoData[projectId];
        const expectedFilenames = project.expectedFilenames?.map(item => item.filename) || [];

        let validFiles = [];
        let errors = [];
        
        Array.from(files).forEach(file => {
            // 檢查格式
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!this.allowedFormats.includes(fileExtension)) {
                errors.push(`"${file.name}" 格式不支援`);
                return;
            }
            
            // 檢查大小
            if (file.size > this.maxFileSize) {
                errors.push(`"${file.name}" 檔案過大`);
                return;
            }
            
            if (!expectedFilenames.includes(file.name)) {
                errors.push(`"${file.name}" 檔名不符，請使用特定照片`);
                return;
            }

            // 檢查重複
            const isDuplicate = window.projectPhotoData[projectId].uploadedPhotos.some(photo => 
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
            this.updateProjectStatus(projectId, 'uploading');
            
            let processedCount = 0;
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const photoData = {
                        id: `${projectId}_${Date.now()}_${Math.random()}`,
                        file: file,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        dataUrl: e.target.result,
                        uploadTime: new Date().toISOString()
                    };
                    
                    window.projectPhotoData[projectId].uploadedPhotos.push(photoData);
                    
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
                        this.simulateProjectUpload(progressBar, () => {
                            this.updateProjectStatus(projectId, 'complete');
                            this.updatePhotoUploadSummary();
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    }

    /**
     * 移除專案照片 - 保持原有功能
     */
    removeProjectPhoto(button, projectId, photoId) {
        if (confirm('確定要移除此照片嗎？')) {
            button.parentElement.remove();
            const index = window.projectPhotoData[projectId].uploadedPhotos.findIndex(photo => photo.id === photoId);
            if (index > -1) {
                window.projectPhotoData[projectId].uploadedPhotos.splice(index, 1);
            }
            this.updateProjectStatus(projectId, 'pending');
            this.updatePhotoUploadSummary();
        }
    }

    /**
     * 模擬專案上傳進度 - 保持原有功能
     */
    simulateProjectUpload(progressBar, callback) {
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

    /**
     * 更新專案狀態 - 保持原有功能
     */
    updateProjectStatus(projectId, status) {
        const section = document.querySelector(`[data-project="${projectId}"]`);
        const indicator = section.querySelector('.status-indicator');
        
        indicator.classList.remove('status-pending', 'status-uploading', 'status-complete', 'status-error');
        indicator.classList.add(`status-${status}`);
        
        const colors = {
            pending: '#ffc107',
            uploading: '#17a2b8', 
            complete: '#28a745',
            error: '#dc3545'
        };
        indicator.style.backgroundColor = colors[status];
    }

    /**
     * 更新照片上傳摘要 - 保持原有功能
     */
    updatePhotoUploadSummary() {
        let pending = 0, uploading = 0, complete = 0, error = 0;
        
        Object.keys(window.projectPhotoData).forEach(projectId => {
            const project = window.projectPhotoData[projectId];
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
        
        const totalProjects = Object.keys(window.projectPhotoData).length;
        document.getElementById('totalPhotoProgress').textContent = `${complete}/${totalProjects} 專案已完成`;
    }

    /**
     * 切換照片區塊顯示 - 保持原有功能
     */
    togglePhotoSection(button) {
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
     * 收集照片上傳資料
     */
    collectPhotoUploadData() {
        const allPhotoData = [];
        
        Object.keys(window.projectPhotoData).forEach(projectId => {
            const project = window.projectPhotoData[projectId];
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

    /**
     * 處理照片檔案上傳（通用版本）
     */
    handlePhotoFiles(files, maxFileSize, allowedFormats) {
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
            const isDuplicate = window.uploadedPhotos.some(photo => 
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
            this.processValidPhotos(validFiles);
        }
    }

    /**
     * 處理有效的照片檔案
     */
    processValidPhotos(validFiles) {
        let processedCount = 0;
        
        validFiles.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const photoData = {
                    id: `photo_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: e.target.result,
                    uploadTime: new Date().toISOString(),
                    description: ''
                };
                
                // 嘗試讀取 EXIF GPS 資料
                this.extractPhotoMetadata(file, photoData);
                
                window.uploadedPhotos.push(photoData);
                processedCount++;
                
                // 當所有檔案處理完成時更新界面
                if (processedCount === validFiles.length) {
                    this.updatePhotoPreview();
                    console.log('照片上傳完成', window.uploadedPhotos);
                }
            };
            
            reader.onerror = () => {
                console.error('讀取檔案失敗:', file.name);
                processedCount++;
                
                if (processedCount === validFiles.length) {
                    this.updatePhotoPreview();
                }
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * 更新照片預覽界面
     */
    updatePhotoPreview() {
        const $container = $("#photoPreviewContainer");
        const $grid = $("#photoGrid");
        const $count = $("#photoCount");
        
        // 更新計數
        $count.text(window.uploadedPhotos.length);
        
        if (window.uploadedPhotos.length === 0) {
            $container.hide();
            return;
        }
        
        // 顯示預覽容器
        $container.show();
        $grid.empty();
        
        // 生成照片預覽
        window.uploadedPhotos.forEach((photo, index) => {
            const $photoItem = this.createPhotoPreviewItem(photo, index);
            $grid.append($photoItem);
        });
        
        // 添加一些動畫效果
        $grid.find('.image-preview').each(function(index) {
            $(this).css('animation-delay', (index * 0.1) + 's');
        });
    }

    /**
     * 創建照片預覽項目
     */
    createPhotoPreviewItem(photo, index) {
        const $photoItem = $(`
            <div class="photo-item-wrapper fade-in">
                <div class="image-preview" data-photo-id="${photo.id}">
                    <img src="${photo.dataUrl}" alt="${photo.name}" loading="lazy">
                    <button type="button" class="image-remove-btn" onclick="removePhoto('${photo.id}')" title="移除照片">×</button>
                </div>
                <div class="photo-filename" title="${photo.name}">
                    ${this.truncateFileName(photo.name, 20)}
                </div>
            </div>
        `);

        return $photoItem;
    }

    /**
     * 移除照片
     */
    removePhoto(photoId) {
        // 添加確認對話框
        if (!confirm('確定要移除這張照片嗎？')) {
            return;
        }
        
        const photoIndex = window.uploadedPhotos.findIndex(photo => String(photo.id) === String(photoId));
        console.log('移除照片ID:', photoId, '索引:', photoIndex);
        if (photoIndex > -1) {
            const removedPhoto = window.uploadedPhotos.splice(photoIndex, 1)[0];
            console.log('移除照片:', removedPhoto.name);
            
            // 添加移除動畫
            const $photoElement = $(`.image-preview[data-photo-id="${photoId}"]`);
            $photoElement.addClass('removing');
            
            setTimeout(() => {
                this.updatePhotoPreview();
            }, 300);
        }
    }

    /**
     * 清空所有照片
     */
    clearAllPhotos() {
        if (window.uploadedPhotos.length === 0) {
            return;
        }
        
        if (!confirm(`確定要清空所有 ${window.uploadedPhotos.length} 張照片嗎？此操作無法復原。`)) {
            return;
        }
        
        window.uploadedPhotos = [];
        this.updatePhotoPreview();
        console.log('已清空所有照片');
    }

    /**
     * 截斷檔案名稱
     */
    truncateFileName(fileName, maxLength) {
        if (fileName.length <= maxLength) {
            return fileName;
        }
        
        const extension = fileName.split('.').pop();
        const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
        const truncatedName = nameWithoutExtension.substring(0, maxLength - extension.length - 4) + '...';
        
        return truncatedName + '.' + extension;
    }

    /**
     * 提取照片元數據
     */
    extractPhotoMetadata(file, photoData) {
        // 這裡可以添加 EXIF 數據提取邏輯
        // 例如使用 exif-js 庫來提取 GPS 坐標等信息
        console.log('提取照片元數據:', file.name);
    }
}