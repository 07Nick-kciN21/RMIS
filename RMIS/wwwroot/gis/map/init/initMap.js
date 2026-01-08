
let _appCore;
let mapId = "indexMap";
let _pro4 = appGlobal._pro4;
let initMap = {
    initMap: function (appCore) { 
        _appCore = appCore;
        // 將狀態儲存到 appCore
        _appCore.map.popupEnabled = false;
        _appCore.map.streetViewEnabled = false;
        _appCore.map.indexMap = this.initLeafletMap();
        _appCore.map.currentTileLayer = null;
        _appCore.map.baseMaps = {};
        _appCore.map.overlayMaps = {};
        _appCore.map.coordinateSwitch = 0;
        _appCore.handler.mapHandler = this;
        // 創建基礎圖層
        this.createBaseLayers();

        // 綁定 UI 事件
        this.bindUIEvents();

        // 綁定地圖事件
        this.bindMapEvents();
    },

    /**
     * 初始化地圖與事件繫結
     * @param {string} mapId - 地圖容器的 DOM ID
     */
    initLeafletMap: function () {
        console.log("map: ", L);
        // 創建 Leaflet 地圖實例
        let indexMap = L.map(mapId, { 
            zoomControl: false, 
            doubleClickZoom: false 
        }).setView([24.99305818692662, 121.3010601], 19);        
        console.log("map init ok");
        return indexMap;
    },

    /**
     * 綁定 UI 相關事件
     */
    bindUIEvents: function () {
        const $offcanvasElement = $('#layerListBlock');
        const $indexMapElement = $('#indexMap');

        // Offcanvas 開啟時壓縮地圖
        $offcanvasElement.on('shown.bs.offcanvas', () => {
            const width = $offcanvasElement.outerWidth();
            $indexMapElement.css({
                'transition': 'margin-left 0.3s ease, width 0.3s ease',
                'margin-left': width + 'px',
                'width': 'calc(100% - ' + width + 'px)'
            }).on('transitionend', () => _appCore.map.indexMap.invalidateSize());
        });

        // Offcanvas 關閉時恢復地圖大小
        $offcanvasElement.on('hidden.bs.offcanvas', () => {
            $indexMapElement.css({ 'margin-left': '0', 'width': '100%' })
                .on('transitionend', () => _appCore.map.indexMap.invalidateSize());
        });

        // 根據螢幕寬度決定是否預設開啟 offcanvas
        this.defaultOffCanvas();

        // 選單切換
        $('#menu-toggle').on('click', () => $('#head-nav').toggleClass('navbar-toggle'));

        // 阻止事件冒泡
        $('.map-controls, .map-footer').on('click', e => e.stopPropagation());

        // 縮放按鈕
        $('#tb-zoomIn').on('click', () => _appCore.map.indexMap.zoomIn());
        $('#tb-zoomOut').on('click', () => _appCore.map.indexMap.zoomOut());

        // 街景按鈕
        $('#tb-streetView').on('click', () => this.toggleStreetView());

        // 屬性查詢按鈕
        $('#tb-propEnabled').on('click', () => this.togglePopup());

        // 定位按鈕
        $('#tb-location').on('click', () => this.locateUser());

        // 縮放等級輸入
        $('#zoom-level').on('input', function () {
            const zoomLevel = parseInt($(this).val(), 10);
            if (zoomLevel >= 1 && zoomLevel <= 18) {
                _appCore.map.indexMap.setZoom(zoomLevel);
            }
        });

        // 座標系統切換
        $('#map-Coordinate').on('click', () => $('#coordinateSelect').toggleClass('hide'));

        $('#coordinateSelect').on('click', '.coordinate-item', function () {
            const id = $(this).data('type');
            _appCore.map.coordinateSwitch = id;
            const coordText = id == 0 ? `X: 0, Y: 0` : `緯度: 0, 經度: 0`;
            $("#map-coord").html(coordText);
        });

        // 底圖切換選單
        $('#map-basemapCtrl').on('click', () => $('#mapSelect').toggleClass('hide'));

        // 座標資訊複製
        $(document).on('click', '.coordInfoBtn', function () {
            const coordInfo = $(this).attr('data-coordInfo');
            alert(`${coordInfo} 已複製到剪貼簿`);
            navigator.clipboard.writeText(coordInfo);
        });
    },

    /**
     * 綁定地圖事件
     */
    bindMapEvents: function () {
        const map = _appCore.map.indexMap;

        // 定位成功事件
        map.on('locationfound', e => {
            map.setView(e.latlng, 19);
            L.marker(e.latlng, { icon: customIcon }).addTo(map);
        });

        // 地圖點擊事件（街景）
        map.on('click', e => {
            if (_appCore.map.streetViewEnabled) {
                const latlng = e.latlng;
                window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}`);
            }
        });

        // 縮放/移動結束事件
        map.on('zoomend moveend', () => this.updateCustomScale());

        // 縮放事件
        map.on('zoom', () => $('#zoom-level').val(-1));

        // 滑鼠移動事件（顯示座標）
        // map.on('mousemove', e => this.updateCoordinateDisplay(e.latlng));

        // 右鍵選單事件（顯示座標資訊）
        map.on('contextmenu', e => this.showCoordinatePopup(e.latlng));

        // 初始化比例尺
        this.updateCustomScale();
    },

    /**
     * 切換街景模式
     */
    toggleStreetView: function () {
        if (_appCore.map.popupEnabled) {
            _appCore.map.popupEnabled = false;
            $('#tb-propEnabled').removeClass('active');
        }
        _appCore.map.streetViewEnabled = !_appCore.map.streetViewEnabled;
        $('#indexMap').css('cursor', _appCore.map.streetViewEnabled ? 'pointer' : 'default');
        $('#tb-streetView').toggleClass('active', _appCore.map.streetViewEnabled);
    },

    /**
     * 切換屬性查詢模式
     */
    togglePopup: function () {
        if (_appCore.map.streetViewEnabled) {
            _appCore.map.streetViewEnabled = false;
            $('#tb-streetView').removeClass('active');
            $('#indexMap').css('cursor', 'default');
        }
        _appCore.map.popupEnabled = !_appCore.map.popupEnabled;
        $('#tb-propEnabled')
            .toggleClass('active', _appCore.map.popupEnabled)
            .trigger('activeChange', [_appCore.map.popupEnabled]);
    },

    /**
     * 定位使用者位置
     */
    locateUser: function () {
        _appCore.map.indexMap.locate({ setView: false, maxZoom: 19 });
    },

    /**
     * 預設 Offcanvas 狀態
     */
    defaultOffCanvas: function () {
        const isSmallScreen = window.matchMedia("(max-width: 899px)").matches;
        const offcanvas = new bootstrap.Offcanvas(document.getElementById('layerListBlock'));
        isSmallScreen ? offcanvas.hide() : offcanvas.show();
    },

    /**
     * 更新座標顯示
     * @param {object} latlng - Leaflet LatLng 物件
     */
    updateCoordinateDisplay: function (latlng) {
        const lat = parseFloat(latlng.lat);
        const lng = parseFloat(latlng.lng);
        
        if (isNaN(lat) || isNaN(lng)) return;

        if (_appCore.map.coordinateSwitch == 0) {
            const { x, y } = this.convertWgs84ToTwd97(lat, lng);
            $("#map-coord").html(`X: ${x.toFixed(3)} , Y: ${y.toFixed(3)}`);
        } else {
            $("#map-coord").html(`緯度: ${lat.toFixed(6)} , 經度: ${lng.toFixed(6)}`);
        }
    },

    /**
     * 顯示座標資訊彈窗
     * @param {object} latlng - Leaflet LatLng 物件
     */
    showCoordinatePopup: function (latlng) {
        const lat = parseFloat(latlng.lat);
        const lng = parseFloat(latlng.lng);
        const { x, y } = this.convertWgs84ToTwd97(lat, lng);

        const popupContent = `
            <h2>座標資訊</h2>
            <div style="background: rgba(255, 255, 255, 0.5); padding: 10px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2);">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-weight: bold; font-size: 13px;">
                    <tr>
                        <td style="padding: 5px;">TWD97：</td>
                        <td style="padding: 5px;">${x.toFixed(2)},</td>
                        <td style="padding: 5px;">${y.toFixed(2)}</td>
                        <td style="padding: 5px; background-color: lightgreen;">
                            <span class="coordInfoBtn" data-clipTarget="twd97" data-coordInfo="${x.toFixed(2)}, ${y.toFixed(2)}">複製</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 5px;">WGS84：</td>
                        <td style="padding: 5px;">${lat.toFixed(6)},</td>
                        <td style="padding: 5px;">${lng.toFixed(6)}</td>
                        <td style="padding: 5px; background-color: lightgreen;">
                            <span class="coordInfoBtn" data-clipTarget="wgs84" data-coordInfo="${lat.toFixed(6)}, ${lng.toFixed(6)}">複製</span>
                        </td>
                    </tr>
                </table>
            </div>`;

        L.popup({ maxWidth: 300, minWidth: 200, maxHeight: 150 })
            .setLatLng(latlng)
            .setContent(popupContent)
            .openOn(_appCore.map.indexMap);
    },

    /**
     * 更新自定義比例尺顯示
     */
    updateCustomScale: function () {
        const map = _appCore.map.indexMap;
        const cmInPixels = 37.8; // 假設螢幕為 96 DPI（1cm ≈ 37.8 px）
        const center = map.getCenter();
        const point2 = map.containerPointToLatLng([
            map.getSize().x / 2 + cmInPixels,
            map.getSize().y / 2
        ]);
        let distance = map.distance(center, point2);
        const zoomLevel = map.getZoom();

        $("#scale-control").html(distance < 1000
            ? `(${zoomLevel}) 1cm : ${distance.toFixed(0)}m`
            : `(${zoomLevel}) 1cm : ${(distance / 1000).toFixed(1)}km`);
    },

    /**
     * 將 WGS84 座標轉換為 TWD97
     * @param {number} lat - 緯度
     * @param {number} lng - 經度
     * @returns {{x: number, y: number}} - 轉換後的座標
     */
    convertWgs84ToTwd97: function (lat, lng) {
        return;
        // 定義 WGS84 和 TWD97 座標系統
        _pro4.defs([
            ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
            ["EPSG:3826", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +datum=WGS84 +units=m +no_defs"]
        ]);

        // 執行轉換
        const [x, y] = _pro4("EPSG:4326", "EPSG:3826", [lng, lat]);
        return { x, y };
    },

    /**
     * 創建基本圖層和圖層選單
     */
    createBaseLayers: function () {
        const map = _appCore.map.indexMap;

        // 創建自定義圖層窗格
        map.createPane('basePane');
        map.createPane('overlayPane');
        map.createPane('photoPane');

        map.getPane('basePane').style.zIndex = 2;
        map.getPane('overlayPane').style.zIndex = 4;
        map.getPane('photoPane').style.zIndex = 3;

        // Google 街景
        var GoogleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // Google 衛星
        var GoogleSatellite = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // Google 地形
        var GoogleTerrain = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // Google 混和
        var GoogleHybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        // OpenStreetMap
        var OpenStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 22,
            attribution: '&copy; OpenStreetMap contributors',
            pane: 'basePane'
        }).addTo(map);

        // 儲存基礎圖層到 appCore
        _appCore.map.baseMaps = {
            "Open Street地圖": OpenStreet,
            "Google 街景地圖": GoogleStreets,
            "Google 衛星地圖": GoogleSatellite,
            "Google 地形圖": GoogleTerrain,
            "Google 混和地圖": GoogleHybrid,
        };

        _appCore.map.overlayMaps = {};
        _appCore.map.currentTileLayer = OpenStreet;

        // 從 API 載入額外的地圖圖層
        this.loadMapSourcesFromAPI();

        // 綁定圖層切換事件
        this.bindLayerSwitchEvents();
    },

    /**
     * 從 API 載入地圖圖層來源
     */
    loadMapSourcesFromAPI: function () {
        $.ajax({
            url: '/api/MapAPI/GetMapSources',
            type: 'POST',
            success: (mapSources) => {
                // 處理 WMS 圖層
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
                        _appCore.map.baseMaps[source.name] = layer;
                    } else {
                        _appCore.map.overlayMaps[source.name] = layer;
                    }
                });

                // 處理 WMTS 圖層
                mapSources.wmts.forEach(source => {
                    const layer = L.tileLayer(`${source.url}${source.sourceId}/default/EPSG:3857/{z}/{y}/{x}.png`, {
                        attribution: source.attribution,
                        opacity: source.type === 'basePane' ? 1 : 0.5,
                        pane: source.type
                    });

                    if (source.type === 'basePane') {
                        _appCore.map.baseMaps[source.name] = layer;
                    } else {
                        _appCore.map.overlayMaps[source.name] = layer;
                    }
                });

                // 更新 UI 選單
                this.updateLayerSelectors();
            },
            error: err => console.error('Error fetching map sources:', err)
        });
    },

    /**
     * 更新圖層選擇器 UI
     */
    updateLayerSelectors: function () {
        // 清空現有選項
        $('#baseMapSelector').empty();
        $('#overlayMapSelector').empty();

        // 添加基礎圖層選項
        for (let name in _appCore.map.baseMaps) {
            $('#baseMapSelector').append(`<li class="coordinate-item" value="${name}"><span>${name}</span></li>`);
        }

        // 添加疊加圖層選項
        for (let name in _appCore.map.overlayMaps) {
            $('#overlayMapSelector').append(`<li class="coordinate-item" value="${name}">${name}</li>`);
        }
    },

    /**
     * 綁定圖層切換事件
     */
    bindLayerSwitchEvents: function () {
        const map = _appCore.map.indexMap;

        // 基礎圖層切換
        $('#baseMapSelector').on('click', '.coordinate-item', function () {
            const name = $(this).text().trim();
            if (_appCore.map.baseMaps[name]) {
                $('#map-basemap').text(name);
                map.removeLayer(_appCore.map.currentTileLayer);
                _appCore.map.currentTileLayer = _appCore.map.baseMaps[name];
                _appCore.map.currentTileLayer.addTo(map);
            }
        });

        // 疊加圖層切換
        $('#overlayMapSelector').on('click', '.coordinate-item', function (e) {
            e.stopPropagation();
            const name = $(this).text().trim();
            const selected = $(this).toggleClass('selected').hasClass('selected');
            
            if (selected) {
                _appCore.map.overlayMaps[name].addTo(map);
            } else {
                map.removeLayer(_appCore.map.overlayMaps[name]);
            }
        });
    },

    /**
     * 取得地圖實例
     * @returns {object} Leaflet 地圖實例
     */
    getIndexMap: function () {
        return _appCore.map.indexMap;
    },

    /**
     * 取得當前底圖
     * @returns {object} 當前的 Tile Layer
     */
    getCurrentTileLayer: function () {
        return _appCore.map.currentTileLayer;
    },

    /**
     * 取得所有基礎圖層
     * @returns {object} 基礎圖層物件
     */
    getBaseMaps: function () {
        return _appCore.map.baseMaps;
    },

    /**
     * 取得所有疊加圖層
     * @returns {object} 疊加圖層物件
     */
    getOverlayMaps: function () {
        return _appCore.map.overlayMaps;
    }

}
export { initMap }
