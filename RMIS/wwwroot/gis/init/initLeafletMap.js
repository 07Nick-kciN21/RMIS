// ============================================================================
// initLeafletMap.js - Leaflet 地圖初始化模組
// 將原有的 Leaflet 地圖功能整合到 AppCore 架構中
// ============================================================================

/**
 * Leaflet 地圖初始化模組
 * 負責初始化和管理 Leaflet 地圖實例
 */
var initLeafletMap = {

    // ========================================================================
    // 模組狀態變數
    // ========================================================================
    
    popupEnabled: false,        // 屬性查詢功能狀態
    streetViewEnabled: false,   // 街景功能狀態
    coordinateSwitch: 0,        // 座標系統切換 (0: TWD97, 1: WGS84)
    currentTileLayer: null,     // 當前底圖圖層
    baseMaps: {},              // 基本圖層集合
    overlayMaps: {},           // 疊加圖層集合

    // ========================================================================
    // 主要初始化方法
    // ========================================================================

    /**
     * 初始化地圖模組
     * @param {Object} appCore - 應用程式核心物件
     */
    initMap: function(appCore) {
        console.log("初始化 Leaflet 地圖模組...");

        // 儲存 appCore 參考
        this.appCore = appCore;

        // 初始化地圖實例
        this.createMapInstance();

        // 設定基礎圖層
        this.createBaseLayers();

        // 綁定 UI 事件
        this.bindUIEvents();

        // 綁定地圖事件
        this.bindMapEvents();

        // 初始化控制項
        this.initializeControls();

        // 將地圖實例存入 appCore
        appCore.map.leafletMap = this.indexMap;
        appCore.view.mapView = this.indexMap;
        appCore.view.activeView = this.indexMap;

        console.log("Leaflet 地圖初始化完成");
    },

    /**
     * 創建地圖實例
     */
    createMapInstance: function() {
        const mapId = this.appCore.view.containerName || 'indexMap';
        
        this.indexMap = L.map(mapId, { 
            zoomControl: false, 
            doubleClickZoom: false 
        }).setView([24.99305818692662, 121.3010601], 19);

        console.log("地圖實例創建完成");
    },

    /**
     * 創建基礎圖層和疊加圖層
     */
    createBaseLayers: function() {
        // 創建不同的 pane 來控制圖層順序
        this.indexMap.createPane('basePane');
        this.indexMap.createPane('overlayPane');
        this.indexMap.createPane('photoPane');

        this.indexMap.getPane('basePane').style.zIndex = 2;
        this.indexMap.getPane('overlayPane').style.zIndex = 4;
        this.indexMap.getPane('photoPane').style.zIndex = 3;

        // 預設圖層
        this.createDefaultLayers();

        // 從 API 載入額外圖層
        this.loadLayersFromAPI();
    },

    /**
     * 創建預設圖層
     */
    createDefaultLayers: function() {
        // Google 街景地圖
        const GoogleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // Google 衛星地圖
        const GoogleSatellite = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // Google 地形圖
        const GoogleTerrain = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // Google 混合地圖
        const GoogleHybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // OpenStreetMap
        const OpenStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 22,
            attribution: '&copy; OpenStreetMap contributors',
            pane: 'basePane'
        }).addTo(this.indexMap);

        // SP2006NC_3857
        const SP2006NC_3857 = L.tileLayer('https://data.csrsr.ncu.edu.tw/SP/SP2006NC_3857/{z}/{x}/{y}.png', {
            maxZoom: 22,
            attribution: '&copy; OpenStreetMap contributors',
            pane: 'basePane'
        });

        // 基本圖層配置
        this.baseMaps = {
            "Open Street地圖": OpenStreet,
            "Google 街景地圖": GoogleStreets,
            "Google 衛星地圖": GoogleSatellite,
            "Google 地形圖": GoogleTerrain,
            "Google 混和地圖": GoogleHybrid,
            "SP2006NC_3857": SP2006NC_3857,
        };

        // 設定預設底圖
        this.currentTileLayer = OpenStreet;

        // 將圖層資訊存入 appCore
        this.appCore.layers.baseLayers = this.baseMaps;
        this.appCore.layers.overlayMaps = this.overlayMaps;
    },

    /**
     * 從 API 載入圖層
     */
    loadLayersFromAPI: function() {
        const self = this;
        
        // 檢查是否有 API 端點配置
        if (!this.appCore.environment || !this.appCore.environment.url.apiBaseUrl) {
            console.warn("未配置 API 端點，跳過從 API 載入圖層");
            this.updateLayerSelectors();
            return;
        }

        $.ajax({
            url: '/api/MapAPI/GetMapSources',
            type: 'POST',
            success: function (mapSources) {
                console.log('地圖來源資料:', mapSources);
                
                // 處理 WMS 圖層
                if (mapSources.wms) {
                    mapSources.wms.forEach(source => {
                        const layer = L.tileLayer.wms(source.url, {
                            layers: source.sourceId,
                            format: source.imageFormat || 'image/png',
                            transparent: true,
                            opacity: source.type === 'basePane' ? 1 : 0.5,
                            attribution: source.attribution,
                            pane: source.type,
                            maxZoom: 22
                        });
                        
                        if (source.type === 'basePane') {
                            self.baseMaps[source.name] = layer;
                        } else {
                            self.overlayMaps[source.name] = layer;
                        }
                    });
                }

                // 處理 WMTS 圖層
                if (mapSources.wmts) {
                    mapSources.wmts.forEach(source => {
                        const layer = L.tileLayer(`${source.url}${source.sourceId}/default/EPSG:3857/{z}/{y}/{x}.png`, {
                            attribution: source.attribution,
                            opacity: source.type === 'basePane' ? 1 : 0.5,
                            pane: source.type
                        });
                        
                        if (source.type === 'basePane') {
                            self.baseMaps[source.name] = layer;
                        } else {
                            self.overlayMaps[source.name] = layer;
                        }
                    });
                }

                // 更新圖層選擇器
                self.updateLayerSelectors();
            },
            error: function (error) {
                console.error('Error fetching map sources:', error);
                // API 載入失敗時仍更新基本圖層選擇器
                self.updateLayerSelectors();
            }
        });
    },

    /**
     * 更新圖層選擇器 UI
     */
    updateLayerSelectors: function() {
        // 更新基本圖層選擇器
        const $baseMapSelector = $('#baseMapSelector');
        if ($baseMapSelector.length) {
            $baseMapSelector.empty();
            for (let name in this.baseMaps) {
                $baseMapSelector.append(`<li class="coordinate-item" value="${name}"><span>${name}</span></li>`);
            }
        }

        // 更新疊加圖層選擇器
        const $overlayMapSelector = $('#overlayMapSelector');
        if ($overlayMapSelector.length) {
            $overlayMapSelector.empty();
            for (let name in this.overlayMaps) {
                $overlayMapSelector.append(`<li class="coordinate-item" value="${name}">${name}</li>`);
            }
        }
    },

    // ========================================================================
    // 事件綁定方法
    // ========================================================================

    /**
     * 綁定 UI 事件
     */
    bindUIEvents: function() {
        const self = this;

        // 側邊欄控制事件
        this.bindOffcanvasEvents();

        // 地圖控制按鈕事件
        this.bindMapControlEvents();

        // 圖層切換事件
        this.bindLayerEvents();

        // 座標系統切換事件
        this.bindCoordinateEvents();
    },

    /**
     * 綁定側邊欄事件
     */
    bindOffcanvasEvents: function() {
        const self = this;
        const $offcanvasElement = $('#layerListBlock');
        const $indexMapElement = $('#indexMap');

        // 當 offcanvas 開啟時壓縮地圖
        $offcanvasElement.on('shown.bs.offcanvas', function () {
            const offcanvasWidth = $offcanvasElement.outerWidth();
            $indexMapElement.css({
                'transition': 'margin-left 0.3s ease, width 0.3s ease',
                'margin-left': offcanvasWidth + 'px',
                'width': 'calc(100% - ' + offcanvasWidth + 'px)'
            });

            $indexMapElement.on('transitionend', function () {
                self.indexMap.invalidateSize();
            });
        });

        // 當 offcanvas 關閉時恢復地圖
        $offcanvasElement.on('hidden.bs.offcanvas', function () {
            $indexMapElement.css({
                'margin-left': '0',
                'width': '100%'
            });

            $indexMapElement.on('transitionend', function () {
                self.indexMap.invalidateSize();
            });
        });

        // 預設 offcanvas 狀態
        this.setDefaultOffCanvas();
    },

    /**
     * 設定預設 offcanvas 狀態
     */
    setDefaultOffCanvas: function() {
        const isSmallScreen = window.matchMedia("(max-width: 899px)").matches;
        const offcanvasElement = document.getElementById('layerListBlock');
        
        if (offcanvasElement && typeof bootstrap !== 'undefined') {
            const offcanvasInstance = new bootstrap.Offcanvas(offcanvasElement);
            if (!isSmallScreen) {
                offcanvasInstance.show();
            } else {
                offcanvasInstance.hide();
            }
        }
    },

    /**
     * 綁定地圖控制事件
     */
    bindMapControlEvents: function() {
        const self = this;

        // 選單切換
        $('#menu-toggle').on('click', function () {
            $('#head-nav').toggleClass('navbar-toggle');
        });

        // 防止事件冒泡
        $('.map-controls, .map-footer').on('click', function (e) {
            e.stopPropagation();
        });

        // 縮放控制
        $('#tb-zoomIn').on('click', function () {
            self.indexMap.zoomIn();
        });

        $('#tb-zoomOut').on('click', function () {
            self.indexMap.zoomOut();
        });

        // 街景功能
        $('#tb-streetView').on('click', function () {
            self.toggleStreetView();
        });

        // 屬性查詢功能
        $('#tb-propEnabled').on('click', function () {
            self.togglePropertyQuery();
        });

        // 定位功能
        $('#tb-location').on('click', function () {
            self.locateUser();
        });

        // 縮放等級控制
        $('#zoom-level').on('input', function () {
            const zoomLevel = parseInt($(this).val(), 10);
            if (zoomLevel >= 1 && zoomLevel <= 18) {
                self.indexMap.setZoom(zoomLevel);
            }
        });

        // 底圖選擇控制
        $('#map-basemapCtrl').on('click', function () {
            $('#mapSelect').toggleClass('hide');
        });
    },

    /**
     * 綁定圖層事件
     */
    bindLayerEvents: function() {
        const self = this;

        // 基本圖層切換
        $('#baseMapSelector').on('click', '.coordinate-item', function () {
            const name = $(this).text().trim();
            self.switchBaseLayer(name);
        });

        // 疊加圖層切換
        $('#overlayMapSelector').on('click', '.coordinate-item', function (e) {
            e.stopPropagation();
            const name = $(this).text().trim();
            self.toggleOverlayLayer(name, $(this));
        });
    },

    /**
     * 綁定座標系統事件
     */
    bindCoordinateEvents: function() {
        const self = this;

        // 座標系統選擇
        $('#map-Coordinate').on('click', function () {
            $('#coordinateSelect').toggleClass('hide');
        });

        $('#coordinateSelect').on('click', '.coordinate-item', function () {
            const id = $(this).data('type');
            self.coordinateSwitch = id;
            
            if (id == 0) {
                $("#map-coord").html(`X: 0, Y: 0`);
            } else if (id == 1) {
                $("#map-coord").html(`緯度: 0, 經度: 0`);
            }
        });
    },

    /**
     * 綁定地圖事件
     */
    bindMapEvents: function() {
        const self = this;

        // 地圖點擊事件
        this.indexMap.on('click', function (e) {
            if (self.streetViewEnabled) {
                const latlng = e.latlng;
                window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}`);
            }
        });

        // 滑鼠移動事件（顯示座標）
        this.indexMap.on('mousemove', function (e) {
            self.updateCoordinateDisplay(e.latlng);
        });

        // 右鍵選單事件
        this.indexMap.on('contextmenu', function (e) {
            self.showCoordinatePopup(e.latlng);
        });

        // 定位事件
        this.indexMap.on('locationfound', function (e) {
            self.indexMap.setView(e.latlng, 19);
            L.marker(e.latlng).addTo(self.indexMap);
        });

        // 縮放和移動事件
        this.indexMap.on('zoomend moveend', function () {
            self.updateCustomScale();
        });

        this.indexMap.on('zoom', function () {
            $('#zoom-level').val(-1);
        });
    },

    // ========================================================================
    // 功能方法
    // ========================================================================

    /**
     * 切換街景功能
     */
    toggleStreetView: function() {
        if (this.popupEnabled) {
            this.popupEnabled = false;
            $('#tb-propEnabled').removeClass('active');
        }

        this.streetViewEnabled = !this.streetViewEnabled;
        const $indexMapElement = $('#indexMap');
        $indexMapElement.css('cursor', this.streetViewEnabled ? 'pointer' : 'default');

        if (this.streetViewEnabled) {
            $('#tb-streetView').addClass('active');
            this.appCore.status.mapClickMode = "streetView";
        } else {
            $('#tb-streetView').removeClass('active');
            this.appCore.status.mapClickMode = "";
        }
    },

    /**
     * 切換屬性查詢功能
     */
    togglePropertyQuery: function() {
        if (this.streetViewEnabled) {
            this.streetViewEnabled = false;
            $('#tb-streetView').removeClass('active');
            $('#indexMap').css('cursor', 'default');
        }

        this.popupEnabled = !this.popupEnabled;

        if (this.popupEnabled) {
            $('#tb-propEnabled').addClass('active').trigger('activeChange', [this.popupEnabled]);
            this.appCore.status.identify = true;
            this.appCore.status.mapClickMode = "identify";
        } else {
            $('#tb-propEnabled').removeClass('active').trigger('activeChange', [this.popupEnabled]);
            this.appCore.status.identify = false;
            this.appCore.status.mapClickMode = "";
        }
    },

    /**
     * 使用者定位
     */
    locateUser: function() {
        this.indexMap.locate({ setView: false, maxZoom: 19 });
    },

    /**
     * 切換基本圖層
     */
    switchBaseLayer: function(name) {
        if (this.baseMaps[name]) {
            $('#map-basemap').text(name);
            this.indexMap.removeLayer(this.currentTileLayer);
            this.currentTileLayer = this.baseMaps[name];
            this.currentTileLayer.addTo(this.indexMap);
        } else {
            console.warn(`未找到名為 "${name}" 的底圖`);
        }
    },

    /**
     * 切換疊加圖層
     */
    toggleOverlayLayer: function(name, $element) {
        if ($element.hasClass('selected')) {
            $element.removeClass('selected');
            this.indexMap.removeLayer(this.overlayMaps[name]);
        } else {
            $element.addClass('selected');
            this.overlayMaps[name].addTo(this.indexMap);
        }
    },

    /**
     * 更新座標顯示
     */
    updateCoordinateDisplay: function(latlng) {
        const lat = parseFloat(latlng.lat);
        const lng = parseFloat(latlng.lng);

        if (isNaN(lat) || isNaN(lng)) {
            console.error("Invalid coordinates:", lat, lng);
            return;
        }

        if (this.coordinateSwitch === 0) {
            // TWD97 座標
            const {x, y} = this.convertWgs84ToTwd97(lat, lng);
            $("#map-coord").html(`X: ${x.toFixed(3)} , Y: ${y.toFixed(3)}`);
        } else if (this.coordinateSwitch === 1) {
            // WGS84 座標
            $("#map-coord").html(`緯度: ${lat.toFixed(6)} , 經度: ${lng.toFixed(6)}`);
        }
    },

    /**
     * 顯示座標彈出視窗
     */
    showCoordinatePopup: function(latlng) {
        const lat = parseFloat(latlng.lat);
        const lng = parseFloat(latlng.lng);
        const {x, y} = this.convertWgs84ToTwd97(lat, lng);
        
        const popupContent = `
            <h2>座標資訊</h2>
            <div style="background: rgba(255, 255, 255, 0.5); padding: 10px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2);">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-weight: bold; font-size: 13px;">
                    <tr>
                        <td style="padding: 5px;">TWD97：</td>
                        <td style="padding: 5px;">${x.toFixed(2)}, </td>
                        <td style="padding: 5px;">${y.toFixed(2)}</td>
                        <td style="padding: 5px; background-color: lightgreen;">
                            <span class="coordInfoBtn" data-clipTarget="twd97" data-coordInfo="${x.toFixed(2)}, ${y.toFixed(2)}">複製</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 5px;">WGS84：</td>
                        <td style="padding: 5px;">${lat.toFixed(6)}, </td>
                        <td style="padding: 5px;">${lng.toFixed(6)}</td>
                        <td style="padding: 5px; background-color: lightgreen;">
                            <span class="coordInfoBtn" data-clipTarget="wgs84" data-coordInfo="${lat.toFixed(6)}, ${lng.toFixed(6)}">複製</span>
                        </td>
                    </tr>
                </table>
            </div>
        `;
        
        L.popup({
            maxWidth: 300,
            minWidth: 200,
            maxHeight: 150,
        })
        .setLatLng(latlng)
        .setContent(popupContent)
        .openOn(this.indexMap);
    },

    /**
     * 初始化控制項
     */
    initializeControls: function() {
        // 初始化比例尺
        this.updateCustomScale();

        // 綁定座標複製事件
        $(document).on('click', '.coordInfoBtn', function () {
            const coordInfo = $(this).attr('data-coordInfo');
            alert(`${coordInfo} 已複製到剪貼簿`);
            navigator.clipboard.writeText(coordInfo);
        });
    },

    // ========================================================================
    // 工具方法
    // ========================================================================

    /**
     * WGS84 轉 TWD97 座標轉換
     */
    convertWgs84ToTwd97: function(lat, lng) {
        // 檢查是否有 proj4 庫
        if (typeof proj4 === 'undefined') {
            console.warn("proj4 庫未載入，無法進行座標轉換");
            return { x: 0, y: 0 };
        }

        // 定義座標系統
        proj4.defs([
            ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
            ["EPSG:3826", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +datum=WGS84 +units=m +no_defs"]
        ]);

        const [x, y] = proj4("EPSG:4326", "EPSG:3826", [lng, lat]);
        return { x, y };
    },

    /**
     * 更新比例尺顯示
     */
    updateCustomScale: function() {
        const cmInPixels = 37.8; // 1 公分 = 37.8 像素
        const center = this.indexMap.getCenter();
        const point2 = this.indexMap.containerPointToLatLng([
            this.indexMap.getSize().x / 2 + cmInPixels, 
            this.indexMap.getSize().y / 2
        ]);
        
        let distance = this.indexMap.distance(center, point2);
        const zoomLevel = this.indexMap.getZoom();
        
        if (distance < 1000) {
            $("#scale-control").html(`(${zoomLevel}) 1cm : ${distance.toFixed(0)}m`);
        } else {
            distance /= 1000;
            $("#scale-control").html(`(${zoomLevel}) 1cm : ${distance.toFixed(1)}km`);
        }
    },

    // ========================================================================
    // 外部介面方法
    // ========================================================================

    /**
     * 取得地圖實例
     */
    getMap: function() {
        return this.indexMap;
    },

    /**
     * 設定地圖視角
     */
    setView: function(lat, lng, zoom) {
        this.indexMap.setView([lat, lng], zoom);
    },

    /**
     * 添加圖層
     */
    addLayer: function(layer) {
        layer.addTo(this.indexMap);
    },

    /**
     * 移除圖層
     */
    removeLayer: function(layer) {
        this.indexMap.removeLayer(layer);
    },

    /**
     * 清除所有標記
     */
    clearMarkers: function() {
        this.indexMap.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                this.indexMap.removeLayer(layer);
            }
        }.bind(this));
    }
};

// ============================================================================
// 模組匯出
// ============================================================================
export { initLeafletMap };