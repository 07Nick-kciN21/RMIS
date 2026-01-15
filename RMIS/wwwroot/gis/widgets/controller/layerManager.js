/**
 * LayerManager.js - 圖層管理控制器
 * 統一管理所有圖層的生命週期和狀態
 * 
 * 整合原本分散在 menu.js, pipeline.js, layers.js, list.js 的功能
 */

class LayerManager {
    constructor(appCore) {
        this._appCore = appCore;
        this._indexMap = null;
        this._apiBaseUrl = appCore.environment.url.apiBaseUrl || '/api/MapAP';
        
        // ====================================================================
        // 狀態容器（取代原本的全域變數）
        // ====================================================================
        this.state = {
            layerList: {},      // Pipeline 開關狀態 (原 menu.js)
            layers: {},         // Leaflet Layer 實例 (原 layers.js)
            layerProps: {},     // 圖層屬性資料 (原 layers.js)
            layerMeta: {}       // 圖層詮釋資料
        };
        
        // ====================================================================
        // 事件處理器
        // ====================================================================
        this.handlers = {
            onLayerAdd: [],     // 圖層加入事件
            onLayerRemove: [],  // 圖層移除事件
            onLayerToggle: []   // 圖層開關事件
        };
    }
    
    // ========================================================================
    // 初始化方法
    // ========================================================================
    
    /**
     * 初始化圖層管理器
     */
    init() {
        this._indexMap = this._appCore.map.indexMap;
        
        // 監聽地圖縮放事件
        this._indexMap.on('zoomend', () => this._handleZoomEnd());
        
        // 監聽 popup 開關狀態
        $('#tb-propEnabled').on('activeChange', (event, isActive) => {
            this._handlePopupToggle(isActive);
        });
        
        console.log('LayerManager initialized', this._apiBaseUrl);
    }
    
    // ========================================================================
    // Pipeline 管理（原 pipeline.js 功能）
    // ========================================================================
    
    /**
     * 加載 Pipeline 及其包含的圖層
     * @param {string|number} pipelineId - Pipeline ID
     * @param {string} pipelineName - Pipeline 名稱
     * @returns {Promise<Object>} 圖層資料
     */
    async addPipeline(pipelineId, pipelineName) {
        try {
            // 從 API 獲取圖層列表
            const result = await this._fetchPipelineData(pipelineId);
            const { metaData, layers } = result;
            
            // 更新狀態
            this.state.layerList[pipelineId] = {
                name: pipelineName,
                enabled: true,
                layers: layers,
                metaData: metaData
            };
            
            // 加載所有圖層到地圖
            await this._loadLayersToMap(pipelineId, layers);
            
            // 觸發事件
            this._triggerEvent('onLayerAdd', {
                pipelineId,
                pipelineName,
                layers,
                metaData
            });
            
            return { metaData, layers };
        } catch (error) {
            console.error(`Failed to add pipeline ${pipelineId}:`, error);
            throw error;
        }
    }
    
    /**
     * 移除 Pipeline 及其所有圖層
     * @param {string|number} pipelineId - Pipeline ID
     * @returns {Promise<void>}
     */
    async removePipeline(pipelineId) {
        try {
            // 獲取該 Pipeline 下的所有圖層 ID
            const result = await this._fetchPipelineLayerIds(pipelineId);
            const layerIds = result.layerIdList;
            
            // 從地圖移除所有圖層
            layerIds.forEach(layerId => {
                this._removeLayerFromMap(layerId);
            });
            
            // 更新狀態
            delete this.state.layerList[pipelineId];
            delete this.state.layerProps[pipelineId];
            
            // 觸發事件
            this._triggerEvent('onLayerRemove', {
                pipelineId,
                layerIds
            });
            
        } catch (error) {
            console.error(`Failed to remove pipeline ${pipelineId}:`, error);
            throw error;
        }
    }
    
    // ========================================================================
    // 圖層可見性控制（原 list.js 功能）
    // ========================================================================
    
    /**
     * 切換圖層可見性
     * @param {string|number} pipelineId - Pipeline ID
     * @param {boolean} visible - 是否可見
     */
    toggleLayerVisibility(pipelineId, visible) {
        const pipelineData = this.state.layerList[pipelineId];
        if (!pipelineData) return;
        
        pipelineData.enabled = visible;
        
        // 更新所有子圖層的可見性
        pipelineData.layers.forEach(layerInfo => {
            const layer = this.state.layers[layerInfo.id];
            if (layer) {
                this._setLayerVisibility(layer, visible);
            }
        });
        
        // 觸發事件
        this._triggerEvent('onLayerToggle', {
            pipelineId,
            visible
        });
    }
    
    /**
     * 設定圖層透明度
     * @param {string|number} pipelineId - Pipeline ID
     * @param {number} opacity - 透明度 (0-100)
     */
    setLayerOpacity(pipelineId, opacity) {
        const pipelineData = this.state.layerList[pipelineId];
        if (!pipelineData) return;
        
        const normalizedOpacity = opacity / 100;
        
        pipelineData.layers.forEach(layerInfo => {
            const layer = this.state.layers[layerInfo.id];
            if (layer) {
                this._applyOpacityToLayer(layer, normalizedOpacity);
            }
        });
    }
    
    // ========================================================================
    // 內部輔助方法
    // ========================================================================
    
    /**
     * 載入圖層到地圖
     * @private
     */
    async _loadLayersToMap(pipelineId, layerInfoList) {
        // 初始化 Props 容器
        if (!this.state.layerProps[pipelineId]) {
            this.state.layerProps[pipelineId] = [];
        }
        
        // 依序載入每個圖層
        const promises = layerInfoList.map(async (layerInfo) => {
            const areas = await this._fetchLayerAreas(layerInfo.id);
            
            if (areas && areas.length > 0) {
                const leafletLayer = this._createLeafletLayer(
                    layerInfo, 
                    areas, 
                    pipelineId
                );
                
                // 加入地圖
                this._indexMap.addLayer(leafletLayer);
                
                // 儲存引用
                this.state.layers[layerInfo.id] = leafletLayer;
                
                // 設定 pointer events
                this._setPointerEvents(
                    leafletLayer, 
                    this._appCore.map.popupEnabled
                );
            }
        });
        
        await Promise.all(promises);
    }
    
    /**
     * 創建 Leaflet 圖層
     * @private
     */
    _createLeafletLayer(layerInfo, areas, pipelineId) {
        const layerGroup = L.layerGroup();
        
        areas.forEach(area => {
            const points = this._parseAreaPoints(area, pipelineId);
            
            // 根據類型創建圖形
            switch (layerInfo.type) {
                case 'point':
                    this._addMarkers(points, layerGroup, layerInfo);
                    break;
                case 'line':
                    this._addPolylines(points, layerGroup, layerInfo);
                    break;
                case 'plane':
                    this._addPolygons(points, layerGroup, layerInfo);
                    break;
                case 'arrowline':
                    this._addArrowlines(points, layerGroup, layerInfo);
                    break;
            }
        });
        
        return layerGroup;
    }
    
    /**
     * 解析區域點位資料
     * @private
     */
    _parseAreaPoints(area, pipelineId) {
        return area.points.map(point => {
            const coord = [point.latitude, point.longitude];
            const prop = point.prop ? JSON.parse(point.prop.replace(/NaN/g, 'null')) : null;
            
            const merged = {
                "座標": coord,
                ...prop
            };
            
            if (prop) {
                this.state.layerProps[pipelineId].push(merged);
            }
            
            return {
                coord,
                prop: point.prop,
                merged,
                instance: null
            };
        });
    }
    
    /**
     * 設定圖層可見性
     * @private
     */
    _setLayerVisibility(layerGroup, visible) {
        const zoom = this._indexMap.getZoom();
        
        layerGroup.eachLayer(layer => {
            layer._isVisible = visible;
            const opacity = visible && zoom > 15 ? (layer._originalOpacity || 1) : 0;
            
            if (layer instanceof L.Marker) {
                layer.setOpacity(opacity);
            } else if (layer instanceof L.Polygon) {
                layer.setStyle({ opacity, fillOpacity: opacity });
            } else if (layer instanceof L.Polyline) {
                layer.setStyle({ opacity });
            }
        });
    }
    
    /**
     * 應用透明度到圖層
     * @private
     */
    _applyOpacityToLayer(layerGroup, opacity) {
        layerGroup.eachLayer(layer => {
            if (!layer._isVisible) return;
            
            layer._originalOpacity = opacity;
            
            if (layer instanceof L.Marker) {
                layer.setOpacity(opacity);
            } else if (layer instanceof L.Polygon) {
                layer.setStyle({ opacity, fillOpacity: opacity });
            } else if (layer instanceof L.Polyline) {
                layer.setStyle({ opacity });
            }
        });
    }
    
    /**
     * 從地圖移除圖層
     * @private
     */
    _removeLayerFromMap(layerId) {
        const layer = this.state.layers[layerId];
        if (layer) {
            this._indexMap.removeLayer(layer);
            delete this.state.layers[layerId];
        }
    }
    
    /**
     * 處理縮放結束事件
     * @private
     */
    _handleZoomEnd() {
        const zoom = this._indexMap.getZoom();
        
        // 根據縮放等級顯示/隱藏圖層
        Object.values(this.state.layers).forEach(layerGroup => {
            layerGroup.eachLayer(layer => {
                if (!layer._isVisible) return;
                
                const opacity = zoom > 15 ? (layer._originalOpacity || 1) : 0;
                
                if (layer instanceof L.Marker) {
                    layer.setOpacity(opacity);
                } else if (layer instanceof L.Polygon) {
                    layer.setStyle({ opacity, fillOpacity: opacity });
                } else if (layer instanceof L.Polyline) {
                    layer.setStyle({ opacity });
                }
            });
        });
    }
    
    /**
     * 處理 Popup 開關事件
     * @private
     */
    _handlePopupToggle(isActive) {
        Object.values(this.state.layers).forEach(layerGroup => {
            this._setPointerEvents(layerGroup, isActive);
        });
    }
    
    /**
     * 設定 Pointer Events
     * @private
     */
    _setPointerEvents(layerGroup, isActive) {
        layerGroup.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
                const path = layer._path;
                if (path) {
                    path.style.pointerEvents = isActive ? 'auto' : 'none';
                }
            }
        });
    }
    
    // ========================================================================
    // API 請求方法
    // ========================================================================
    
    /**
     * 獲取 Pipeline 資料
     * @private
     */
    _fetchPipelineData(pipelineId) {
        return $.ajax({
            url: `${this._apiBaseUrl}/api/MapAPI/GetLayersByPipeline?pipelineId=${pipelineId}`,
            method: 'POST'
        });
    }
    
    /**
     * 獲取 Pipeline 下的圖層 ID 列表
     * @private
     */
    _fetchPipelineLayerIds(pipelineId) {
        return $.ajax({
            url: `${this._apiBaseUrl}/api/MapAPI/GetLayerIdByPipeline?PipelineId=${pipelineId}`,
            method: 'POST'
        });
    }
    
    /**
     * 獲取圖層的區域資料
     * @private
     */
    _fetchLayerAreas(layerId) {
        return $.ajax({
            url: `${this._apiBaseUrl}/api/MapAPI/GetAreasByLayer?LayerId=${layerId}`,
            method: 'POST'
        }).then(result => result.areas);
    }
    
    // ========================================================================
    // 圖形繪製方法（原 utils.js 功能）
    // ========================================================================
    
    /**
     * 添加標記點
     * @private
     */
    _addMarkers(points, layerGroup, layerInfo) {
        const icon = L.icon({
            iconUrl: `/img/${layerInfo.svg}`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });
        
        points.forEach(point => {
            const marker = L.marker(point.coord, { icon });
            marker.addTo(layerGroup);
            
            // 綁定 Popup
            const popupContent = this._createPopupContent(
                point.prop, 
                layerInfo.name
            );
            marker.bindPopup(popupContent, {
                maxWidth: 450,
                maxHeight: 350
            });
            
            // 點擊事件
            marker.on('click', (e) => {
                this._handleMarkerClick(e, marker, layerInfo.name);
            });
            
            marker._isVisible = true;
            point.instance = marker;
        });
    }
    
    /**
     * 添加折線
     * @private
     */
    _addPolylines(points, layerGroup, layerInfo) {
        for (let i = 0; i < points.length - 1; i++) {
            const startPoint = points[i].coord;
            const endPoint = points[i + 1].coord;
            
            const polyline = L.polyline([startPoint, endPoint], {
                color: layerInfo.color
            }).addTo(layerGroup);
            
            // 綁定 Popup
            const popupContent = this._createPopupContent(
                points[i].prop,
                layerInfo.name
            );
            polyline.bindPopup(popupContent, {
                maxWidth: 350,
                maxHeight: 450
            });
            
            // 點擊事件
            polyline.on('click', (e) => {
                this._handlePolylineClick(e, polyline, layerGroup);
            });
            
            polyline._isVisible = true;
            points[i].instance = polyline;
        }
    }
    
    /**
     * 添加多邊形
     * @private
     */
    _addPolygons(points, layerGroup, layerInfo) {
        const coords = points.map(p => p.coord);
        
        const polygon = L.polygon(coords, {
            color: "#000000",
            fillColor: layerInfo.color
        }).addTo(layerGroup);
        
        // 綁定 Popup
        const popupContent = this._createPopupContent(
            points[0].prop,
            layerInfo.name
        );
        polygon.bindPopup(popupContent, {
            maxWidth: 350,
            maxHeight: 450
        });
        
        // 點擊事件
        polygon.on('click', () => {
            this._handlePolygonClick(polygon, layerInfo.color);
        });
        
        polygon._isVisible = true;
        points[0].instance = polygon;
    }
    
    /**
     * 添加箭頭線
     * @private
     */
    _addArrowlines(points, layerGroup, layerInfo) {
        const coords = points.map(p => p.coord);
        
        const arrowline = L.polyline(coords, {
            color: layerInfo.color
        }).addTo(layerGroup);
        
        // 添加箭頭裝飾
        const decorator = L.polylineDecorator(arrowline, {
            patterns: [{
                offset: '100%',
                repeat: 0,
                symbol: L.Symbol.arrowHead({
                    pixelSize: 15,
                    polygon: false,
                    pathOptions: { 
                        stroke: true, 
                        color: layerInfo.color 
                    }
                })
            }]
        }).addTo(layerGroup);
        
        // 綁定 Popup
        const popupContent = this._createPopupContent(
            points[0].prop,
            layerInfo.name
        );
        arrowline.bindPopup(popupContent, {
            maxWidth: 350,
            maxHeight: 450
        });
        
        arrowline._isVisible = true;
    }
    
    // ========================================================================
    // 事件處理
    // ========================================================================
    
    /**
     * 註冊事件監聽器
     * @param {string} eventName - 事件名稱
     * @param {Function} callback - 回調函數
     */
    on(eventName, callback) {
        if (this.handlers[eventName]) {
            this.handlers[eventName].push(callback);
        }
    }
    
    /**
     * 觸發事件
     * @private
     */
    _triggerEvent(eventName, data) {
        if (this.handlers[eventName]) {
            this.handlers[eventName].forEach(callback => {
                callback(data);
            });
        }
    }
    
    // ========================================================================
    // Popup 相關方法
    // ========================================================================
    
    /**
     * 創建 Popup 內容
     * @private
     */
    _createPopupContent(prop, layerName) {
        // 這裡可以根據需求客製化不同的 Popup 格式
        let formProp = prop;
        if (typeof prop === 'string') {
            formProp = prop.replace(/NaN/g, 'null');
            try {
                formProp = JSON.parse(formProp);
            } catch (e) {
                return "無效的 JSON 資料";
            }
        }
        
        return `
            <div style="font-size: 18px;">
                <text style="font-size: 25px; font-weight: bolder;">
                    圖層：${layerName}
                </text>
                <div>
                    ${this._formatPopupTable(formProp)}
                </div>
            </div>
        `;
    }
    
    /**
     * 格式化 Popup 表格
     * @private
     */
    _formatPopupTable(prop) {
        let table = '<table class="popup-table-content" cellpadding="5" cellspacing="0">';
        
        Object.keys(prop).forEach(key => {
            table += `<tr><th>${key}</th><td>${prop[key]}</td></tr>`;
        });
        
        table += '</table>';
        return `<div class="popup-table">${table}</div>`;
    }
    
    /**
     * 處理標記點擊事件
     * @private
     */
    _handleMarkerClick(e, marker, layerName) {
        if (!this._appCore.map.popupEnabled) {
            e.target.closePopup();
            return;
        }
        
        const latLng = e.latlng;
        this._indexMap.setView(latLng, this._indexMap.getZoom());
    }
    
    /**
     * 處理折線點擊事件
     * @private
     */
    _handlePolylineClick(e, polyline, layerGroup) {
        if (!this._appCore.map.popupEnabled) {
            e.target.closePopup();
            return;
        }
        
        // 高亮顯示當前點擊的線段
        const highlightLine = L.polyline(e.target.getLatLngs(), {
            color: 'white',
            opacity: 0.8
        }).addTo(layerGroup);
        
        const latLng = e.latlng;
        this._indexMap.setView(latLng, this._indexMap.getZoom());
        
        // 點擊地圖移除高亮
        const mapClickHandler = () => {
            layerGroup.removeLayer(highlightLine);
            this._indexMap.off('click', mapClickHandler);
        };
        this._indexMap.on('click', mapClickHandler);
    }
    
    /**
     * 處理多邊形點擊事件
     * @private
     */
    _handlePolygonClick(polygon, originalColor) {
        if (!this._appCore.map.popupEnabled) {
            polygon.closePopup();
            return;
        }
        
        // 反色高亮
        const inverseColor = this._getInverseColor(originalColor);
        polygon.setStyle({ fillColor: inverseColor });
        
        // 點擊地圖恢復顏色
        const mapClickHandler = () => {
            polygon.setStyle({ fillColor: originalColor });
            this._indexMap.off('click', mapClickHandler);
        };
        this._indexMap.on('click', mapClickHandler);
    }
    
    /**
     * 計算反色
     * @private
     */
    _getInverseColor(color) {
        if (!color.startsWith("#")) return "#FFFFFF";
        
        const hex = color.replace("#", "");
        const r = 255 - parseInt(hex.substring(0, 2), 16);
        const g = 255 - parseInt(hex.substring(2, 4), 16);
        const b = 255 - parseInt(hex.substring(4, 6), 16);
        return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
    }
    
    // ========================================================================
    // 公開 API
    // ========================================================================
    
    /**
     * 獲取圖層屬性資料
     * @param {string|number} pipelineId
     * @returns {Promise<Array>}
     */
    getLayerProps(pipelineId) {
        return new Promise((resolve, reject) => {
            if (this.state.layerProps[pipelineId]) {
                resolve(this.state.layerProps[pipelineId]);
            } else {
                // 等待資料載入
                let attempts = 0;
                const interval = setInterval(() => {
                    if (this.state.layerProps[pipelineId]) {
                        clearInterval(interval);
                        resolve(this.state.layerProps[pipelineId]);
                    }
                    if (++attempts > 20) {
                        clearInterval(interval);
                        reject(new Error(`Timeout: layerProps[${pipelineId}]`));
                    }
                }, 100);
            }
        });
    }
    
    /**
     * 獲取所有圖層狀態
     * @returns {Object}
     */
    getState() {
        return this.state;
    }
}

export { LayerManager };