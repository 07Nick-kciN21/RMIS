// modules/fileHandler.js - 檔案處理模組
import { DataProcessor } from './dataProcessor.js';
import { PhotoUpload } from './photoUpload.js';

export class FileHandler {
    constructor() {
        this.dataProcessor = new DataProcessor();
        this.photoUpload = new PhotoUpload();
    }

    /**
     * 處理格式選擇器變更事件 - 保持原有功能
     */
    handleFormatChange(event) {
        const format = $(event.target).val();
        const $fileInput = $('#Xlsx_or_Kml');
        
        if (format === 'xlsx') {
            $fileInput.attr('accept', '.xlsx');
        } else if (format === 'kml') {
            $fileInput.attr('accept', '.kml,.xml');
        } else {
            $fileInput.removeAttr('accept');
        }
    }

    /**
     * 處理檔案上傳事件 - 保持原有功能
     */
    handleFileUpload(event) {
        // 清空結果區域
        $("#result").empty();
        
        // 清空地圖 - 保持原有功能
        this.clearMapLayers();
        
        // 清空照片上傳區域
        this.clearPhotoUploadArea();
        
        // 獲取選擇的檔案
        const file = event.target.files[0];
        if (!file) {
            this.photoUpload.clearPhotoUploadModule();
            return;
        }

        this.processExcelFile(file);
        $("#showContainer").removeClass("d-none");
    }

    /**
     * 清空地圖圖層 - 保持原有功能
     */
    clearMapLayers() {
        // 清空關聯圖層
        if (window.associatedLayers) {
            window.associatedLayers.forEach(layer => window.map.removeLayer(layer));
            window.associatedLayers = [];
        }

        // 清空 Excel 圖層
        if (window.xlsxLayer) {
            window.map.removeLayer(window.xlsxLayer);
            window.xlsxLayer = null;
        }

        // 清空 KML 圖層
        if (window.kmlLayer) {
            window.map.removeLayer(window.kmlLayer);
            window.kmlLayer = null;
        }
    }

    /**
     * 清空照片上傳區域 - 保持原有功能
     */
    clearPhotoUploadArea() {
        window.uploadedPhotos = [];
        $("#photoPreviewContainer").hide();
        $("#photoGrid").empty();
        $("#photoCount").text("0");
        this.photoUpload.clearPhotoUploadModule();
    }

    /**
     * 處理 Excel 檔案
     */
    processExcelFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.dataProcessor.showResult_xlsx(content);
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * 驗證檔案格式
     */
    validateFile(file, expectedFormat) {
        const fileName = file.name.toLowerCase();
        
        if (expectedFormat === 'xlsx') {
            return fileName.endsWith('.xlsx');
        } else if (expectedFormat === 'kml') {
            return fileName.endsWith('.kml') || fileName.endsWith('.xml');
        }
        
        return false;
    }

    /**
     * 取得檔案資訊
     */
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        };
    }
}