/**
 * 地圖圖層配置檔
 * 集中管理所有地圖圖層的定義
 * 
 * tileType: "WMS" | "WMTS" | "TileLayer" | "XYZ"
 * type: "basePane" (底圖) | "overlayPane" (疊加圖層) | "photoPane" (照片圖層)
 */

let initMapLayer = {
    /**
     * 圖層列表
     * 這是靜態配置，應用啟動時載入一次
     */
    mapLayer: [
        // ==================== 底圖 (basePane) ====================
        {
            id: null,  // 本地定義，無資料庫 ID
            name: "Open Street地圖",
            tileType: "XYZ",
            type: "basePane",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            sourceId: "",
            imageFormat: "",
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 22,
            isDefault: true  // 預設底圖
        },
        {
            id: null,
            name: "Google 街景地圖",
            tileType: "XYZ",
            type: "basePane",
            url: "http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}&hl=zh_TW",
            sourceId: "",
            imageFormat: "",
            attribution: "&copy; Google",
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            maxZoom: 22
        },
        {
            id: null,
            name: "Google 衛星地圖",
            tileType: "XYZ",
            type: "basePane",
            url: "http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}&hl=zh_TW",
            sourceId: "",
            imageFormat: "",
            attribution: "&copy; Google",
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            maxZoom: 22
        },
        {
            id: null,
            name: "Google 地形圖",
            tileType: "XYZ",
            type: "basePane",
            url: "http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}&hl=zh_TW",
            sourceId: "",
            imageFormat: "",
            attribution: "&copy; Google",
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            maxZoom: 22
        },
        {
            id: null,
            name: "Google 混和地圖",
            tileType: "XYZ",
            type: "basePane",
            url: "http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}&hl=zh_TW",
            sourceId: "",
            imageFormat: "",
            attribution: "&copy; Google",
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            maxZoom: 22
        },
        {
            id: null,
            name: "SP2006NC_3857",
            tileType: "XYZ",
            type: "basePane",
            url: "https://data.csrsr.ncu.edu.tw/SP/SP2006NC_3857/{z}/{x}/{y}.png",
            sourceId: "",
            imageFormat: "",
            attribution: "&copy; 中央大學太空及遙測研究中心",
            maxZoom: 22
        },
        
        // ==================== 內政部國土測繪中心 - 底圖 ====================
        {
            id: 5,
            name: "臺灣通用電子地圖",
            tileType: "WMS",
            type: "basePane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "EMAP",
            imageFormat: "image/png",
            attribution: "Map data © WMS provider",
            maxZoom: 22
        },
        {
            id: 11,
            name: "正射影像(混合)",
            tileType: "WMS",
            type: "basePane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "PHOTO_MIX",
            imageFormat: "image/png",
            attribution: "Map data © WMS provider",
            maxZoom: 22
        },
        {
            id: 12,
            name: "正射影像",
            tileType: "WMS",
            type: "basePane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "PHOTO2",
            imageFormat: "image/png",
            attribution: "Map data © WMS provider",
            maxZoom: 22
        },
        {
            id: 20,
            name: "台灣通用電子地圖(灰階)",
            tileType: "WMS",
            type: "basePane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "EMAP01",
            imageFormat: "image/png",
            attribution: "Map data © nlsc.gov.tw",
            maxZoom: 22
        },

        // ==================== 疊加圖層 (overlayPane) ====================
        {
            id: 7,
            name: "非都市土地使用分區圖",
            tileType: "WMTS",
            type: "overlayPane",
            url: "https://wmts.nlsc.gov.tw/wmts/",
            sourceId: "nURBAN1",
            imageFormat: "image/png",
            attribution: "&copy; NLSC",
            opacity: 0.7,
            maxZoom: 22,
            visible: false
        },
        {
            id: 8,
            name: "公有地籍圖",
            tileType: "WMTS",
            type: "overlayPane",
            url: "https://wmts.nlsc.gov.tw/wmts/",
            sourceId: "LAND_OPENDATA",
            imageFormat: "",  // NULL in DB
            attribution: "&copy; NLSC",
            opacity: 0.7,
            maxZoom: 22,
            visible: false
        },
        {
            id: 13,
            name: "縣市界",
            tileType: "WMS",
            type: "overlayPane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "CITY",
            imageFormat: "image/png",
            attribution: "Map data © WMS provider",
            opacity: 0.6,
            maxZoom: 22,
            visible: false
        },
        {
            id: 14,
            name: "鄉鎮區界",
            tileType: "WMS",
            type: "overlayPane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "TOWN",
            imageFormat: "image/png",
            attribution: "WMS layer 2",
            opacity: 0.6,
            maxZoom: 22,
            visible: false
        },
        {
            id: 15,
            name: "國土利用現況調查成果圖",
            tileType: "WMS",
            type: "overlayPane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "LUIMAP",
            imageFormat: "image/png",
            attribution: "WMS layer 3",
            opacity: 0.6,
            maxZoom: 22,
            visible: false
        },
        {
            id: 16,
            name: "村里界",
            tileType: "WMS",
            type: "overlayPane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "Village",
            imageFormat: "image/png",
            attribution: "WMS layer 3",
            opacity: 0.6,
            maxZoom: 22,
            visible: false
        },
        {
            id: 17,
            name: "地段圖",
            tileType: "WMS",
            type: "overlayPane",
            url: "https://wms.nlsc.gov.tw/wms",
            sourceId: "LANDSECT",
            imageFormat: "image/png",
            attribution: "Map data © WMS provider",
            opacity: 0.6,
            maxZoom: 22,
            visible: false
        }
    ],

    /**
     * 根據類型獲取圖層列表
     * @param {string} type - "basePane" | "overlayPane" | "photoPane"
     * @returns {Array} 符合條件的圖層陣列
     */
    getLayersByType: function(type) {
        return this.mapLayer.filter(layer => layer.type === type);
    },

    /**
     * 根據名稱獲取圖層配置
     * @param {string} name - 圖層名稱
     * @returns {Object|null} 圖層配置物件
     */
    getLayerByName: function(name) {
        return this.mapLayer.find(layer => layer.name === name) || null;
    },

    /**
     * 獲取預設底圖
     * @returns {Object|null} 預設底圖配置
     */
    getDefaultBaseMap: function() {
        return this.mapLayer.find(layer => layer.type === "basePane" && layer.isDefault) || 
               this.mapLayer.find(layer => layer.type === "basePane") || 
               null;
    },

    /**
     * 根據應用類型過濾圖層
     * @param {string} appType - 應用類型 (asset, sewage, citizen...)
     * @returns {Array} 符合應用類型的圖層
     */
    getLayersByAppType: function(appType) {
        // 可以在圖層配置中加入 appTypes 欄位來過濾
        // 這裡先返回所有圖層
        return this.mapLayer.filter(layer => {
            // 如果圖層有指定 appTypes，檢查是否包含當前類型
            if (layer.appTypes && Array.isArray(layer.appTypes)) {
                return layer.appTypes.includes(appType);
            }
            // 沒有指定則所有應用都可用
            return true;
        });
    }
};

export { initMapLayer };