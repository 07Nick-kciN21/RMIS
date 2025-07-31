// main.js - 主要入口文件
import { FileHandler } from './tool/fileHandler.js';
import { UIManager } from './tool/uiManager.js';
import { AdvancedFeatures } from './tool/advancedFeatures.js';
import { PhotoUpload } from './tool/photoUpload.js';
import { DataProcessor } from './tool/dataProcessor.js';

// 全域變數 - 保持原有的全域狀態
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

class AddRoadProjectByExcel {
    constructor() {
        this.fileHandler = new FileHandler();
        this.uiManager = new UIManager();
        this.advancedFeatures = new AdvancedFeatures();
        this.photoUpload = new PhotoUpload();
        this.dataProcessor = new DataProcessor();
        
        this.init();
    }
    init() {
        console.log("AddRoadProjectByExcel Init");
        this.initializeComponents();
        this.setupEventListeners();
    }

    initializeComponents() {
        // 初始化UI
        this.uiManager.initLoadingState();
        // 初始化進階功能
        this.advancedFeatures.initAdvancedOptions();
    }

    setupEventListeners() {
        // 檔案上傳事件 - 保持原有功能
        $('#projectFile').on('change', (e) => {
            this.fileHandler.handleFileUpload(e);
        });

        // 提交按鈕事件
        $('#submit').on('click', (e) => {
            this.handleSubmit(e);
        });
    }

    
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

    handleSubmit(e) {
        e.preventDefault();
        const photoUploadData = this.collectSimplePhotoData();
        const payload = {
            ImportMapdataAreas: window.unifiedFeatures,
            PhotoUploadData: photoUploadData
        };
        if(!payload.ImportMapdataAreas || payload.ImportMapdataAreas.length === 0) {
            alert('請先上傳有效的Excel檔案！');
            return;
        }
        // 檢查每個專案都上傳所有所需照片
        for (const [index, area] of (window.unifiedFeatures || []).entries()) {
            const projectId = index.toString();
            const requiredPhotos = window.app.photoUpload.getRequiredPhotoTypes
            ? window.app.photoUpload.getRequiredPhotoTypes(projectId)
            : []; // 需由 photoUpload 實作
            const uploadedPhotos = (window.projectPhotoData[projectId]?.uploadedPhotos || []).map(p => p.type);

            for (const type of requiredPhotos) {
                if (!uploadedPhotos.includes(type)) {
                    alert(`專案 ${area.name} 缺少所需照片類型：${type}！`);
                    return;
                }
            }
        }

        console.log("提交資料:", payload);
        // $.ajax({
        //     url: '/Admin/AddRoadProjectByExcel',
        //     type: 'POST',
        //     contentType: 'application/json',
        //     data: JSON.stringify(payload),
        //     success: (data) => {
        //         if (data.success) {
        //             alert(data.message, '匯入成功！');
        //         } else {
        //             alert(data.message || '匯入失敗');
        //         }

        //     },
        //     error: (xhr) => {
        //         alert('匯入過程發生錯誤');
        //         console.error(xhr);
        //     }
        // });
    }
}

$(document).ready(function () {
    window.app = new AddRoadProjectByExcel();
});

function handleFileUpload(event) {
    // 獲取選擇的檔案
    const file = event.target.files[0];
    processExcelFile(file);
}

function processExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        showResult_xlsx(content);
    };
    reader.readAsArrayBuffer(file);
}

function showResult_xlsx(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const xlsxJson = XLSX.utils.sheet_to_json(worksheet);

    // 生成統一的資料結構
    generateUnifiedFeatures(xlsxJson);
}

function generateUnifiedFeatures(xlsxJson) {
    unifiedFeatures = [];
    const groupedByRoadAndDir = {};

    xlsxJson.forEach(row => {
        const roadId = row.road_id;
        const pileDir = row.pile_dir || '1';
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

        const road_name = placemarkRows[0].road_name;
        const pile_dir = placemarkRows[0].pile_dir || 1;
        const displayName = `${road_name} - 預拓範圍`;
        const road_dist = placemarkRows[0].road_dist;

        const ImportMapdataArea = {
            name: displayName,
            adminDist: road_dist,
            MapdataPoints: converted
        };
        unifiedFeatures.push(ImportMapdataArea);
    }
    console.log(unifiedFeatures);
}

function collectSimplePhotoData() {
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