// 層級管理系統 JavaScript - 修正版
// 正確階層：Pipeline -> Layer -> Area -> Point

let currentPage = 'pipeline';
let currentPipeline = '';
let currentPipelineId = '';
let currentLayer = '';
let currentLayerId = '';
let currentArea = '';
let currentAreaId = '';
let currentDistrict = ''; // 新增：當前選擇的行政區
let allPipelines = [];
let map = null;       // Leaflet map 實例
let pointLayer = null; // 儲存目前圖層（可多次移除與新增）

$(document).ready(function() {
    initializeMap();  // 頁面載入時建立一次地圖
    loadPipelines();
    updateActionPanel('pipeline');
    bindDistrictSelectEvent();
});


function initializeMap() {
    map = L.map('map').setView([23.5, 121], 17); // 預設中心在台灣
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
    }).addTo(map);

    // 初始化一個空的圖層群組（用來控制點、線、面等）
    pointLayer = L.layerGroup().addTo(map);
}

// ====================================
// Pipeline 管理功能
// ====================================

// 載入Pipeline資料
function loadPipelines() {
    const $pipelineGrid = $('.pipeline-grid');    
    $.ajax({
        url: '/Mapdata/Get/ManagerData',
        type: 'POST',
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(data) {
            if (data.success) {
                allPipelines = data.mapdataManager.pipelineDatas;
                renderPipelines(allPipelines);
                updatePipelineStats(allPipelines);
            } else {
                $pipelineGrid.html('<div style="text-align: center; padding: 40px; color: #f44336;">載入失敗</div>');
            }
        },
        error: function(xhr) {
            console.error('Error loading pipelines:', xhr);
            $pipelineGrid.html('<div style="text-align: center; padding: 40px; color: #f44336;">載入失敗</div>');
        }
    });
}

// 渲染Pipeline卡片
function renderPipelines(pipelines) {
    const $pipelineGrid = $('.pipeline-grid');
    
    if (pipelines.length === 0) {
        $pipelineGrid.html('<div style="text-align: center; padding: 40px; color: #666;">暫無管線資料</div>');
        return;
    }
    
    const pipelineCards = pipelines.map(pipeline => `
        <div class="layer-card" data-pipeline-id="${pipeline.id}" data-pipeline-name="${pipeline.name}">
            <div class="layer-header">
                <div>
                    <div class="layer-name">${pipeline.name}</div>
                    <div class="layer-type">${pipeline.category}</div>
                </div>
                <span class="status-indicator status-active"></span>
            </div>
            
            <div class="layer-meta">
                <div>🗂️ 類別：${pipeline.category}</div>
                <div>🆔 ID：${pipeline.id}</div>
            </div>
            
            <div class="layer-actions">
                <button class="btn btn-primary manage-layers-btn">查看圖層</button>
                <button class="btn btn-danger delete-pipeline-btn" data-pipeline-id="${pipeline.id}" data-pipeline-name="${pipeline.name}">刪除</button>
            </div>
        </div>
    `).join('');
    
    $pipelineGrid.html(pipelineCards);
    bindPipelineEvents();
}

// 綁定Pipeline相關事件
function bindPipelineEvents() {
    // 點擊卡片顯示Layer頁面
    $('.layer-card').off('click').on('click', function(e) {
        if ($(e.target).is('button')) return;
        
        const pipelineId = $(this).data('pipeline-id');
        const pipelineName = $(this).data('pipeline-name');
        showPage('layer', pipelineName, pipelineId);
    });
    
    // 查看圖層按鈕
    $('.manage-layers-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const $card = $(this).closest('.layer-card');
        const pipelineId = $card.data('pipeline-id');
        const pipelineName = $card.data('pipeline-name');
        showPage('layer', pipelineName, pipelineId);
    });
    
    // 刪除按鈕
    $('.delete-pipeline-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const pipelineId = $(this).data('pipeline-id');
        const pipelineName = $(this).data('pipeline-name');
        deletePipeline(pipelineId, pipelineName);
    });
    
    // 編輯按鈕
    $('.edit-pipeline-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        alert('編輯功能開發中...');
    });
}

// 更新Pipeline統計
function updatePipelineStats(pipelines) {
    const categories = [...new Set(pipelines.map(pipeline => pipeline.category))];
    const $statsContainer = $('#stats-container');
    
    $statsContainer.html(`
        <div class="stat-card">
            <div class="stat-number">${pipelines.length}</div>
            <div class="stat-label">總管線數</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${categories.length}</div>
            <div class="stat-label">類別數</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-</div>
            <div class="stat-label">總圖層數</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-</div>
            <div class="stat-label">總區塊數</div>
        </div>
    `);
}

// 刪除Pipeline
function deletePipeline(pipelineId, pipelineName) {
    if (confirm(`確定要刪除管線「${pipelineName}」嗎？`)) {
        $.ajax({
            url: `/Mapdata/Delete/Pipeline?id=${pipelineId}`,
            type: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function(data) {
                if (data.success) {
                    alert(data.message);
                    loadPipelines();
                } else {
                    alert(data.message);
                }
            },
            error: function(xhr) {
                console.error('Error deleting pipeline:', xhr);
                alert('刪除失敗');
            }
        });
    }
}

// ====================================
// Layer 管理功能
// ====================================

// 載入特定Pipeline下的Layers
function loadLayers(pipelineId) {
    console.log('載入Layers for pipelineId:', pipelineId);
    
    const $layerGrid = $('.layer-grid');
    
    $.ajax({
        url: `/Mapdata/Get/Layer?id=${pipelineId}`,
        type: 'POST',
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(data) {
            if (data.success && data.layers) {
                renderLayerCards(data.layers);
                updateLayerStats(data.layers);
            } else {
                $layerGrid.html('<div style="text-align: center; padding: 40px; color: #666;">該管線下暫無圖層資料</div>');
            }
        },
        error: function(xhr) {
            console.error('Error loading layers:', xhr);
            $layerGrid.html('<div style="text-align: center; padding: 40px; color: #f44336;">載入圖層資料失敗</div>');
        }
    });
}

// 渲染Layer卡片
function renderLayerCards(layers) {
    const $layerGrid = $('.layer-grid');
    console.log('渲染Layers:', layers);
    if (layers.length === 0) {
        $layerGrid.html('<div style="text-align: center; padding: 40px; color: #666;">該管線下暫無圖層資料</div>');
        return;
    }
    
    const layerCards = layers.map(layer => `
        <div class="layer-card" data-layer-id="${layer.id}" data-layer-name="${layer.name}">
            <div class="layer-header">
                <div>
                    <div class="layer-name">${layer.name}</div>
                    <div class="layer-type">Layer</div>
                </div>
                <span class="status-indicator status-active"></span>
            </div>
            
            <div class="layer-meta">
                <div>🗂️ 圖層名稱：${layer.name}</div>
                <div>🆔 ID：${layer.id}</div>
            </div>
            
            <div class="layer-actions">
                <button class="btn btn-primary manage-areas-btn">管理區塊</button>
                <button class="btn btn-danger delete-layer-btn" data-layer-id="${layer.id}" data-layer-name="${layer.name}">刪除</button>
            </div>
        </div>
    `).join('');
    
    $layerGrid.html(layerCards);
    bindLayerEvents();
}

// 綁定Layer相關事件
function bindLayerEvents() {
    // 點擊卡片顯示Area頁面
    $('.layer-card').off('click').on('click', function(e) {
        if ($(e.target).is('button')) return;
        
        const layerId = $(this).data('layer-id');
        const layerName = $(this).data('layer-name');
        showPage('area', layerName, layerId);
    });
    
    // 管理區塊按鈕
    $('.manage-areas-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const $card = $(this).closest('.layer-card');
        const layerId = $card.data('layer-id');
        const layerName = $card.data('layer-name');
        showPage('area', layerName, layerId);
    });
    
    // 刪除圖層按鈕
    $('.delete-layer-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        const layerId = $(this).data('layer-id');
        const layerName = $(this).data('layer-name');
        deleteLayer(layerId, layerName);
    });
    
    // 編輯按鈕
    $('.edit-layer-btn').off('click').on('click', function(e) {
        e.stopPropagation();
        alert('圖層編輯功能開發中...');
    });
}

// 刪除Layer
function deleteLayer(layerId, layerName) {
    if (confirm(`確定要刪除圖層「${layerName}」嗎？`)) {
        alert(`刪除圖層功能需要確認API格式\n圖層ID: ${layerId}\n圖層名稱: ${layerName}`);
    }
}

// 更新Layer統計
function updateLayerStats(layers) {
    const $statsContainer = $('#stats-container');
    
    $statsContainer.html(`
        <div class="stat-card">
            <div class="stat-number">${layers.length}</div>
            <div class="stat-label">圖層數量</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-</div>
            <div class="stat-label">總區塊數</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-</div>
            <div class="stat-label">施工單位</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-</div>
            <div class="stat-label">總座標點</div>
        </div>
    `);
}

// ====================================
// Area 管理功能
// ====================================

// 綁定行政區選擇事件
function bindDistrictSelectEvent() {
    $('#district-select').off('change').on('change', function() {
        const selectedDistrict = $(this).val();
        handleDistrictChange(selectedDistrict);
    });
}

// 處理行政區變更
function handleDistrictChange(selectedDistrict) {
    currentDistrict = selectedDistrict;
    const $selectedDisplay = $('#selected-district-display');
    const $addAreaBtn = $('#add-area-btn');
    const $districtHint = $('#district-hint');
    
    if (selectedDistrict) {
        $selectedDisplay.text(selectedDistrict);
        $addAreaBtn.prop('disabled', false).css('opacity', '1');
        $districtHint.html(`✅ 已選擇「${selectedDistrict}」，正在載入區塊資料...`);
        
        // 如果有選擇圖層ID，則載入該行政區的Areas
        if (currentLayerId) {
            loadAreas(currentLayerId, selectedDistrict);
        }
    } else {
        $selectedDisplay.text('未選擇');
        $addAreaBtn.prop('disabled', true).css('opacity', '0.6');
        $districtHint.html('💡 請先選擇行政區以載入該區域的區塊資料');
        
        // 清空表格
        const $tableBody = $('#area-page tbody');
        $tableBody.html('<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">請選擇行政區以載入區塊資料</td></tr>');
        
        // 重置統計
        // resetAreaStats();
    }
}

// 載入Areas資料
function loadAreas(layerId, district = null) {
    const targetDistrict = district || currentDistrict;
    
    console.log('載入Areas for layerId:', layerId, 'district:', targetDistrict);
    
    // 如果沒有選擇行政區，不載入資料
    if (!targetDistrict) {
        console.log('未選擇行政區，跳過載入Areas');
        return;
    }
    console.log('載入Areas for layerId:', layerId);

    updateAreaLayerInfo(currentLayer);
    
    $.ajax({
        url: `/Mapdata/Search?LayerId=${layerId}&Dist=${encodeURIComponent(targetDistrict)}&AreaId=null`,
        type: 'POST',
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(data) {
            if (data.success) {
                const result = data.mapdataSearch;
                console.log('Areas data:', data);
                renderAreas(result.areas, targetDistrict, result);
                updateAreaStats(result.areas);

                // 更新提示訊息
                const areaCount = result.areas ? result.areas.length : 0;
                $('#district-hint').html(`✅ 「${targetDistrict}」共載入 ${areaCount} 個區塊`);
            } else {
                showAreaError(data.message || '載入失敗');
                $('#district-hint').html(`❌ 載入「${targetDistrict}」的區塊資料失敗`);
            }
        },
        error: function(xhr) {
            console.error('Error loading areas:', xhr);
            showAreaError('載入區塊資料失敗');
            $('#district-hint').html(`❌ 載入「${targetDistrict}」的區塊資料失敗`);
        }
    });
}

// 渲染Area表格
function renderAreas(areas, district, layerResult) {
    const $tableBody = $('#area-page tbody');
    
    if (!areas || areas.length === 0) {
        $tableBody.html('<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">暫無區塊資料</td></tr>');
        return;
    }
    
    const config = layerResult.config ? JSON.parse(layerResult.config) : {};
    
    const areaRows = areas.map(area => `
        <tr style="border-bottom: 1px solid #e1e5e9;" 
            onmouseover="this.style.backgroundColor='#f8f9fa'" 
            onmouseout="this.style.backgroundColor='white'">
            <td style="padding: 12px; font-weight: 500;">${area.name || '未命名區塊'}</td>
            <td style="padding: 12px; color: #666;">${district || '-'}</td>
            <td style="padding: 12px; text-align: center;">
                <button class="btn btn-primary edit-points-btn" 
                        data-area-id="${area.id}" 
                        data-area-name="${area.name}"
                        style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">查看區塊</button>
                <button class="btn btn-danger delete-area-btn" 
                        data-area-id="${area.id}" 
                        data-area-name="${area.name}"
                        data-associate-table="${config.associated_table || ''}"
                        style="padding: 6px 12px; font-size: 12px;">刪除</button>
            </td>
        </tr>
    `).join('');
    
    $tableBody.html(areaRows);
    bindAreaEvents();
}

// 綁定Area相關事件
function bindAreaEvents() {
    // 編輯座標按鈕
    $('.edit-points-btn').off('click').on('click', function() {
        const areaId = $(this).data('area-id');
        const areaName = $(this).data('area-name');
        showPage('point', areaName, areaId);
    });
    
    // 刪除區塊按鈕
    $('.delete-area-btn').off('click').on('click', function() {
        const areaId = $(this).data('area-id');
        const areaName = $(this).data('area-name');
        const associateTable = $(this).data('associate-table');
        deleteArea(areaId, areaName, associateTable);
    });
}

// 刪除Area
function deleteArea(areaId, areaName, associateTable) {
    if (confirm(`確定要刪除區塊「${areaName}」嗎？此操作將同時刪除相關的座標點資料。`)) {
        $.ajax({
            url: `/Mapdata/Delete/Area?id=${areaId}&associateLayer=${associateTable}`,
            type: 'POST',
            xhrFields: {
                withCredentials: true
            },
            success: function(data) {
                if (data.success) {
                    alert(data.message);
                    loadAreas(currentLayerId);
                } else {
                    alert(data.message);
                }
            },
            error: function(xhr) {
                console.error('Error deleting area:', xhr);
                alert('刪除失敗');
            }
        });
    }
}

// 更新Area頁面的圖層資訊
function updateAreaLayerInfo(layerName) {
    const $layerInfoDiv = $('#area-page .content-area').find('h2').first().next();
    if ($layerInfoDiv.length) {
        $layerInfoDiv.html(`
            圖層名稱：<span style="color: #1976d2; font-weight: 500;">${layerName}</span> | 
            狀態：<span style="color: #4caf50; font-weight: 500;">啟用中</span>
        `);
    }
}

// 顯示Area載入錯誤
function showAreaError(message) {
    const $tableBody = $('#area-page tbody');
    $tableBody.html(`<tr><td colspan="5" style="text-align: center; padding: 40px; color: #f44336;">${message}</td></tr>`);
}

// 更新Area統計資訊
function updateAreaStats(areas) {
    if (currentPage !== 'area') return;
    
    const areaCount = areas ? areas.length : 0;
    const constructionUnits = areas ? [...new Set(areas.map(area => area.constructionUnit).filter(unit => unit))] : [];
    
    const $statsContainer = $('#stats-container');
    $statsContainer.html(`
        <div class="stat-card">
            <div class="stat-number">${areaCount}</div>
            <div class="stat-label">區塊數量</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-</div>
            <div class="stat-label">總座標點</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${constructionUnits.length}</div>
            <div class="stat-label">施工單位</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">-%</div>
            <div class="stat-label">完成進度</div>
        </div>
    `);
}

// ====================================
// Point 管理功能
// ====================================

// 載入Points資料
function loadPoints(areaId) {
    console.log('載入Points for areaId:', areaId);
    
    const $pointsContainer = $('#points-container');
    
    $.ajax({
        url: `/Mapdata/Get/Point?areaId=${areaId}`,
        type: 'GET',
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(data) {
            if (data.success) {
                console.log('Points data:', data);
                const points = data.points || [];
                renderPoints(points);
                updatePointStats(points);
                if (points.length > 0) {
                    updatePointMap(points);
                }
            } else {
                $pointsContainer.html('<div style="text-align: center; padding: 40px; color: #f44336;">載入失敗</div>');
            }
        },
        error: function(xhr) {
            console.error('Error loading points:', xhr);
            $pointsContainer.html('<div style="text-align: center; padding: 40px; color: #f44336;">載入座標點資料失敗</div>');
        }
    });
}

function updateMapLayers(points) {
    if (!map || !pointLayer) return;

    // 清空圖層
    pointLayer.clearLayers();

    // 取得 URL 參數
    let kind = "line";
    let svg = getQueryParam("svg");
    let color = "#00b894"; // 預設顏色

    let icon = L.icon({
        iconUrl: `/img/${svg}`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });

    let latlngs = points.map(p => [p.latitude, p.longitude]);

    switch (kind) {
        case "point":
            latlngs.forEach(latlng => {
                let marker = L.marker(latlng, { icon: icon });
                marker.addTo(pointLayer);
            });
            break;

        case "line":
            L.polyline(latlngs, { color: color }).addTo(pointLayer);
            break;

        case "plane":
            L.polygon(latlngs, { color: color, fillOpacity: 0.3 }).addTo(pointLayer);
            break;

        case "arrowline":
            // 若你有 arrowline 的邏輯可以封裝後加進來
            let pointsWithProp = latlngs.map((pt, i) => [pt, points[i].Property]);
            addArrowlineToLayer(pointsWithProp, pointLayer, color);
            break;
    }

    if (latlngs.length > 0) {
        let bounds = L.latLngBounds(latlngs);
        map.setView(bounds.getCenter(), 17);
    }
}


// 渲染Points列表
function renderPoints(points) {
    const $pointsContainer = $('#points-container');
    
    if (!points || points.length === 0) {
        $pointsContainer.html('<div style="text-align: center; padding: 40px; color: #666;">暫無座標點資料</div>');
        return;
    }
    
    let props;
    const pointItems = points.map(point => {
        let propertyInfo = '';
        if (point.property) {
            try {
                props = typeof point.property === 'string' ? 
                    JSON.parse(point.property.replace(/\bNaN\b/g, "null")) : point.property;
                
                if (typeof props === 'object' && props !== null) {
                    propertyInfo = Object.keys(props)
                        .map(key => `<div><strong>${key}:</strong> ${props[key]}</div>`)
                        .join('');
                } else {
                    propertyInfo = `<div>${props}</div>`;
                }
            } catch (e) {
                propertyInfo = `<div>${point.property}</div>`;
            }
        }
        
        return `
            <div style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>Point #${point.index}
                        ${point.property ? `<button class="expand-property-btn" 
                                data-index="${point.index}" 
                                data-property='${point.property}'
                                title="展開屬性"
                                style="position: absolute; top: 4px; right: 4px; border: none; background: none; cursor: pointer; font-size: 14px;">🔍
                                </button>` : ``}
                    </strong>
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                    <div><strong>緯度:</strong> ${point.latitude}</div>
                    <div><strong>經度:</strong> ${point.longitude}</div>
                </div>
            </div>
        `;
    }).join('');
    
    $pointsContainer.html(pointItems);
    bindPointEvents();
}

// 更新地圖顯示座標點
function updatePointMap(points) {
    if (!map || !pointLayer) return;

    // 清空現有圖層
    pointLayer.clearLayers();

    // 將座標點加入圖層
    points.forEach(point => {
        const marker = L.marker([point.latitude, point.longitude], {
            title: `Point #${point.index}`
        }).addTo(pointLayer);
        
        marker.bindPopup(`
            <strong>Point #${point.index}</strong><br>
            緯度: ${point.latitude}<br>
            經度: ${point.longitude}<br>
            ${point.property ? `<strong>屬性:</strong> ${JSON.stringify(point.property)}` : ''}
        `);
    });

    // 更新地圖視圖
    if (points.length > 0) {
        const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
        const center = bounds.getCenter();
        map.setView(center, 17);
    }
}

// 綁定Point相關事件
function bindPointEvents() {
    $('.expand-property-btn').off('click').on('click', function () {
        const property = $(this).data('property');

        let propertyInfo;
        try {
            if (point.property) {
            try {
                props = typeof point.property === 'string' ? 
                    JSON.parse(point.property.replace(/\bNaN\b/g, "null")) : point.property;
                
                if (typeof props === 'object' && props !== null) {
                    propertyInfo = Object.keys(props)
                        .map(key => `<div><strong>${key}:</strong> ${props[key]}</div>`)
                        .join('');
                } else {
                    propertyInfo = `<div>${props}</div>`;
                }
            } catch (e) {
                propertyInfo = `<div>${point.property}</div>`;
            }
        }
        } catch (e) {
            html = `<div>${property}</div>`;
        }

        showPropertyPopup($(this).closest('.property-info-container'), propertyInfo);
    });
}

function showPropertyPopup($parent, htmlContent) {
    // 移除其他展開框
    $('.property-popup').remove();

    const $popup = $(`
        <div class="property-popup" style="
            position: absolute;
            top: 32px;
            right: 0;
            z-index: 10;
            background: white;
            border: 1px solid #ccc;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            border-radius: 6px;
            padding: 10px;
            min-width: 200px;
            max-width: 300px;
            max-height: 300px;
            overflow-y: auto;
            font-size: 12px;
        ">
            <div style="text-align: right;">
                <button style="border: none; background: none; cursor: pointer; font-size: 14px;" class="close-popup">✖</button>
            </div>
            ${htmlContent}
        </div>
    `);

    $popup.find('.close-popup').on('click', () => {
        $popup.remove();
    });

    $parent.append($popup);
}


// 更新Point統計資訊
function updatePointStats(points) {
    if (currentPage !== 'point') return;
    
    const pointCount = points ? points.length : 0;
    
    let totalDistance = 0;
    let turningPoints = 0;
    
    if (points && points.length > 1) {
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            
            const latDiff = curr.latitude - prev.latitude;
            const lonDiff = curr.longitude - prev.longitude;
            const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            totalDistance += distance;
        }
        
        turningPoints = Math.max(0, pointCount - 2);
    }
    
    const $statsContainer = $('#stats-container');
    $statsContainer.html(`
        <div class="stat-card">
            <div class="stat-number">${pointCount}</div>
            <div class="stat-label">座標點數</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${totalDistance > 0 ? totalDistance.toFixed(2) + 'km' : '-'}</div>
            <div class="stat-label">總長度</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${turningPoints}</div>
            <div class="stat-label">轉折點</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${pointCount > 0 ? '100%' : '0%'}</div>
            <div class="stat-label">完成度</div>
        </div>
    `);
}

// ====================================
// 通用功能：頁面切換、導航、操作面板
// ====================================

// 頁面切換主函數
function showPage(page, name = '', id = '', subName = '', subId = '') {
    console.log(`切換到頁面: ${page}, 名稱: ${name}, ID: ${id}`);
    $('#pipeline-page, #layer-page, #area-page, #point-page').hide();
    $(`#${page}-page`).show();
    
    updateBreadcrumb(page, name, subName);
    updateActionPanel(page, name, subName);
    
    currentPage = page;
    if(page === 'pipeline') {
        currentPipeline = '';
        currentPipelineId = '';
        currentLayer = '';
        currentLayerId = '';
        currentArea = '';
        currentAreaId = '';
        loadPipelines();
    }
    else if (page === 'layer') {
        currentPipeline = name;
        currentPipelineId = id;
        loadLayers(id);
    } else if (page === 'area') {
        currentLayer = name;
        currentLayerId = id;
        
        // 重置行政區選擇器和相關狀態
        $('#district-select').val('');
        $('#selected-district-display').text('未選擇');
        $('#add-area-btn').prop('disabled', true).css('opacity', '0.6');
        $('#district-hint').html('💡 請先選擇行政區以載入該區域的區塊資料');
        currentDistrict = '';
        
        // 重新綁定行政區選擇事件
        bindDistrictSelectEvent();
        
        // 不自動載入Areas，等待用戶選擇行政區
        const $tableBody = $('#area-page tbody');
        $tableBody.html('<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">請選擇行政區以載入區塊資料</td></tr>');
        // resetAreaStats();
    } else if (page === 'point') {
        currentArea = name;
        currentAreaId = id;
        loadPoints(id);

        // ✅ 顯示後重新計算地圖大小
        setTimeout(() => {
            if (map && map.invalidateSize) {
                map.invalidateSize();
            }
        }, 100); // 延遲讓 DOM 顯示完成後再重新計算
    }
}

// 更新麵包屑導航
function updateBreadcrumb(page, name, subName) {
    const $breadcrumb = $('.breadcrumb');
    let breadcrumbHTML = '<a href="#" class="breadcrumb-link" data-page="pipeline">圖資系統</a><span>></span>';
    
    if (page === 'pipeline') {
        breadcrumbHTML += '<span class="current">圖資管理</span>';
    } else if (page === 'layer') {
        breadcrumbHTML += '<a href="#" class="breadcrumb-link" data-page="pipeline">圖資管理</a><span>></span>';
        breadcrumbHTML += '<span class="current">' + name + ' - 圖層</span>';
        $('#current-layer-name').text(name);
    } else if (page === 'area') {
        breadcrumbHTML += '<a href="#" class="breadcrumb-link" data-page="pipeline">圖資管理</a><span>></span>';
        breadcrumbHTML += '<a href="#" class="breadcrumb-link" data-page="layer" data-pipeline-name="' + currentPipeline + '" data-pipeline-id="' + currentPipelineId + '">' + currentPipeline + ' - 圖層</a><span>></span>';
        breadcrumbHTML += '<span class="current">' + name + ' - 區塊</span>';
        $('#current-layer-name').text(name);
    } else if (page === 'point') {
        breadcrumbHTML += '<a href="#" class="breadcrumb-link" data-page="pipeline">圖資管理</a><span>></span>';
        breadcrumbHTML += '<a href="#" class="breadcrumb-link" data-page="layer" data-pipeline-name="' + currentPipeline + '" data-pipeline-id="' + currentPipelineId + '">' + currentPipeline + ' - 圖層</a><span>></span>';
        breadcrumbHTML += '<a href="#" class="breadcrumb-link" data-page="area" data-layer-name="' + currentLayer + '" data-layer-id="' + currentLayerId + '">' + currentLayer + ' - 區塊</a><span>></span>';
        breadcrumbHTML += '<span class="current">' + name + ' - 座標</span>';
        $('#current-area-name').text(name);
    }
    
    $breadcrumb.html(breadcrumbHTML);
    
    // 綁定麵包屑點擊事件
    $('.breadcrumb-link').off('click').on('click', function(e) {
        e.preventDefault();
        const targetPage = $(this).data('page');
        
        if (targetPage === 'pipeline') {
            showPage('pipeline');
        } else if (targetPage === 'layer') {
            const pipelineName = $(this).data('pipeline-name');
            const pipelineId = $(this).data('pipeline-id');
            showPage('layer', pipelineName, pipelineId);
        } else if (targetPage === 'area') {
            const layerName = $(this).data('layer-name');
            const layerId = $(this).data('layer-id');
            showPage('area', layerName, layerId);
        }
    });
}

// 更新操作面板
function updateActionPanel(page, name, subName) {
    const $addText = $('#add-text');
    const $backBtn = $('#back-btn');
    const $statsContainer = $('#stats-container');
    
    if (page === 'pipeline') {
        $addText.text('新增管線');
        $backBtn.hide();
        // Pipeline統計已在updatePipelineStats中處理
    } else if (page === 'layer') {
        $addText.text('新增圖層');
        $backBtn.show();
        // Layer統計會在loadLayers完成後更新
    } else if (page === 'area') {
        $addText.text('新增區塊');
        $backBtn.show();
        // Area統計會在loadAreas完成後更新
        if (!$statsContainer.find('.stat-number').first().text() || $statsContainer.find('.stat-number').first().text() === '-') {
            $statsContainer.html(`
                <div class="stat-card">
                    <div class="stat-number">-</div>
                    <div class="stat-label">區塊數量</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">-</div>
                    <div class="stat-label">總座標點</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">-</div>
                    <div class="stat-label">施工單位</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">-%</div>
                    <div class="stat-label">完成進度</div>
                </div>
            `);
        }
    } else if (page === 'point') {
        $addText.text('新增座標點');
        $backBtn.show();
        // Point統計會在loadPoints完成後更新
        $statsContainer.html(`
            <div class="stat-card">
                <div class="stat-number">-</div>
                <div class="stat-label">座標點數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">-</div>
                <div class="stat-label">總長度</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">-</div>
                <div class="stat-label">轉折點</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">-%</div>
                <div class="stat-label">完成度</div>
            </div>
        `);
    }
}

// 返回上一層
function goBack() {
    if (currentPage === 'point') {
        showPage('area', currentLayer, currentLayerId);
    } else if (currentPage === 'area') {
        showPage('layer', currentPipeline, currentPipelineId);
    } else if (currentPage === 'layer') {
        showPage('pipeline');
    }
}

// ====================================
// 事件綁定和新增功能
// ====================================

// 綁定返回按鈕事件
$(document).on('click', '#back-btn', function(e) {
    e.preventDefault();
    goBack();
});

// 綁定新增區塊按鈕事件
$(document).on('click', '#add-area-btn', function(e) {
    e.preventDefault();
    addNewArea();
});

// 綁定新增座標點按鈕事件
$(document).on('click', '#add-point-btn', function(e) {
    e.preventDefault();
    addNewPoint();
});

// 新增區塊功能
function addNewArea() {
    if (currentLayerId) {
        const url = `/Mapdata/Import?layerId=${currentLayerId}&name=${encodeURIComponent(currentLayer)}&kind=&svg=&color=`;
        window.location.href = url;
    } else {
        alert('無法取得圖層資訊，請重新選擇圖層');
    }
}

// 新增座標點功能
function addNewPoint() {
    const areaInfo = `區塊：${currentArea} (ID: ${currentAreaId})`;
    const message = `新增座標點功能\n\n${areaInfo}\n\n請選擇新增方式：\n1. 手動輸入座標\n2. 地圖點擊選取\n3. 匯入座標檔案`;
    
    if (confirm(message + '\n\n點擊確定開啟座標編輯模式')) {
        alert('座標點新增功能開發中...\n建議整合地圖編輯器或座標輸入表單');
    }
}

// ====================================
// 輔助函數
// ====================================

// 取得當前圖層的相關參數（用於Point API）
function getCurrentLayerParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
        kind: urlParams.get('kind') || '',
        svg: urlParams.get('svg') || '',
        color: urlParams.get('color') || ''
    };
}

// 格式化屬性JSON資料
function formatPropertyJson(propertyStr) {
    if (!propertyStr || propertyStr.trim() === "null") {
        return {};
    }
    
    try {
        const cleanedStr = propertyStr.replace(/\bNaN\b/g, "null");
        return JSON.parse(cleanedStr);
    } catch (e) {
        console.warn('無法解析屬性JSON:', propertyStr);
        return { raw: propertyStr };
    }
}

// 全域函數，供HTML內嵌事件使用
window.showPage = showPage;
window.goBack = goBack;