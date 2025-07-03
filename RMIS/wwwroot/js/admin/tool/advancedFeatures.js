// modules/advancedFeatures.js - 進階功能模組
import { PhotoUpload } from './photoUpload.js';

export class AdvancedFeatures {
    constructor() {
        this.photoUpload = new PhotoUpload();
    }

    /**
     * 初始化進階選項 - 保持原有功能
     */
    initAdvancedOptions() {
        this.loadAdvancedModules();
    }

    /**
     * 載入進階功能模組 - 保持原有功能
     */
    loadAdvancedModules() {
        const $advancedContainer = $("#advancedContainer");
        // 清空現有內容
        $advancedContainer.empty();
        $advancedContainer.append(this.createPhotoUploadModule());
        this.photoUpload.initializePhotoUpload();
    }

    /**
     * 切換進階選項顯示 - 保持原有功能
     */
    toggleAdvanced() {
        const toggle = document.querySelector('.advanced-toggle');
        const options = document.getElementById('advancedOptions');
        
        window.isAdvancedExpanded = !window.isAdvancedExpanded;
        
        if (window.isAdvancedExpanded) {
            toggle.classList.add('expanded');
            options.classList.add('expanded');
        } else {
            toggle.classList.remove('expanded');
            options.classList.remove('expanded');
        }
    }

    /**
     * 創建照片上傳模組 - 保持原有功能
     */
    createPhotoUploadModule() {
        const allowedFormats = window.advancedConfig.allowed_formats || ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        return $(`
            <div class="advanced-module fade-in" data-module="photo_upload">
                <!-- 圖片上傳容器 -->
                <div class="photo-upload-container" style="border: 2px dashed #dee2e6; border-radius: 8px; background: #f8f9fa; padding: 20px;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-secondary" id="totalPhotoProgress">等待資料載入...</span>
                    </div>

                    <!-- 動態生成的圖片上傳區塊 -->
                    <div id="photoSections" style="max-height: 300px;overflow-y: auto;">
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-file-upload fa-2x mb-2"></i>
                            <p>請先上傳 Excel 檔案，系統將自動識別需要上傳照片的專案</p>
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

    /**
     * 創建圖層同步模組
     */
    createLayerSyncModule() {
        return $(`
            <div class="advanced-module fade-in" data-module="layer_sync">
                <div class="module-header">
                    <h6 class="module-title">
                        <i class="fas fa-layer-group"></i> 圖層同步設定
                    </h6>
                </div>
                <div class="module-content">
                    <select id="layerSyncSelect" class="form-select" multiple>
                        <option value="layer1">圖層 1</option>
                        <option value="layer2">圖層 2</option>
                        <option value="layer3">圖層 3</option>
                    </select>
                    <small class="text-muted">選擇要同步的圖層</small>
                </div>
            </div>
        `);
    }

    /**
     * 創建顯示設定模組
     */
    createDisplaySettingsModule() {
        return $(`
            <div class="advanced-module fade-in" data-module="display_settings">
                <div class="module-header">
                    <h6 class="module-title">
                        <i class="fas fa-cog"></i> 顯示設定
                    </h6>
                </div>
                <div class="module-content">
                    <div class="mb-3">
                        <label for="opacityRange" class="form-label">透明度</label>
                        <input type="range" class="form-range" id="opacityRange" min="0" max="100" value="100">
                    </div>
                    <div class="mb-3">
                        <label for="zoomLevelSelect" class="form-label">預設縮放等級</label>
                        <select id="zoomLevelSelect" class="form-select">
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="18" selected>18</option>
                            <option value="20">20</option>
                        </select>
                    </div>
                </div>
            </div>
        `);
    }
    /**
     * 收集進階功能資料
     */
    collectAdvancedData() {
        const advancedData = {};
        
        // 收集圖片資料
        if ($("#advancedContainer").find('[data-module="image_gallery"]').length > 0) {
            advancedData.images = window.uploadedImages.map(img => ({
                name: img.name,
                size: img.size,
                dataUrl: img.dataUrl
            }));
        }
        
        // 收集圖層同步資料
        if ($("#advancedContainer").find('[data-module="layer_sync"]').length > 0) {
            advancedData.syncLayers = window.selectedSyncLayers;
        }
        
        // 收集顯示設定
        if ($("#advancedContainer").find('[data-module="display_settings"]').length > 0) {
            advancedData.displaySettings = {
                opacity: $("#opacityRange").val(),
                zoomLevel: $("#zoomLevelSelect").val()
            };
        }
        
        // 收集照片上傳資料
        if ($("#advancedContainer").find('[data-module="photo_upload"]').length > 0) {
            advancedData.photoUpload = this.photoUpload.collectPhotoUploadData();
        }
        
        return advancedData;
    }
}