// modules/dataProcessor.js - 資料處理模組
import { MapManager } from './mapManager.js';
import { UIManager } from './uiManager.js';
import { PhotoUpload } from './photoUpload.js';

export class DataProcessor {
    constructor() {
        this.mapManager = new MapManager();
        this.uiManager = new UIManager();
        this.photoUpload = new PhotoUpload();
    }

    /**
     * 顯示 Excel 處理結果 - 保持原有功能
     */
    showResult_xlsx(buffer) {
        const kind = $("#LayerKind").val();
        const svg = $("#LayerSvg").val();
        const color = $("#LayerColor").val();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const xlsxJson = XLSX.utils.sheet_to_json(worksheet);

        // 清除地圖與畫面
        this.mapManager.clearCustomLayers();
        this.uiManager.showContainer("#showContainer");
        this.uiManager.clearContainer("#result");

        const features = [];
        const groups = {};
        const props = {};
        
        console.log("Processing XLSX data:", xlsxJson);
        
        // 處理數據分組
        for (const row of xlsxJson) {
            const lat = parseFloat(row["pile_lat"]);
            const lng = parseFloat(row["pile_lon"]);
            if (isNaN(lat) || isNaN(lng)) continue;
            
            const roadId = row["road_id"] || `group_${Math.random()}`;
            if (!groups[roadId]) {
                groups[roadId] = [];
                props[roadId] = row;
            }
            groups[roadId].push([lng, lat]);

            if (kind === "point") {
                features.push({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [lng, lat] },
                    properties: row
                });
            }
        }

        // 根據圖層類型創建要素
        this.createFeaturesFromGroups(features, groups, props, kind);

        // 處理關聯圖層
        let associated_layers = [];
        let associated_fields = [];
        
        if (window.advancedConfig.advanced && window.advancedConfig.associated_layer?.length > 0) {
            associated_layers = window.advancedConfig.associated_layer;
        }

        // 創建並添加到地圖
        const geojson = { type: "FeatureCollection", features };
        const layer = this.createMapLayer(geojson, kind, svg, color, associated_layers, associated_fields);
        
        window.xlsxLayer = layer;
        
        // 處理箭頭裝飾
        if (kind === "arrowline") {
            this.addArrowDecorators(layer, color);
        }

        // 適應地圖視圖
        if (!this.mapManager.fitBounds(layer)) {
            alert('⚠️ Excel 檔案中沒有有效圖形。');
        }

        // 生成統一的資料結構
        this.generateUnifiedFeatures(xlsxJson, associated_fields);

        // 生成照片上傳區塊（如果啟用）
        if (window.advancedConfig.advanced && 
            window.advancedConfig.modules && 
            window.advancedConfig.modules.includes('photo_upload')) {
            this.photoUpload.generatePhotoUploadSections(xlsxJson, 'xlsx');
        }
    }

    /**
     * 顯示 KML 處理結果 - 保持原有功能
     */
    showResult_kml(kmlContent) {
        // 清除原圖層
        this.mapManager.clearCustomLayers();

        const kind = $("#LayerKind").val();
        const svg = $("#LayerSvg").val();
        const color = $("#LayerColor").val();

        // 解析 KML
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');
        const geojson = toGeoJSON.kml(kmlDoc);

        // 過濾 geojson.features
        geojson.features = this.filterKmlFeatures(geojson.features, kind);

        // 創建 GeoJSON 圖層
        const geoJsonLayer = this.mapManager.createGeoJSONLayer(geojson, {
            pointToLayer: (feature, latlng) => this.handleKmlPointToLayer(feature, latlng, svg),
            style: (feature) => this.handleKmlStyle(feature, color),
            onEachFeature: (feature, layer) => this.handleKmlFeature(feature, layer)
        });

        geoJsonLayer.addTo(window.map);

        // 處理箭頭裝飾
        if (kind === "arrowline") {
            this.addArrowDecorators(geoJsonLayer, color);
        }

        // 處理 KML 文檔結構
        this.processKmlDocument(kmlDoc, kind);

        // 儲存圖層
        window.kmlLayer = geoJsonLayer;

        // 適應地圖視圖
        if (!this.mapManager.fitBounds(geoJsonLayer)) {
            alert('⚠️ KML 檔案中沒有有效圖形。');
            $("#Xlsx_or_Kml").val("");
        }

        // 生成照片上傳區塊（如果啟用）
        if (window.advancedConfig.advanced && 
            window.advancedConfig.modules && 
            window.advancedConfig.modules.includes('photo_upload')) {
            this.photoUpload.generatePhotoUploadSections(kmlContent, 'kml');
        }
    }

    /**
     * 從分組數據創建要素
     */
    createFeaturesFromGroups(features, groups, props, kind) {
        if (kind === "line" || kind === "arrowline") {
            for (const roadId in groups) {
                const coords = groups[roadId];
                if (coords.length >= 2) {
                    features.push({
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: coords },
                        properties: props[roadId]
                    });
                }
            }
        } else if (kind === "plane") {
            for (const roadId in groups) {
                const coords = groups[roadId];
                if (coords.length >= 3) {
                    coords.push(coords[0]); // 封閉 polygon
                    features.push({
                        type: "Feature",
                        geometry: { type: "Polygon", coordinates: [coords] },
                        properties: props[roadId]
                    });
                }
            }
        }
    }

    /**
     * 創建地圖圖層
     */
    createMapLayer(geojson, kind, svg, color, associated_layers, associated_fields) {
        return L.geoJSON(geojson, {
            pointToLayer: (feature, latlng) => {
                return this.mapManager.createPointMarker(latlng, {
                    iconUrl: `/img/${svg}`
                });
            },
            style: (feature) => {
                if (feature.geometry.type === "LineString") {
                    return { color: color, weight: 3 };
                }
                if (feature.geometry.type === "Polygon") {
                    return { color: color, fillColor: color, weight: 2, fillOpacity: 0.5 };
                }
            },
            onEachFeature: (feature, layer) => {
                this.handleExcelFeature(feature, layer, associated_layers, associated_fields);
            }
        }).addTo(window.map);
    }

    /**
     * 處理 Excel 要素
     */
    handleExcelFeature(feature, layer, associated_layers, associated_fields) {
        const p = feature.properties;
        if (!p) return;

        let html = `<b>${p.road_name || '未命名圖層'}</b><br><table>`;
        let prop = JSON.parse((p.pile_prop || "{}").replace(/\bNaN\b/g, "null")) || {};

        for (const key in prop) {
            const value = prop[key];
            const layerDef = associated_layers.find(ld => ld.Name === key);
            
            if (layerDef) {
                associated_fields.push(key);
                this.processAssociatedLayer(layerDef, value, key);
                continue;
            }

            html += `<tr><td style="width: 30%;"><b>${key}</b></td><td>${Array.isArray(value) ? value.join("<br>") : value}</td></tr>`;
        }
        
        html += '</table>';
        layer.bindPopup(html);
    }

    /**
     * 處理關聯圖層
     */
    processAssociatedLayer(layerDef, value, key) {
        if (layerDef.GeoType === "point" && typeof value === "object") {
            this.processAssociatedPoints(layerDef, value);
        } else if (layerDef.GeoType === "line" && typeof value === "object") {
            this.processAssociatedLines(layerDef, value);
        } else if (layerDef.GeoType === "plane" && Array.isArray(value) && value.length >= 3) {
            this.processAssociatedPolygons(layerDef, value);
        }
    }

    /**
     * 處理關聯點位
     */
    processAssociatedPoints(layerDef, value) {
        for (const [imgName, coordList] of Object.entries(value)) {
            const coordStr = coordList[0];
            const [lng, lat] = coordStr.split(',').map(parseFloat);
            
            if (!isNaN(lng) && !isNaN(lat)) {
                const marker = this.mapManager.createPointMarker([lng, lat], {
                    iconUrl: `/img/${layerDef.GeoName}`
                });
                marker.bindPopup(`<b>${layerDef.Name}</b><br>${imgName}`);
                marker.addTo(window.map);
                window.associatedLayers.push(marker);
            }
        }
    }

    /**
     * 處理關聯線條
     */
    processAssociatedLines(layerDef, value) {
        for (const [imgName, coordList] of Object.entries(value)) {
            if (coordList.length < 2) continue;
            
            const lineCoords = coordList.map(coordStr => {
                const [lng, lat] = coordStr.split(',').map(parseFloat);
                return !isNaN(lng) && !isNaN(lat) ? [lng, lat] : null;
            }).filter(c => c);
            
            if (lineCoords.length >= 2) {
                const polyline = this.mapManager.createPolyline(lineCoords, {
                    color: layerDef.GeoColor || '#3388ff'
                });
                polyline.bindPopup(`<b>${layerDef.Name}</b><br>${imgName}`);
                polyline.addTo(window.map);
                window.associatedLayers.push(polyline);
            }
        }
    }

    /**
     * 處理關聯多邊形
     */
    processAssociatedPolygons(layerDef, value) {
        const polygonCoords = value.map(coordStr => {
            const [lon, lat] = coordStr.split(',').map(parseFloat);
            return !isNaN(lat) && !isNaN(lon) ? [lat, lon] : null;
        }).filter(c => c);

        if (polygonCoords.length >= 3) {
            const polygon = this.mapManager.createPolygon(polygonCoords, {
                color: layerDef.GeoColor || '#3388ff',
                fillColor: layerDef.GeoColor || '#3388ff'
            });
            polygon.bindPopup(`<b>${layerDef.Name}</b>`);
            polygon.addTo(window.map);
            window.associatedLayers.push(polygon);
        }
    }

    /**
     * 添加箭頭裝飾器
     */
    addArrowDecorators(layer, color) {
        layer.eachLayer((l) => {
            if (l instanceof L.Polyline && !(l instanceof L.Polygon)) {
                this.mapManager.addArrowDecorator(l, color);
            }
        });
    }

    /**
     * 生成統一的要素結構
     */
    generateUnifiedFeatures(xlsxJson, associated_fields) {
        window.unifiedFeatures = [];
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
            const road_dist = placemarkRows[0].road_dist;
            const pile_dir = placemarkRows[0].pile_dir || 1;
            const displayName = `${road_name} - 方向 ${pile_dir}`;

            const ImportMapdataArea = {
                name: displayName,
                adminDist: road_dist,
                MapdataPoints: converted
            };

            window.unifiedFeatures.push(ImportMapdataArea);

            const container = this.uiManager.generateAreaContainer_unified(displayName, converted, associated_fields);
            this.uiManager.appendContent("#result", container);
        }
    }

    /**
     * 過濾 KML 要素
     */
    filterKmlFeatures(features, kind) {
        return features.filter(feature => {
            const type = feature.geometry.type;
            
            if (window.advancedConfig.advanced) {
                const layerType = feature.properties.layerType;
                let matchedLayer = null;
                
                if (layerType && Array.isArray(window.advancedConfig.associated_layer)) {
                    matchedLayer = window.advancedConfig.associated_layer.find(layer => layer.Name === layerType);
                }

                if (matchedLayer) {
                    feature.layerConfig = matchedLayer;
                }

                const geometryMatch =
                    (kind === "point" && type === "Point") ||
                    ((kind === "line" || kind === "arrowline") && type === "LineString") ||
                    (kind === "plane" && type === "Polygon");

                return geometryMatch || !!matchedLayer;
            }
            
            if (kind === "point") {
                return type === "Point";
            } else if (kind === "arrowline" || kind === "line") {
                return type === "LineString";
            } else if (kind === "plane") {
                return type === "Polygon";
            }
            return true;
        });
    }

    /**
     * 處理 KML 點到圖層轉換
     */
    handleKmlPointToLayer(feature, latlng, svg) {
        const layerConfig = feature.layerConfig;
        
        if (layerConfig) {
            return this.mapManager.createPointMarker(latlng, {
                iconUrl: `/img/${layerConfig.GeoName}`
            });
        } else {
            return this.mapManager.createPointMarker(latlng, {
                iconUrl: `/img/${svg}`
            });
        }
    }

    /**
     * 處理 KML 樣式
     */
    handleKmlStyle(feature, color) {
        const layerConfig = feature.layerConfig;
        const featureColor = (layerConfig && layerConfig.Color) ? layerConfig.Color : color;
        
        if (feature.geometry.type === "LineString") {
            return { color: featureColor, weight: 3 };
        }
        if (feature.geometry.type === "Polygon") {
            return { 
                color: featureColor, 
                fillColor: featureColor, 
                weight: 2, 
                fillOpacity: 0.5 
            };
        }
    }

    /**
     * 處理 KML 要素
     */
    handleKmlFeature(feature, layer) {
        const p = feature.properties;
        if (!p) return;
        
        let html = `<b>${p.name || '未命名圖層'}</b><br><table>`;
        for (const key in p) {
            if (key !== 'name') {
                html += `<tr><td style="width: 40%;"><b>${key}</b></td><td>${p[key]}</td></tr>`;
            }
        }
        html += '</table>';
        layer.bindPopup(html);
    }

    /**
     * 處理 KML 文檔
     */
    processKmlDocument(kmlDoc, kind) {
        const folders = Array.from(kmlDoc.getElementsByTagName("Folder"));
        window.unifiedFeatures = [];
        
        folders.forEach((folder, folderIndex) => {
            const folderName = folder.getElementsByTagName("name")[0]?.textContent || `群組${folderIndex + 1}`;
            const placemarks = Array.from(folder.getElementsByTagName("Placemark"));
            
            const filteredPlacemarks = this.filterKmlPlacemarks(placemarks, kind);
            const unified = this.processKmlPlacemarks(filteredPlacemarks);
            
            const ImportMapdataArea = {
                name: folderName,
                MapdataPoints: unified
            };
            
            window.unifiedFeatures.push(ImportMapdataArea);
            
            const container = this.uiManager.generateAreaContainer_unified(folderName, unified);
            this.uiManager.appendContent("#result", container);
        });
    }

    /**
     * 過濾 KML 地標
     */
    filterKmlPlacemarks(placemarks, kind) {
        return placemarks.filter(pm => {
            const coordsElements = pm.getElementsByTagName("coordinates");
            
            if (kind === "point") {
                return coordsElements.length === 1;
            } else if (kind === "arrowline" || kind === "line") {
                return coordsElements.length >= 1 && pm.getElementsByTagName("LineString").length > 0;
            } else if (kind === "plane") {
                return pm.getElementsByTagName("Polygon").length > 0;
            }
            return true;
        });
    }

    /**
     * 處理 KML 地標
     */
    processKmlPlacemarks(placemarks) {
        const unified = [];
        const kind = $("#LayerKind").val();
        
        placemarks.forEach((pm) => {
            const coordsElements = pm.getElementsByTagName("coordinates");
            const coordSet = [];

            Array.from(coordsElements).forEach(coordEl => {
                const coordsText = coordEl.textContent.trim();
                const coordLines = coordsText.split(/\s+/);

                coordLines.forEach(coord => {
                    const [lon, lat] = coord.split(",");
                    if (lat && lon) {
                        coordSet.push([parseFloat(lat), parseFloat(lon)]);
                    }
                });
            });

            const dataMap = {};
            const dataTags = pm.getElementsByTagName("Data");
            Array.from(dataTags).forEach(data => {
                const key = data.getAttribute("name");
                const val = data.getElementsByTagName("value")[0]?.textContent || '';
                dataMap[key] = val;
            });

            coordSet.forEach((coord, idx) => {
                const [lat, lon] = coord;
                unified.push({
                    Index: kind === "point" ? unified.length : idx,
                    Latitude: lat,
                    Longitude: lon,
                    Property: kind === "point" || idx === 0 ? JSON.stringify(dataMap).replace(/\bNaN\b/g, "null") : null
                });
            });
        });
        
        return unified;
    }

    /**
     * 驗證資料格式
     */
    validateData(data, format) {
        if (!data) {
            return { valid: false, error: '資料為空' };
        }

        if (format === 'xlsx') {
            return this.validateExcelData(data);
        } else if (format === 'kml') {
            return this.validateKmlData(data);
        }

        return { valid: false, error: '不支援的格式' };
    }

    /**
     * 驗證 Excel 資料
     */
    validateExcelData(xlsxJson) {
        if (!Array.isArray(xlsxJson) || xlsxJson.length === 0) {
            return { valid: false, error: 'Excel 資料格式錯誤或為空' };
        }

        const requiredFields = ['pile_lat', 'pile_lon'];
        const missingFields = [];

        const firstRow = xlsxJson[0];
        requiredFields.forEach(field => {
            if (!(field in firstRow)) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return { 
                valid: false, 
                error: `缺少必要欄位: ${missingFields.join(', ')}` 
            };
        }

        // 檢查座標資料的有效性
        let validCoords = 0;
        xlsxJson.forEach(row => {
            const lat = parseFloat(row.pile_lat);
            const lng = parseFloat(row.pile_lon);
            if (!isNaN(lat) && !isNaN(lng)) {
                validCoords++;
            }
        });

        if (validCoords === 0) {
            return { valid: false, error: '沒有有效的座標資料' };
        }

        return { 
            valid: true, 
            totalRows: xlsxJson.length,
            validCoords: validCoords
        };
    }

    /**
     * 驗證 KML 資料
     */
    validateKmlData(kmlContent) {
        try {
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');

            // 檢查是否為有效的 XML
            const parserError = kmlDoc.getElementsByTagName('parsererror');
            if (parserError.length > 0) {
                return { valid: false, error: 'KML 格式錯誤' };
            }

            // 檢查是否包含座標資料
            const coordinates = kmlDoc.getElementsByTagName('coordinates');
            if (coordinates.length === 0) {
                return { valid: false, error: '沒有找到座標資料' };
            }

            return { 
                valid: true, 
                coordinateCount: coordinates.length
            };
        } catch (error) {
            return { valid: false, error: 'KML 解析失敗: ' + error.message };
        }
    }

    /**
     * 取得資料統計
     */
    getDataStatistics(data, format) {
        const stats = {
            format: format,
            totalFeatures: 0,
            coordinateCount: 0,
            bounds: null
        };

        if (format === 'xlsx') {
            stats.totalFeatures = data.length;
            
            let minLat = Infinity, maxLat = -Infinity;
            let minLng = Infinity, maxLng = -Infinity;
            let validCoords = 0;

            data.forEach(row => {
                const lat = parseFloat(row.pile_lat);
                const lng = parseFloat(row.pile_lon);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    validCoords++;
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                }
            });

            stats.coordinateCount = validCoords;
            if (validCoords > 0) {
                stats.bounds = {
                    north: maxLat,
                    south: minLat,
                    east: maxLng,
                    west: minLng
                };
            }
        }

        return stats;
    }

    /**
     * 匯出處理後的資料
     */
    exportProcessedData(format = 'json') {
        const data = {
            unifiedFeatures: window.unifiedFeatures,
            advancedConfig: window.advancedConfig,
            projectPhotoData: window.projectPhotoData,
            timestamp: new Date().toISOString()
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }

        return data;
    }

    /**
     * 清除所有處理的資料
     */
    clearProcessedData() {
        window.unifiedFeatures = [];
        window.projectPhotoData = {};
        window.uploadedPhotos = [];
        
        this.mapManager.clearCustomLayers();
        this.uiManager.clearContainer("#result");
        this.uiManager.hideContainer("#showContainer");
        
        console.log('已清除所有處理的資料');
    }
}