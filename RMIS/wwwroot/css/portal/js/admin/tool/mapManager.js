// modules/mapManager.js - 地圖管理模組
export class MapManager {
    constructor() {
        this.defaultCenter = [24.99305818692662, 121.3010601];
        this.defaultZoom = 18;
    }

    /**
     * 初始化地圖 - 保持原有功能
     */
    initMap() {
        window.map = L.map('map').setView(this.defaultCenter, this.defaultZoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(window.map);

        return window.map;
    }

    /**
     * 創建點標記
     */
    createPointMarker(latlng, iconConfig = {}) {
        const defaultIcon = {
            iconUrl: iconConfig.iconUrl || '/img/default-marker.png',
            iconSize: iconConfig.iconSize || [32, 32],
            iconAnchor: iconConfig.iconAnchor || [16, 32],
            popupAnchor: iconConfig.popupAnchor || [0, -32]
        };

        return L.marker(latlng, {
            icon: L.icon(defaultIcon)
        });
    }

    /**
     * 創建關聯圖層標記
     */
    createAssociatedMarker(coordinates, layerConfig) {
        const [lng, lat] = coordinates;
        
        if (isNaN(lng) || isNaN(lat)) {
            return null;
        }

        const marker = L.marker([lng, lat], {
            icon: L.icon({
                iconUrl: `/img/${layerConfig.GeoName}`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })
        });

        return marker;
    }

    /**
     * 創建線條
     */
    createPolyline(coordinates, options = {}) {
        const defaultOptions = {
            color: options.color || '#3388ff',
            weight: options.weight || 3
        };

        return L.polyline(coordinates, defaultOptions);
    }

    /**
     * 創建多邊形
     */
    createPolygon(coordinates, options = {}) {
        const defaultOptions = {
            color: options.color || '#3388ff',
            fillColor: options.fillColor || options.color || '#3388ff',
            weight: options.weight || 2,
            fillOpacity: options.fillOpacity || 0.5
        };

        return L.polygon(coordinates, defaultOptions);
    }

    /**
     * 添加箭頭裝飾器到線條
     */
    addArrowDecorator(polyline, color) {
        const decorator = L.polylineDecorator(polyline, {
            patterns: [{
                offset: '100%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                    pixelSize: 25,
                    pathOptions: {
                        fillOpacity: 1,
                        weight: 0,
                        color: color,
                        interactive: false,
                    }
                })
            }]
        });
        
        decorator.addTo(window.map);
        return decorator;
    }

    /**
     * 創建 GeoJSON 圖層
     */
    createGeoJSONLayer(geojson, options = {}) {
        return L.geoJSON(geojson, {
            pointToLayer: options.pointToLayer || this.defaultPointToLayer.bind(this),
            style: options.style || this.defaultStyle.bind(this),
            onEachFeature: options.onEachFeature || this.defaultOnEachFeature.bind(this)
        });
    }

    /**
     * 預設點到圖層轉換
     */
    defaultPointToLayer(feature, latlng) {
        const layerConfig = feature.layerConfig;
        
        if (layerConfig) {
            return this.createPointMarker(latlng, {
                iconUrl: `/img/${layerConfig.GeoName}`
            });
        }
        
        return this.createPointMarker(latlng);
    }

    /**
     * 預設樣式
     */
    defaultStyle(feature) {
        const layerConfig = feature.layerConfig;
        const color = (layerConfig && layerConfig.Color) ? layerConfig.Color : '#3388ff';
        
        if (feature.geometry.type === "LineString") {
            return { color: color, weight: 3 };
        }
        if (feature.geometry.type === "Polygon") {
            return { 
                color: color, 
                fillColor: color, 
                weight: 2, 
                fillOpacity: 0.5 
            };
        }
    }

    /**
     * 預設要素處理
     */
    defaultOnEachFeature(feature, layer) {
        const properties = feature.properties;
        if (!properties) return;

        let html = `<b>${properties.name || '未命名圖層'}</b><br><table>`;
        for (const key in properties) {
            if (key !== 'name') {
                html += `<tr><td style="width: 40%;"><b>${key}</b></td><td>${properties[key]}</td></tr>`;
            }
        }
        html += '</table>';
        layer.bindPopup(html);
    }

    /**
     * 移除圖層
     */
    removeLayer(layer) {
        if (layer && window.map.hasLayer(layer)) {
            window.map.removeLayer(layer);
        }
    }

    /**
     * 適應地圖視圖到圖層範圍
     */
    fitBounds(layer) {
        if (layer && layer.getBounds && layer.getLayers().length > 0) {
            window.map.fitBounds(layer.getBounds());
            return true;
        }
        return false;
    }

    /**
     * 設定地圖視圖
     */
    setView(center, zoom) {
        window.map.setView(center, zoom);
    }

    /**
     * 清空所有自定義圖層
     */
    clearCustomLayers() {
        // 清空關聯圖層
        if (window.associatedLayers) {
            window.associatedLayers.forEach(layer => this.removeLayer(layer));
            window.associatedLayers = [];
        }

        // 清空主要圖層
        if (window.xlsxLayer) {
            this.removeLayer(window.xlsxLayer);
            window.xlsxLayer = null;
        }

        if (window.kmlLayer) {
            this.removeLayer(window.kmlLayer);
            window.kmlLayer = null;
        }
    }
}