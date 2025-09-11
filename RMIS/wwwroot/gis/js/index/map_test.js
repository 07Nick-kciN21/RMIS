let customIcon = L.icon({
    iconUrl: '/img/2.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
const Map = {
    // 是否啟用屬性資料功能（與街景功能互斥）
    popupEnabled: false,

    // 是否啟用街景功能（與屬性資料功能互斥）
    dtreetViewEnabled: false,

    // Leaflet 地圖實例
    indexMap: null,
    /**
     * 初始化地圖與事件繫結
     * @param {string} mapId - 地圖容器的 DOM ID
     */
    init: function (mapId) {
        this.indexMap = L.map(mapId, { zoomControl: false, doubleClickZoom: false }).setView([24.99305818692662, 121.3010601], 19);
        this.createBaseLayers();

        const $offcanvasElement = $('#layerListBlock');
        const $indexMapElement = $('#indexMap');
        let coordinateSwitch = 0;

        // 當 offcanvas 開啟時壓縮地圖
        $offcanvasElement.on('shown.bs.offcanvas', () => {
            const width = $offcanvasElement.outerWidth();
            $indexMapElement.css({
                'transition': 'margin-left 0.3s ease, width 0.3s ease',
                'margin-left': width + 'px',
                'width': 'calc(100% - ' + width + 'px)'
            }).on('transitionend', () => this.indexMap.invalidateSize());
        });

        // 當 offcanvas 關閉時恢復地圖大小
        $offcanvasElement.on('hidden.bs.offcanvas', () => {
            $indexMapElement.css({ 'margin-left': '0', 'width': '100%' })
                .on('transitionend', () => this.indexMap.invalidateSize());
        });

        // 根據螢幕寬度決定是否預設開啟 offcanvas
        const defaultOffCanvas = () => {
            const isSmallScreen = window.matchMedia("(max-width: 899px)").matches;
            const offcanvas = new bootstrap.Offcanvas(document.getElementById('layerListBlock'));
            isSmallScreen ? offcanvas.hide() : offcanvas.show();
        };
        defaultOffCanvas();

        $('#menu-toggle').on('click', () => $('#head-nav').toggleClass('navbar-toggle'));

        $('.map-controls, .map-footer').on('click', e => e.stopPropagation());

        $('#tb-zoomIn').on('click', () => this.indexMap.zoomIn());
        $('#tb-zoomOut').on('click', () => this.indexMap.zoomOut());

        $('#tb-streetView').on('click', () => {
            if (this.popupEnabled) {
                this.popupEnabled = false;
                $('#tb-propEnabled').removeClass('active');
            }
            this.dtreetViewEnabled = !this.dtreetViewEnabled;
            $indexMapElement.css('cursor', this.dtreetViewEnabled ? 'pointer' : 'default');
            $('#tb-streetView').toggleClass('active', this.dtreetViewEnabled);
        });

        $('#tb-propEnabled').on('click', () => {
            if (this.dtreetViewEnabled) {
                this.dtreetViewEnabled = false;
                $('#tb-streetView').removeClass('active');
                $indexMapElement.css('cursor', 'default');
            }
            this.popupEnabled = !this.popupEnabled;
            $('#tb-propEnabled')
                .toggleClass('active', this.popupEnabled)
                .trigger('activeChange', [this.popupEnabled]);
        });

        $('#tb-location').on('click', () => {
            this.indexMap.locate({ setView: false, maxZoom: 19 });
        });

        this.indexMap.on('locationfound', e => {
            this.indexMap.setView(e.latlng, 19);
            L.marker(e.latlng).addTo(this.indexMap);
        });

        this.indexMap.on('click', e => {
            if (this.dtreetViewEnabled) {
                const latlng = e.latlng;
                window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}`);
            }
        });

        $('#zoom-level').on('input', function () {
            const zoomlevel = parseInt($(this).val(), 10);
            if (zoomlevel >= 1 && zoomlevel <= 18) {
                Map.indexMap.setZoom(zoomlevel);
            }
        });

        $('#map-Coordinate').on('click', () => $('#coordinateSelect').toggleClass('hide'));

        $('#coordinateSelect').on('click', '.coordinate-item', function () {
            const id = $(this).data('type');
            coordinateSwitch = id;
            const coordText = id == 0 ? `X: 0, Y: 0` : `緯度: 0, 經度: 0`;
            $("#map-coord").html(coordText);
        });

        $('#map-basemapCtrl').on('click', () => $('#mapSelect').toggleClass('hide'));

        $indexMapElement.css('cursor', 'default');

        this.indexMap.on('zoomend moveend', this.updateCustomScale.bind(this));

        this.indexMap.on('zoom', () => $('#zoom-level').val(-1));

        this.updateCustomScale();

        this.indexMap.on('mousemove', function (e) {
            const latlng = e.latlng;
            const lat = parseFloat(latlng.lat);
            const lng = parseFloat(latlng.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            if (coordinateSwitch == 0) {
                const { x, y } = Map.convertWgs84ToTwd97(lat, lng);
                $("#map-coord").html(`X: ${x.toFixed(3)} , Y: ${y.toFixed(3)}`);
            } else {
                $("#map-coord").html(`緯度: ${lat.toFixed(6)} , 經度: ${lng.toFixed(6)}`);
            }
        });

        this.indexMap.on('contextmenu', (e) => {
            const latlng = e.latlng;
            const lat = parseFloat(latlng.lat);
            const lng = parseFloat(latlng.lng);
            const { x, y } = Map.convertWgs84ToTwd97(lat, lng);
            const popupContent = `
                <h2>座標資訊</h2>
                <div style="background: rgba(255, 255, 255, 0.5); padding: 10px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.2);">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-weight: bold; font-size: 13px;">
                        <tr><td style="padding: 5px;">TWD97：</td><td style="padding: 5px;">${x.toFixed(2)},</td><td style="padding: 5px;">${y.toFixed(2)}</td>
                            <td style="padding: 5px; background-color: lightgreen;">
                                <span class="coordInfoBtn" data-clipTarget="twd97" data-coordInfo="${x.toFixed(2)}, ${y.toFixed(2)}">複製</span>
                            </td></tr>
                        <tr><td style="padding: 5px;">WGS84：</td><td style="padding: 5px;">${lat.toFixed(6)},</td><td style="padding: 5px;">${lng.toFixed(6)}</td>
                            <td style="padding: 5px; background-color: lightgreen;">
                                <span class="coordInfoBtn" data-clipTarget="wgs84" data-coordInfo="${lat.toFixed(6)}, ${lng.toFixed(6)}">複製</span>
                            </td></tr>
                    </table>
                </div>`;
            L.popup({ maxWidth: 300, minWidth: 200, maxHeight: 150 })
                .setLatLng(latlng)
                .setContent(popupContent)
                .openOn(this.indexMap);
        });

        $(document).on('click', '.coordInfoBtn', function () {
            const coordInfo = $(this).attr('data-coordInfo');
            alert(`${coordInfo} 已複製到剪貼簿`);
            navigator.clipboard.writeText(coordInfo);
        });

        return this.indexMap;
    },

    getIndexMap: function () {
        return this.indexMap;
    },

    /**
     * 將 WGS84 座標轉換為 TWD97
     * @param {number} lat - 緯度
     * @param {number} lng - 經度
     * @returns {{x: number, y: number}} - 轉換後的座標
     */
    convertWgs84ToTwd97: function (lat, lng) {
        // 定義 WGS84 和 TWD97 座標系統
        proj4.defs([
            ["EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs"],
            ["EPSG:3826", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +datum=WGS84 +units=m +no_defs"]
        ]);

        // 執行轉換
        const [x, y] = proj4("EPSG:4326", "EPSG:3826", [lng, lat]);
        return { x, y };
    },

    /**
     * 更新自定義比例尺顯示
     * 計算地圖中心點往右偏移 1 公分後的距離
     */
    updateCustomScale: function () {
        const cmInPixels = 37.8; // 假設螢幕為 96 DPI（1cm ≈ 37.8 px）
        const center = this.indexMap.getCenter();
        const point2 = this.indexMap.containerPointToLatLng([this.indexMap.getSize().x / 2 + cmInPixels, this.indexMap.getSize().y / 2]);
        let distance = this.indexMap.distance(center, point2);
        const zoomlevel = this.indexMap.getZoom();
        $("#scale-control").html(distance < 1000
            ? `(${zoomlevel}) 1cm : ${distance.toFixed(0)}m`
            : `(${zoomlevel}) 1cm : ${(distance / 1000).toFixed(1)}km`);
    },

    // 創建基本圖層和額外圖層選單
    createBaseLayers: function () {
        const map = this.indexMap;

        map.createPane('basePane');
        map.createPane('overlayPane');
        map.createPane('photoPane');

        map.getPane('basePane').style.zIndex = 2;
        map.getPane('overlayPane').style.zIndex = 4;
        map.getPane('photoPane').style.zIndex = 3;
        //google街景
        var GoogleStreets = L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });
        //google衛星
        var GoogleSatellite = L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });
        //google地形
        var GoogleTerrain = L.tileLayer('http://{s}.google.com/vt?lyrs=s&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        //google混和
        var GoogleHybrid = L.tileLayer('http://{s}.google.com/vt?lyrs=p&x={x}&y={y}&z={z}&hl=zh_TW', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            pane: 'basePane'
        });

        //openstreet
        var OpenStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 22,
            attribution: '&copy; OpenStreetMap contributors',
            pane: 'basePane'
        }).addTo(this.indexMap);

        //SP2006NC_3857
        var SP2006NC_3857 = L.tileLayer('https://data.csrsr.ncu.edu.tw/SP/SP2006NC_3857/{z}/{x}/{y}.png', {
            maxZoom: 22,
            attribution: '&copy; OpenStreetMap contributors',
            pane: 'basePane'
        });
        const baseMaps = {
            "Open Street地圖": OpenStreet,
            "Google 街景地圖": GoogleStreets,
            "Google 衛星地圖": GoogleSatellite,
            "Google 地形圖"  : GoogleTerrain,
            "Google 混和地圖": GoogleHybrid,
            "SP2006NC_3857": SP2006NC_3857, 
        };
        const overlayMaps = {};

        let currentTileLayer = baseMaps["Open Street地圖"];

        $.ajax({
            url: '/api/MapAPI/GetMapSources',
            type: 'POST',
            success: function (mapSources) {
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
                    (source.type === 'basePane' ? baseMaps : overlayMaps)[source.name] = layer;
                });

                mapSources.wmts.forEach(source => {
                    const layer = L.tileLayer(`${source.url}${source.sourceId}/default/EPSG:3857/{z}/{y}/{x}.png`, {
                        attribution: source.attribution,
                        opacity: source.type === 'basePane' ? 1 : 0.5,
                        pane: source.type
                    });
                    (source.type === 'basePane' ? baseMaps : overlayMaps)[source.name] = layer;
                });

                for (let name in baseMaps) {
                    $('#baseMapSelector').append(`<li class="coordinate-item" value="${name}"><span>${name}</span></li>`);
                }
                for (let name in overlayMaps) {
                    $('#overlayMapSelector').append(`<li class="coordinate-item" value="${name}">${name}</li>`);
                }
            },
            error: err => console.error('Error fetching map sources:', err)
        });

        $('#baseMapSelector').on('click', '.coordinate-item', function () {
            const name = $(this).text().trim();
            if (baseMaps[name]) {
                $('#map-basemap').text(name);
                map.removeLayer(currentTileLayer);
                currentTileLayer = baseMaps[name];
                currentTileLayer.addTo(map);
            }
        });

        $('#overlayMapSelector').on('click', '.coordinate-item', function (e) {
            e.stopPropagation();
            const name = $(this).text().trim();
            const selected = $(this).toggleClass('selected').hasClass('selected');
            selected ? overlayMaps[name].addTo(map) : map.removeLayer(overlayMaps[name]);
        });
    }
};

export { Map };
