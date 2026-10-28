/**
 * 新增 / 編輯專案預覽地圖的底圖切換控制，運作流程對齊主地圖 (map_test.js)：
 * - 預設顯示臺灣通用電子地圖（不列入選單）
 * - 基本圖層 / 疊加圖層全部來自 GetMapSources（WMS、WMTS、XYZ），回傳後才產生選單
 * - 以 pane 控制圖層順序（基本圖層在下、疊加圖層在上）
 * - 基本圖層單選（選後收合），疊加圖層多選（選單保持開啟）
 * 樣式：wwwroot/css/index/previewBasemapCtrl.css
 * @param {L.Map} map
 */
export function initPreviewBasemapCtrl(map) {
    // 創建 pane 控制圖層順序；疊加圖磚放在獨立 pane，
    // 避免與 Leaflet 預設 overlayPane 中的拓寬範圍線段互相遮蓋
    map.createPane('basePane');
    map.createPane('overlayTilePane');
    map.getPane('basePane').style.zIndex = 2;
    map.getPane('overlayTilePane').style.zIndex = 3;
    const paneOf = type => type === 'basePane' ? 'basePane' : 'overlayTilePane';

    // 預設顯示臺灣通用電子地圖，不加入 baseMaps，等 DB 資料回來後由 AJAX 統一管理
    const defaultLayer = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
        maxZoom: 22,
        maxNativeZoom: 20,
        attribution: '&copy; 內政部國土測繪中心',
        pane: 'basePane'
    }).addTo(map);
    const baseMaps = {};
    const overlayMaps = {};
    let currentTileLayer = defaultLayer;

    const BasemapCtrl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function() {
            const div = L.DomUtil.create('div', 'preview-basemap-ctrl');
            div.innerHTML = `
                <div class="preview-basemap-current">
                    <i class="fa fa-map"></i>
                    <span class="preview-basemap-name"></span>
                    <i class="fa fa-caret-down"></i>
                </div>
                <div class="preview-basemap-select">
                    <span class="preview-basemap-title">基本圖層</span>
                    <ul class="preview-baseMapSelector"></ul>
                    <span class="preview-basemap-title">疊加圖層</span>
                    <ul class="preview-overlayMapSelector"></ul>
                </div>`;
            // 避免點擊/滾動控制項時觸發地圖事件（如點圖新增模式）
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        }
    });
    const $ctrl = $(new BasemapCtrl().addTo(map).getContainer());
    $ctrl.find('.preview-basemap-name').text('臺灣通用電子地圖');

    $ctrl.on('click', '.preview-basemap-current', function() {
        $ctrl.toggleClass('open');
    });

    // 從 API 取得地圖來源資料
    $.ajax({
        url: '/api/MapAPI/GetMapSources',
        type: 'POST',
        success: function(mapSources) {
            (mapSources.wms || []).forEach(source => {
                const layer = L.tileLayer.wms(source.url, {
                    layers: source.sourceId,
                    format: source.imageFormat || 'image/png',
                    transparent: true,
                    opacity: source.type === 'basePane' ? 1 : 0.5,
                    attribution: source.attribution,
                    pane: paneOf(source.type),
                    maxZoom: 22
                });
                (source.type === 'basePane' ? baseMaps : overlayMaps)[source.name] = layer;
            });

            (mapSources.wmts || []).forEach(source => {
                const tileUrl = source.sourceId === 'DMAPS'
                    ? `/api/MapAPI/tile/${source.sourceId}/{z}/{y}/{x}`
                    : `${source.url}${source.sourceId}/default/EPSG:3857/{z}/{y}/{x}.png`;
                const layer = L.tileLayer(tileUrl, {
                    attribution: source.attribution,
                    opacity: source.type === 'basePane' ? 1 : 0.5,
                    pane: paneOf(source.type),
                    // 超過 18 級時放大第 18 級圖磚顯示，避免圖層消失
                    maxZoom: 22,
                    maxNativeZoom: 18
                });
                (source.type === 'basePane' ? baseMaps : overlayMaps)[source.name] = layer;
            });

            (mapSources.xyz || []).forEach(source => {
                const options = {
                    attribution: source.attribution,
                    pane: paneOf(source.type),
                    maxZoom: 22
                };
                if (source.subdomains) options.subdomains = source.subdomains.split(',');
                const layer = L.tileLayer(source.url, options);
                (source.type === 'basePane' ? baseMaps : overlayMaps)[source.name] = layer;
            });

            // 產生選單
            const $base = $ctrl.find('.preview-baseMapSelector');
            Object.keys(baseMaps).forEach(name => {
                $('<li class="preview-basemap-item"></li>')
                    .text(name).attr('data-name', name)
                    .appendTo($base);
            });
            const $overlay = $ctrl.find('.preview-overlayMapSelector');
            Object.keys(overlayMaps).forEach(name => {
                $('<li class="preview-basemap-item"></li>')
                    .text(name).attr('data-name', name)
                    .appendTo($overlay);
            });
        },
        error: function(error) {
            console.error('Error fetching map sources:', error);
        }
    });

    // 基本圖層切換
    $ctrl.on('click', '.preview-baseMapSelector .preview-basemap-item', function() {
        const name = $(this).attr('data-name');
        if (baseMaps[name]) {
            $ctrl.find('.preview-basemap-name').text(name);
            map.removeLayer(currentTileLayer);
            currentTileLayer = baseMaps[name];
            currentTileLayer.addTo(map);
            $(this).addClass('selected').siblings().removeClass('selected');
        }
        $ctrl.removeClass('open');
    });

    // 疊加圖層複選
    $ctrl.on('click', '.preview-overlayMapSelector .preview-basemap-item', function() {
        const layer = overlayMaps[$(this).attr('data-name')];
        if (!layer) return;

        const selected = $(this).toggleClass('selected').hasClass('selected');
        selected ? layer.addTo(map) : map.removeLayer(layer);
    });
}
