// main.js - 主要入口文件
import { MapManager } from './importMapdata/mapManager.js';
import { FileHandler } from './importMapdata/fileHandler.js';
import { UIManager } from './importMapdata/uiManager.js';
import { AdvancedFeatures } from './importMapdata/advancedFeatures.js';
import { PhotoUpload } from './importMapdata/photoUpload.js';
import { DataProcessor } from './importMapdata/dataProcessor.js';

// 全域變數 - 保持原有的全域狀態
window.map = null;
window.xlsxLayer = null;
window.kmlLayer = null;
window.associatedLayers = [];
window.unifiedFeatures = [];
window.uploadedImages = [];
window.uploadedPhotos = [];
window.selectedSyncLayers = [];
window.advancedConfig = {};
window.associatedLayerConfig = null;
window.matchedLayer = null;
window.projectPhotoData = {};
window.isAdvancedExpanded = false;

class ImportMapdataApp {
    constructor() {
        this.mapManager = new MapManager();
        this.fileHandler = new FileHandler();
        this.uiManager = new UIManager();
        this.advancedFeatures = new AdvancedFeatures();
        this.photoUpload = new PhotoUpload();
        this.dataProcessor = new DataProcessor();
        
        this.init();
    }

    init() {
        this.initializeComponents();
        this.setupEventListeners();
        this.initializeData();
    }

    initializeComponents() {
        // 初始化地圖
        this.mapManager.initMap();
        
        // 初始化UI
        this.uiManager.initLoadingState();
        
        // 初始化進階功能
        this.advancedFeatures.initAdvancedOptions();
        
        // 初始化圖層選擇
        this.initLayerSelect();
    }

    setupEventListeners() {
        // 格式選擇器事件 - 保持原有功能
        $('#formatSelect').on('change', (e) => {
            this.fileHandler.handleFormatChange(e);
        });

        // 檔案上傳事件 - 保持原有功能
        $('#Xlsx_or_Kml').on('change', (e) => {
            this.fileHandler.handleFileUpload(e);
        });

        // 提交按鈕事件
        $('#submit').on('click', (e) => {
            this.handleSubmit(e);
        });

        // 返回按鈕事件
        $('#goback').on('click', (e) => {
            this.handleGoBack(e);
        });
    }

    /**
     * 收集簡化的照片資料
     * 返回格式：{"專案代號": [photofile, ...], "專案代號": [photofile, ...]}
     */
    collectSimplePhotoData() {
        const photoData = {};
        
        // 遍歷所有專案照片資料
        Object.keys(window.projectPhotoData || {}).forEach(projectId => {
            const project = window.projectPhotoData[projectId];
            if (project.uploadedPhotos && project.uploadedPhotos.length > 0) {
                // 只保留照片檔案的基本資訊
                photoData[projectId] = project.uploadedPhotos.map(photo => ({
                    name: photo.name,
                    size: photo.size,
                    type: photo.type,
                    base64Data: photo.dataUrl, // Base64 圖片資料
                    uploadTime: photo.uploadTime
                }));
            }
        });
        
        return photoData;
    }

    initializeData() {
        // 預設觸發格式選擇器變更
        $('#formatSelect').trigger('change');
    }

    handleSubmit(e) {
        e.preventDefault();

        // 收集照片上傳資料 - 簡化版本
        const photoUploadData = this.collectSimplePhotoData();
        
        const payload = {
            LayerId: $("#LayerId").val(),
            LayerName: $("#LayerName").val(),
            LayerKind: $("#LayerKind").val(),
            LayerSvg: $("#LayerSvg").val(),
            LayerColor: $("#LayerColor").val(),
            ImportMapdataAreas: window.unifiedFeatures,
            Associated_table: window.advancedConfig.associated_table || null,

            // 簡化的照片資料：{"專案代號": [photofile, ...], "專案代號": [photofile, ...]}
            PhotoUploadData: photoUploadData
        };

        // this.uiManager.showLoading();
        console.log("提交資料:", payload);
        $.ajax({
            url: '/Mapdata/General/Import',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: (data) => {
                if (data.success) {
                    alert('匯入成功！');
                } else {
                    alert(data.message || '匯入失敗');
                }
                this.uiManager.hideLoading();
                location.reload();
            },
            error: (xhr) => {
                alert('匯入過程發生錯誤');
                console.error(xhr);
                this.uiManager.hideLoading();
            }
        });
    }

    handleGoBack(e) {
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
        if (returnUrl) {
            window.location.href = returnUrl;
        } else {
            history.back();
        }
    }

    initLayerSelect() {
        const id = $("#LayerId").val();

        $.ajax({
            url: `/Mapdata/General/Get/Layer?id=${id}`,
            type: "POST",
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true
            },
            success: (data) => {
                if (data.success) {
                    const layers = data.layers;
                    const $select = $("#mapdataLayerSelector");
                    $select.empty();
                    $select.append($("<option selected disabled>").val(-1).text("請選擇圖層"));
                    $.each(layers, function (i, layer) {
                        $select.append($("<option>").val(layer.id).text(layer.name));
                    });
                }
            },
            error: (xhr) => {
                console.log("取得資料失敗:", xhr.status);
            }
        });
    }
}

// 當 DOM 準備好時初始化應用程式
$(document).ready(() => {
    window.app = new ImportMapdataApp();
});

// 保持原有的全域函數以供 HTML onclick 等使用
window.toggleAdvanced = function() {
    window.app.advancedFeatures.toggleAdvanced();
};

window.triggerProjectFileInput = function(projectId) {
    window.app.photoUpload.triggerProjectFileInput(projectId);
};

window.handleProjectDrop = function(event, projectId) {
    window.app.photoUpload.handleProjectDrop(event, projectId);
};

window.handleProjectDragOver = function(event) {
    window.app.photoUpload.handleProjectDragOver(event);
};

window.handleProjectDragLeave = function(event) {
    window.app.photoUpload.handleProjectDragLeave(event);
};

window.handleProjectFileSelect = function(event, projectId) {
    window.app.photoUpload.handleProjectFileSelect(event, projectId);
};

window.removeProjectPhoto = function(button, projectId, photoId) {
    window.app.photoUpload.removeProjectPhoto(button, projectId, photoId);
};

window.togglePhotoSection = function(button) {
    window.app.photoUpload.togglePhotoSection(button);
};

window.removePhoto = function(photoId) {
    window.app.photoUpload.removePhoto(photoId);
};