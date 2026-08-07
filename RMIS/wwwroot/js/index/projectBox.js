import BoxManager from './box.js';
import RoadProjectView from './roadProjectView.js';
import RoadProjectAdd from './roadProjectAdd.js';
import RoadProjectImport from './roadProjectImport.js';
import { Map } from './map_test.js';
import { showLoading, hideLoading } from '../loading.js';


/**
 * 道路專案查詢業務邏輯模組
 * 請求格式採用 Fetch API 與 JSON 格式，維持與舊版邏輯一致
 */
const ProjectBox = {
    // 行政區對照表
    adminDists: [
        "桃園區",  // value: 0
        "大溪區",  // value: 1
        "中壢區",  // value: 2
        "楊梅區",  // value: 3
        "蘆竹區",  // value: 4
        "大園區",  // value: 5
        "龜山區",  // value: 6
        "八德區",  // value: 7
        "龍潭區",  // value: 8
        "平鎮區",  // value: 9
        "新屋區",  // value: 10
        "觀音區",  // value: 11
        "復興區"   // value: 12
    ],

    // 儲存全域查詢結果
    filterProject: [],
    
    // 分頁相關設定
    pageSize: 10,
    currentPage: 1,

    // 地圖相關
    $indexMap: null,
    projectLayer: null,
    currentRow: null,

    /**
     * 初始化專案查詢邏輯
     */
    init: function() {
        const self = this;

        // 初始化地圖圖層（從 map_test.js 取得）
        self.$indexMap = Map.getIndexMap();
        self.projectLayer = L.layerGroup();
        self.projectLayer.addTo(self.$indexMap);

        $('#roadProjectBtn').on('click', function() {
            BoxManager.openLeftBoxPage('page-project', '專案查詢');
        });
        // 綁定「顯示結果」按鈕點擊事件
        $('#projectGoResult').on('click', function() {
            self.fetchData();
        });

        // 綁定匯出 Excel 按鈕
        $('#exportProjectExcel').on('click', function() {
            self.exportData();
        });

        // 綁定匯出歷程按鈕
        $('#exportProcessExcel').on('click', function() {
            self.exportProcessData();
        });

        // 全選 checkbox
        $(document).on('change', '#selectAllProjects', function() {
            $('.project-row-check').prop('checked', this.checked);
        });

        // 綁定分頁大小改變事件
        $('#protectPageSize').on('change', function() {
            self.pageSize = parseInt($(this).find('option:selected').text(), 10);
            self.currentPage = 1;
            self.updateProjectTable();
        });

        // 綁定新增專案按鈕
        $('#btnAddProject').on('click', function() {
            RoadProjectAdd.openAdd();
        });

        // 綁定匯入專案按鈕
        $('#btnImportProject').on('click', function() {
            RoadProjectImport.openImport();
        });

        // 監聽專案新增完成事件，重新查詢
        $(document).on('projectAdded', function() {
            self.fetchData();
        });

        // 監聽專案刪除完成事件，重新查詢
        $(document).on('projectDeleted', function() {
            self.fetchData();
        });

        // 監聽專案更新完成事件，重新查詢
        $(document).on('projectUpdated', function() {
            self.fetchData();
        });

        // 綁定關閉按鈕事件，清除定位圖層
        $('#left-box .btn-close-box').on('click', function() {
            self.clearProjectLayer();
        });

        console.log("ProjectBox 業務邏輯初始化完成 (Fetch JSON 模式)");
    },

    /**
     * Helper function: HTML escape，避免使用者輸入資料（提案人、專案名稱等）被當成 HTML 解析
     */
    escapeHtml: function(text) {
        if (text === null || text === undefined) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Helper function: 處理 select 值
     */
    convertSelectValue: function(value) {
        return value === "-1" || value === undefined ? null : value;
    },

    /**
     * Helper function: 處理 input 值
     */
    convertInputValue: function(value) {
        return value.trim() === "" || value === undefined ? null : value.trim();
    },

    /**
     * 執行 API 請求 - 使用 Fetch 搭配 JSON 格式（修正為與 panel 一致的格式）
     */
    fetchData: function() {
        const self = this;
        
        // 取得行政區索引值並轉換為行政區名稱
        const adminIndex = $('#projectAdmin').val();
        const adminDistrict = adminIndex && adminIndex !== "-1" ? self.adminDists[adminIndex] : null;

        // 封裝表單資料為 JSON 物件（修正為與 panel 一致的巢狀結構）
        const formData = {
            adminDistrict: adminDistrict, // 行政區名稱
            projectName: self.convertInputValue($('#projectProjectName').val()), // 專案名稱
            roadLength: self.convertInputValue($('#projectRoadLength').val()), // 道路長度
            currentRoadWidth: self.convertInputValue($('#projectCurrentRoadWidth').val()), // 現況路寬
            plannedRoadWidth: self.convertInputValue($('#projectPlannedRoadWidth').val()), // 計畫路寬
            budgets: { // 經費資料（巢狀結構）
                constructionBudget: { // 工程經費
                    option: self.convertSelectValue($('#constructionBudgetOption').val()),
                    value: self.convertInputValue($('#constructionBudget').val())
                },
                landAcquisitionBudget: { // 用地經費
                    option: self.convertSelectValue($('#landAcquisitionBudgetOption').val()),
                    value: self.convertInputValue($('#landAcquisitionBudget').val())
                },
                compensationBudget: { // 補償經費
                    option: self.convertSelectValue($('#compensationBudgetOption').val()),
                    value: self.convertInputValue($('#compensationBudget').val())
                },
                totalBudgetRange: { // 總經費範圍
                    start: self.convertInputValue($('#totalBudgetStart').val()),
                    end: self.convertInputValue($('#totalBudgetEnd').val())
                }
            }
        };

        console.log('發送請求資料:', formData);

        // 清空列表並顯示讀取中
        $('#projectTbody').html('<tr><td colspan="6">資料讀取中...</td></tr>');
        showLoading('查詢中...', '#left-box');

        // 使用 Fetch 呼叫 API
        fetch(`/api/MapAPI/GetRoadProject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            // 取得回傳陣列並更新總數文字
            self.filterProject = data['roadProjects'] || [];
            $("#projectTotalCount").text(`(總數:${self.filterProject.length})`);

            // 重置分頁到第一頁
            self.currentPage = 1;

            // 執行表格更新邏輯
            self.updateProjectTable();
        })
        .catch(error => {
            console.error('查詢失敗:', error);
            $('#projectTbody').html('<tr><td colspan="6">查詢發生錯誤，請稍後再試</td></tr>');
        })
        .finally(() => {
            hideLoading('#left-box');
        });
    },

    /**
     * 更新專案表格內容 - 對應舊版 updateProjectTable（含分頁）
     */
    updateProjectTable: function() {
        const self = this;
        const $tbody = $('#projectTbody');
        $tbody.empty();

        if (self.filterProject.length === 0) {
            $tbody.html('<tr><td colspan="6">查無資料</td></tr>');
            self.updatePagination(0);
            return;
        }

        // 計算分頁
        const totalPages = Math.ceil(self.filterProject.length / self.pageSize);
        const startIndex = (self.currentPage - 1) * self.pageSize;
        const endIndex = Math.min(startIndex + self.pageSize, self.filterProject.length);
        const currentPageData = self.filterProject.slice(startIndex, endIndex);

        // 檢查操作權限 (透過 box 頁面上的隱藏欄位判斷)
        const hasUpdatePermission = $('#projectExport').data('update') === true || $('#projectExport').data('update') === "True";

        currentPageData.forEach(item => {
            // 處理經費顯示
            let totalBudgetDisplay = '-';
            if (item.totalBudget !== undefined && item.totalBudget !== null) {
                totalBudgetDisplay = item.totalBudget === 0 ? '0' : (item.totalBudget / 10000) + '萬';
            }

            const isUnchecked = item.coordinateChecked === false;
            const isPending  = item.coordinateChecked === null || item.coordinateChecked === undefined;
            const colCount = hasUpdatePermission ? 7 : 6;
            let row = `
                <tr data-project-index="${startIndex + currentPageData.indexOf(item)}" class="${isUnchecked ? 'coord-unchecked-row' : ''}">
                    <td style="text-align:center;">
                        <input type="checkbox" class="project-row-check" value="${self.escapeHtml(item.projectId)}">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-locate" data-id="${item.id}">
                            定位
                        </button>
                    </td>
                    ${hasUpdatePermission ? `<td><button class="btn btn-sm btn-outline-secondary btn-ProcessView" data-id="${self.escapeHtml(item.projectId)}">${self.escapeHtml(item.reviewYear) || '-'}</button></td>` : ''}
                    <td>${self.escapeHtml(item.proposer)}</td>
                    <td>${self.escapeHtml(item.administrativeDistrict)}</td>
                    <td class="td-clickable" style="cursor: pointer; color: #2563eb;">${self.escapeHtml(item.projectName)}</td>
                    <td>${totalBudgetDisplay}</td>
                </tr>`;

            if (isPending) {
                row += `
                <tr class="coord-warning-row" data-project-id="${item.id}">
                    <td colspan="${colCount}">
                        <div class="inline-coord-warning" style="background-color:#fff0f0; color:#b91c1c;">
                            <span>尚未取得座標，無法進行編輯</span>
                        </div>
                    </td>
                </tr>`;
            } else if (isUnchecked) {
                row += `
                <tr class="coord-warning-row" data-project-id="${item.id}">
                    <td colspan="${colCount}">
                        <div class="inline-coord-warning">
                            <span>座標由系統自動取得，尚未確認</span>
                        </div>
                    </td>
                </tr>`;
            }

            $tbody.append(row);
        });


        // 綁定定位事件
        $('.btn-locate').on('click', function() {
            const id = $(this).data('id');

            // 移除之前選中列的樣式
            if (self.currentRow) {
                self.currentRow.removeClass('selectRow');
            }

            // 標記當前列
            self.currentRow = $(this).closest('tr');
            self.currentRow.addClass('selectRow');

            // 執行定位
            self.locateProject(id);
        });

        // 綁定起訖位置點擊事件（開啟專案詳情）
        $('.td-clickable').on('click', function() {
            const $row = $(this).closest('tr');
            const projectIndex = $row.data('project-index');
            const projectData = self.filterProject[projectIndex];

            if (projectData) {
                self.openProjectView(projectData);
            }
        });

        // 綁定操作按鈕事件（審議年度按鈕，開啟專案詳情）
        if (hasUpdatePermission) {
            $('.btn-ProcessView').on('click', function() {
                const id = $(this).data('id');
                const projectData = self.filterProject.find(p => p.projectId === id);

                if (projectData) {
                    // 從審議年度按鈕點入，優先顯示審議資訊區塊
                    self.openProjectView(projectData, { prioritizeSectionId: 'pv-section-review' });
                } else {
                    console.error('找不到專案資料，ID:', id);
                }
            });
        }

        // 更新分頁控制項
        self.updatePagination(totalPages);
    },

    /**
     * 開啟專案詳情檢視
     * @param {Object} projectData - 專案資料
     * @param {Object} [options] - 傳遞給 RoadProjectView 的選項，例如 { prioritizeSectionId }
     */
    openProjectView: function(projectData, options) {
        console.log('開啟專案詳情:', projectData);
        // 透過 API 重新取得專案資料，順便由後端判斷目前使用者是否為建立者（isOwner）
        RoadProjectView.openViewById(projectData.id, options);
    },

    /**
     * 更新分頁控制項
     */
    updatePagination: function(totalPages) {
        const self = this;
        const $pagination = $('#protectPages');
        $pagination.empty();

        if (totalPages <= 1) return;

        const cur = self.currentPage;

        // 收集要顯示的頁碼：前3、後3、當前±1
        const pageSet = new Set();
        for (let i = 1; i <= Math.min(3, totalPages); i++) pageSet.add(i);
        for (let i = Math.max(1, totalPages - 2); i <= totalPages; i++) pageSet.add(i);
        for (let i = Math.max(1, cur - 1); i <= Math.min(totalPages, cur + 1); i++) pageSet.add(i);

        const pages = [...pageSet].sort((a, b) => a - b);

        const appendBtn = (page) => {
            const $btn = $('<a></a>')
                .text(page)
                .toggleClass('select', page === cur)
                .css({ cursor: 'pointer', padding: '5px 10px', margin: '0 2px', border: '1px solid #ddd', display: 'inline-block' })
                .on('click', function() {
                    self.currentPage = page;
                    self.updateProjectTable();
                });
            if (page === cur) {
                $btn.css({ 'background-color': '#007bff', color: 'white', 'border-color': '#007bff' });
            }
            $pagination.append($btn);
        };

        const appendEllipsis = (hintPage) => {
            const $ellipsis = $('<span>').text('...').css({
                padding: '5px 6px', margin: '0 2px', display: 'inline-block',
                color: '#007bff', cursor: 'pointer', border: '1px solid transparent',
                minWidth: '32px', textAlign: 'center'
            });
            $ellipsis.on('click', function() {
                const $input = $('<input>')
                    .attr({ type: 'number', min: 1, max: totalPages, placeholder: hintPage })
                    .css({ width: '52px', padding: '3px 5px', margin: '0 2px', border: '1px solid #007bff',
                           borderRadius: '3px', textAlign: 'center', fontSize: 'inherit' });
                $ellipsis.replaceWith($input);
                $input.focus();
                const commit = () => {
                    const v = parseInt($input.val());
                    if (v >= 1 && v <= totalPages) {
                        self.currentPage = v;
                        self.updateProjectTable();
                    } else {
                        self.updatePagination(totalPages);
                    }
                };
                $input.on('keydown', function(e) {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') self.updatePagination(totalPages);
                }).on('blur', commit);
            });
            $pagination.append($ellipsis);
        };

        for (let i = 0; i < pages.length; i++) {
            if (i > 0 && pages[i] - pages[i - 1] > 1) {
                // hintPage 提示跳到兩段中間
                const hint = Math.round((pages[i - 1] + pages[i]) / 2);
                appendEllipsis(hint);
            }
            appendBtn(pages[i]);
        }
    },

    /**
     * 定位專案到地圖 - 完整實作
     */
    /**
     * 建立地圖標記（不可拖曳）
     */
    createLocateMarker: function(latlng, iconClass, popupContent) {
        const isSmall = (iconClass === 'range-marker-middle' || iconClass === 'range-marker-photo');
        const size = isSmall ? [14, 14] : [16, 16];
        const anchor = isSmall ? [7, 7] : [8, 8];

        const icon = L.divIcon({
            className: iconClass,
            iconSize: size,
            iconAnchor: anchor,
            popupAnchor: [0, -10]
        });

        const marker = L.marker(latlng, { icon: icon, draggable: false });
        if (popupContent) {
            const isPhoto = (iconClass === 'range-marker-photo');
            marker.bindPopup(popupContent, isPhoto ? { maxWidth: 450 } : { maxWidth: 250, minWidth: 100 });
        }
        return marker;
    },

    locateProject: function(projectId) {
        const self = this;

        if (!self.$indexMap || !self.projectLayer) {
            console.error('地圖未初始化');
            alert('地圖功能未就緒，請稍後再試');
            return;
        }

        showLoading('定位中...');

        // 呼叫 API 取得專案的座標點資料
        fetch(`/api/MapAPI/GetPointsByProjectId?projectId=${projectId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            // 清除舊的圖層
            self.projectLayer.clearLayers();

            // 取得範圍點和照片點
            const rangePoints = data['points']['rangePoints'] || [];
            const photoPoints = data['points']['photoPoints'] || [];

            if (rangePoints.length === 0 && photoPoints.length === 0) {
                alert('此專案無座標資料');
                return;
            }

            const allCoords = [];

            // ── 拓寬範圍線/面 ──
            if (rangePoints.length >= 3) {
                const coords = rangePoints.map(p => [p.latitude, p.longitude]);
                const polygon = L.polygon(coords, { color: '#3b82f6', weight: 2, fillOpacity: 0.15 })
                    .addTo(self.projectLayer);
                coords.forEach(c => allCoords.push(c));

                // 點擊圖形開啟專案詳情
                polygon.on('click', function() {
                    RoadProjectView.openViewById(projectId);
                });
            } else if (rangePoints.length === 2) {
                const coords = rangePoints.map(p => [p.latitude, p.longitude]);
                const polyline = L.polyline(coords, { color: '#3b82f6', weight: 2 }).addTo(self.projectLayer);
                coords.forEach(c => allCoords.push(c));

                // 點擊圖形開啟專案詳情
                polyline.on('click', function() {
                    RoadProjectView.openViewById(projectId);
                });
            }

            // 從 prop 解析路名
            let roadName = '';
            if (rangePoints.length >= 1 && rangePoints[0].prop) {
                try {
                    const propData = JSON.parse(rangePoints[0].prop);
                    roadName = propData['起訖位置'] || '';
                } catch(e) {}
            }

            // ── 起點標記（綠色）──
            if (rangePoints.length >= 1) {
                const sp = rangePoints[0];
                self.createLocateMarker([sp.latitude, sp.longitude], 'range-marker-start', `
                    <div style="min-width:120px;">
                        <div style="font-weight:bold;color:#22c55e;margin-bottom:4px;">起點</div>
                        ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                        <div style="font-size:12px;color:#666;">
                            <div>緯度：${sp.latitude.toFixed(6)}</div>
                            <div>經度：${sp.longitude.toFixed(6)}</div>
                        </div>
                    </div>
                `).addTo(self.projectLayer);
            }

            // ── 終點標記（紅色）──
            if (rangePoints.length >= 2) {
                const ep = rangePoints[rangePoints.length - 1];
                self.createLocateMarker([ep.latitude, ep.longitude], 'range-marker-end', `
                    <div style="min-width:120px;">
                        <div style="font-weight:bold;color:#ef4444;margin-bottom:4px;">終點</div>
                        ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                        <div style="font-size:12px;color:#666;">
                            <div>緯度：${ep.latitude.toFixed(6)}</div>
                            <div>經度：${ep.longitude.toFixed(6)}</div>
                        </div>
                    </div>
                `).addTo(self.projectLayer);
            }

            // ── 中間範圍點標記（藍色）──
            if (rangePoints.length > 2) {
                rangePoints.slice(1, -1).forEach(function(p, idx) {
                    self.createLocateMarker([p.latitude, p.longitude], 'range-marker-middle', `
                        <div style="min-width:120px;">
                            <div style="font-weight:bold;color:#3b82f6;margin-bottom:4px;">範圍點 ${idx + 1}</div>
                            ${roadName ? `<div style="font-size:12px;margin-bottom:4px;">${roadName}</div>` : ''}
                            <div style="font-size:12px;color:#666;">
                                <div>緯度：${p.latitude.toFixed(6)}</div>
                                <div>經度：${p.longitude.toFixed(6)}</div>
                            </div>
                        </div>
                    `).addTo(self.projectLayer);
                });
            }

            // ── 街景照片標記（橘色）──
            photoPoints.forEach(function(point, index) {
                if (!point.latitude || !point.longitude) return;

                let photoSrc = '';
                try {
                    const parsed = JSON.parse(point.url || '{}');
                    const existingUrl = parsed.url || '';
                    photoSrc = `/roadProject/${existingUrl}`;
                } catch(e) {
                    const existingUrl = point.url || '';
                    photoSrc = `/roadProject/${existingUrl}`;
                }

                const popupDiv = document.createElement('div');
                popupDiv.id = 'photoPopup';
                if (photoSrc) {
                    const img = document.createElement('img');
                    img.src = `${photoSrc}?v=${new Date().getTime()}`;
                    img.style.width = '450px';
                    img.style.height = '300px';
                    popupDiv.appendChild(img);
                }

                const marker = self.createLocateMarker([point.latitude, point.longitude], 'range-marker-photo', popupDiv);
                marker.addTo(self.projectLayer);
                allCoords.push([point.latitude, point.longitude]);
            });

            // ── 視圖定位（左側面板偏移）──
            if (allCoords.length > 0) {
                const leftPanelWidth = document.getElementById('left-box')?.offsetWidth ?? 0;
                const padding = 40;
                if (allCoords.length === 1) {
                    self.$indexMap.setView(allCoords[0], 17, { animate: false });
                    if (leftPanelWidth > 0) {
                        self.$indexMap.panBy([-leftPanelWidth / 2, 0], { animate: true });
                    }
                } else {
                    self.$indexMap.fitBounds(L.latLngBounds(allCoords), {
                        paddingTopLeft:     [leftPanelWidth + padding, padding],
                        paddingBottomRight: [padding, padding]
                    });
                }
            }
        })
        .catch(error => {
            console.error('定位失敗:', error);
            alert('定位失敗，請稍後再試');
        })
        .finally(() => {
            hideLoading();
        });
    },

    /**
     * 產生專案資訊表格
     */
    createPopupForm: function(propData) {
        const prop = JSON.parse(propData);

        let table = '<table class="popup-table-content" cellpadding="5" cellspacing="0">';

        Object.entries(prop).forEach(([key, value]) => {
            // 跳過街景照片欄位
            if (key === "街景照片") {
                return;
            }

            // 處理土地筆數
            if (["公有土地", "私有土地", "公私土地"].includes(key)) {
                value += "筆";
            }

            table += `<tr><th style="width: 40%;">${key}</th><td>${value}</td></tr>`;
        });

        table += '</table>';

        return `
            <div class="popup-table">
                ${table}
            </div>
        `;
    },

    /**
     * 清除定位圖層
     */
    clearProjectLayer: function() {
        const self = this;
        if (self.projectLayer) {
            self.projectLayer.clearLayers();
        }
        // 清除選中列樣式
        if (self.currentRow) {
            self.currentRow.removeClass('selectRow');
            self.currentRow = null;
        }
    },

    /**
     * 編輯專案（可擴充功能）
     */
    editProject: function(projectId) {
        // 這裡可以實作編輯功能，例如開啟編輯對話框
        console.log('編輯專案 ID:', projectId);
        alert('編輯功能待實作');
    },

    /**
     * 匯出 Excel（使用前端 XLSX 處理）
     */
    exportData: function() {
        const self = this;
        
        if (self.filterProject.length === 0) {
            alert('目前沒有可匯出的資料');
            return;
        }

        // 根據 panel 的格式整理資料
        const data = self.filterProject.map((project, idx) => {
            return {
                '項次': idx + 1,
                '提案人': project['proposer'],
                '行政區': project['administrativeDistrict'],
                '起訖位置': project['startEndLocation'],
                '道路長度': project['roadLength'] + '公尺',
                '目前路寬': project['currentRoadWidth'] + '公尺',
                '計畫路寬': project['plannedRoadWidth'] + '公尺',
                '公有土地': project['publicLand'] + '筆',
                '私有土地': project['privateLand'] + '筆',
                '公私土地': project['publicPrivateLand'] + '筆',
                '工程經費': project['constructionBudget'] / 10000 + '萬',
                '用地經費': project['landAcquisitionBudget'] / 10000 + '萬',
                '補償經費': project['compensationBudget'] / 10000 + '萬',
                '總經費': project['totalBudget'] / 10000 + '萬',
                '備註': project['remarks']
            };
        });

        // 使用 XLSX 產生 Excel 檔案
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        // 產生檔名：專案列表_yyyyMMdd.xlsx
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        XLSX.writeFile(wb, `專案列表_${today}.xlsx`);
    },

    exportProcessData: function() {
        const self = this;

        const selectedIds = $('.project-row-check:checked').map(function() {
            return $(this).val();
        }).get();

        if (selectedIds.length === 0) {
            alert('請先勾選要匯出的專案');
            return;
        }

        const fmtDN = json => {
            if (!json) return '';
            try {
                const arr = JSON.parse(json);
                if (!Array.isArray(arr)) return json;
                return arr.map(i => i.note ? `${i.date}(${i.note})` : i.date).join('、');
            } catch { return json; }
        };
        const fmtBudget = v => {
            if (!v) return '';
            const wan = Math.round(v / 10000);
            if (wan >= 10000) {
                const yi = Math.floor(wan / 10000);
                const remaining = wan % 10000;
                return remaining > 0 ? `${yi}億${remaining.toLocaleString()}萬元` : `${yi}億元`;
            }
            return `${wan.toLocaleString()}萬元`;
        };

        const columnGroups = [
            {
                label: '基本資訊',
                columns: [
                    { label: '行政區',   getValue: r => r.district || '' },
                    { label: '工程名稱', getValue: r => r.projectName || '' },
                    { label: '關心議員', getValue: r => r.proposer || '' },
                    { label: '記錄類別', getValue: r => r.recordType || '' },
                    { label: '記錄標題', getValue: r => r.recordTitle || '' },
                    { label: '執行單位', getValue: r => r.executionUnit || '' },
                    { label: '工程單位', getValue: r => r.constructionUnit || '' },
                    { label: '記錄時間', getValue: r => r.createdAt ? r.createdAt.split('T')[0] : '' }
                ]
            },
            {
                label: '用地取得資訊',
                columns: [
                    { label: '用地取得類別',       getValue: r => r.category || '' },
                    { label: '用地經費',            getValue: r => fmtBudget(r.landAcquisitionBudget) },
                    { label: '公聽會',              getValue: r => fmtDN(r.publicHearing) },
                    { label: '徵收市價地評會審查',  getValue: r => fmtDN(r.marketPriceReview) },
                    { label: '協議價購會',          getValue: r => fmtDN(r.negotiatedPurchaseMeeting) },
                    { label: '徵收計畫書地政局預審', getValue: r => fmtDN(r.expropriationPlanPreReview) },
                    { label: '徵收計畫書報部',      getValue: r => fmtDN(r.expropriationPlanSubmission) },
                    { label: '徵收核定',            getValue: r => fmtDN(r.expropriationApproval) }
                ]
            },
            {
                label: '工程資訊',
                columns: [
                    { label: '工程經費',              getValue: r => fmtBudget(r.constructionBudget) },
                    { label: '預算(年度)來源核定經費', getValue: r => r.budgetFiscalYearApprovedAmount || '' },
                    { label: '開口合約/專業發包',      getValue: r => r.contractType || '' },
                    { label: '工期',                  getValue: r => r.constructionPeriod || '' },
                    { label: '上網公告預計/實際開工',  getValue: r => r.announcementCommencementDate || '' },
                    { label: '決標日期預計/實際完工',  getValue: r => r.awardCompletionDate || '' },
                    { label: '設計派工',              getValue: r => fmtDN(r.designDispatch) },
                    { label: '基設核定',              getValue: r => fmtDN(r.basicDesignApproval) },
                    { label: '細設核定',              getValue: r => fmtDN(r.detailedDesignApproval) },
                    { label: '工程施做',              getValue: r => fmtDN(r.constructionExecution) }
                ]
            },
            {
                label: '會議資訊',
                columns: [
                    { label: '前次會議辦理情形', getValue: r => r.previousMeetingStatus || '' },
                    { label: '前次會議裁示',     getValue: r => r.previousMeetingResolution || '' },
                    { label: '最新辦理情形',     getValue: r => r.currentStatus || '' },
                    { label: '本次會議裁示',     getValue: r => r.currentMeetingResolution || '' }
                ]
            }
        ];

        self._showColumnSelectModal(columnGroups, async (selectedCols, presetName) => {
            if (!selectedCols.length) return;

            showLoading('匯出中...');
            let records;
            try {
                const res = await fetch('/api/RoadProject/GetLastProcessRecords', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(selectedIds)
                });
                records = await res.json();
            } catch (e) {
                alert('取得歷程資料失敗');
                return;
            } finally {
                hideLoading();
            }

            if (!records || records.length === 0) {
                alert('所選專案尚無歷程記錄');
                return;
            }

            const data = records.map((r, idx) => {
                const row = { '項次': idx + 1 };
                selectedCols.forEach(col => { row[col.label] = col.getValue(r); });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '最新歷程');
            const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
            XLSX.writeFile(wb, `${presetName || '快速套用'}_${today}.xlsx`);
        });
    },

    _showColumnSelectModal: function(columnGroups, onConfirm) {
        $('#export-col-modal').remove();

        // 預設範本：欄位 label 集合
        const presets = [
            {
                name: '局務會議',
                labels: new Set(['工程名稱', '用地經費', '公聽會', '徵收市價地評會審查',
                    '協議價購會', '徵收計畫書地政局預審', '徵收計畫書報部', '徵收核定', '最新辦理情形'])
            },
            {
                name: '工程管制會議',
                labels: new Set(['行政區', '工程名稱', '執行單位', '預算(年度)來源核定經費',
                    '開口合約/專業發包', '工期', '上網公告預計/實際開工', '決標日期預計/實際完工',
                    '基設核定', '細設核定', '工程施做',
                    '前次會議辦理情形', '前次會議裁示', '最新辦理情形', '本次會議裁示'])
            },
            {
                name: '工程施作',
                labels: new Set(['工程名稱', '關心議員', '工程經費', '設計派工', '基設核定',
                    '細設核定', '工程施做', '最新辦理情形'])
            }
        ];

        const presetsHtml = presets.map((p, pi) => `
            <button class="ecm-preset-btn" data-preset="${pi}"
                style="padding:4px 12px; border:1px solid #94a3b8; border-radius:20px;
                       background:#f8fafc; font-size:12px; cursor:pointer; color:#334155;
                       transition:background .15s, color .15s;">
                ${p.name}
            </button>`).join('');

        const groupsHtml = columnGroups.map((g, gi) => {
            const colsHtml = g.columns.map((c, ci) => `
                <label class="ecm-col-item">
                    <input type="checkbox" class="ecm-col-check" data-group="${gi}" data-col="${ci}" checked>
                    <span>${c.label}</span>
                </label>`).join('');
            return `
                <div class="ecm-group">
                    <div class="ecm-group-header">
                        <input type="checkbox" class="ecm-group-check" data-group="${gi}" checked>
                        <strong>${g.label}</strong>
                    </div>
                    <div class="ecm-col-list">${colsHtml}</div>
                </div>`;
        }).join('');

        const modal = $(`
            <div id="export-col-modal" style="
                position:fixed; inset:0; z-index:9999;
                display:flex; align-items:center; justify-content:center;
                background:rgba(0,0,0,0.4);">
                <div style="
                    background:#fff; border-radius:10px; width:500px; max-height:82vh;
                    display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.18);">
                    <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:15px;">選擇匯出欄位</strong>
                        <label style="font-size:13px; color:#64748b; display:flex; align-items:center; gap:6px; cursor:pointer;">
                            <input type="checkbox" id="ecm-select-all" checked> 全選
                        </label>
                    </div>
                    <div style="padding:10px 20px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="font-size:12px; color:#94a3b8; white-space:nowrap;">快速套用</span>
                        ${presetsHtml}
                    </div>
                    <div style="padding:16px 20px; overflow-y:auto; flex:1;">
                        <style>
                            .ecm-group { margin-bottom:14px; }
                            .ecm-group-header { display:flex; align-items:center; gap:8px; margin-bottom:6px; color:#334155; }
                            .ecm-col-list { display:flex; flex-wrap:wrap; gap:6px 16px; padding-left:24px; }
                            .ecm-col-item { display:flex; align-items:center; gap:5px; font-size:13px; color:#475569; cursor:pointer; white-space:nowrap; }
                            .ecm-col-item input { cursor:pointer; }
                            .ecm-group-check { cursor:pointer; }
                            .ecm-preset-btn:hover { background:#eff6ff !important; color:#2563eb !important; border-color:#93c5fd !important; }
                            .ecm-preset-btn.active { background:#2563eb !important; color:#fff !important; border-color:#2563eb !important; }
                        </style>
                        ${groupsHtml}
                    </div>
                    <div style="padding:14px 20px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:8px;">
                        <button id="ecm-cancel" style="padding:7px 18px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; cursor:pointer; font-size:14px;">取消</button>
                        <button id="ecm-confirm" style="padding:7px 18px; border:none; border-radius:6px; background:#2563eb; color:#fff; cursor:pointer; font-size:14px;">確認匯出</button>
                    </div>
                </div>
            </div>`);

        $('body').append(modal);

        function syncGroupCheck(gi) {
            const checks = modal.find(`.ecm-col-check[data-group="${gi}"]`);
            modal.find(`.ecm-group-check[data-group="${gi}"]`).prop('checked',
                checks.toArray().every(el => el.checked));
        }

        function syncSelectAll() {
            modal.find('#ecm-select-all').prop('checked',
                modal.find('.ecm-col-check').toArray().every(el => el.checked));
        }

        // 全選
        modal.on('change', '#ecm-select-all', function() {
            modal.find('.ecm-group-check, .ecm-col-check').prop('checked', this.checked);
        });

        // 群組全選
        modal.on('change', '.ecm-group-check', function() {
            const gi = $(this).data('group');
            modal.find(`.ecm-col-check[data-group="${gi}"]`).prop('checked', this.checked);
            syncSelectAll();
        });

        // 單欄變更
        modal.on('change', '.ecm-col-check', function() {
            syncGroupCheck($(this).data('group'));
            syncSelectAll();
        });

        // 快速套用預設
        modal.on('click', '.ecm-preset-btn', function() {
            const pi = $(this).data('preset');
            const labelSet = presets[pi].labels;
            modal.find('.ecm-col-check').each(function() {
                const gi = $(this).data('group');
                const ci = $(this).data('col');
                const label = columnGroups[gi].columns[ci].label;
                $(this).prop('checked', labelSet.has(label));
            });
            columnGroups.forEach((_, gi) => syncGroupCheck(gi));
            syncSelectAll();
            modal.find('.ecm-preset-btn').removeClass('active');
            $(this).addClass('active');
        });

        modal.on('click', '#ecm-cancel', () => modal.remove());

        modal.on('click', '#ecm-confirm', () => {
            const selected = [];
            modal.find('.ecm-col-check:checked').each(function() {
                const gi = $(this).data('group');
                const ci = $(this).data('col');
                selected.push(columnGroups[gi].columns[ci]);
            });
            const activePreset = modal.find('.ecm-preset-btn.active');
            const presetName = activePreset.length
                ? presets[activePreset.data('preset')].name
                : null;
            modal.remove();
            onConfirm(selected, presetName);
        });

        // 點擊背景關閉
        modal.on('click', function(e) {
            if (e.target === this) modal.remove();
        });
    }
};

export default ProjectBox;