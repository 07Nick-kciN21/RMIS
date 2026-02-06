import BoxManager from './box.js';
import ProcessBox from './processBox.js';
import RoadProjectView from './roadProjectView.js';
import RoadProjectAdd from './roadProjectAdd.js';
import RoadProjectImport from './roadProjectImport.js';
import { Map } from './map_test.js';


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

    step:[
        "爭取預算與前期規畫階段",
        "意願調查及用地取得階段",
        "設計與施工階段"
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

        // 綁定關閉按鈕事件，清除定位圖層
        $('#left-box .btn-close-box').on('click', function() {
            self.clearProjectLayer();
        });

        console.log("ProjectBox 業務邏輯初始化完成 (Fetch JSON 模式)");
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
            startPoint: self.convertInputValue($('#projectStartPoint').val()), // 起點
            endPoint: self.convertInputValue($('#projectEndPoint').val()), // 終點
            roadLength: self.convertInputValue($('#projectRoadLength').val()), // 道路長度
            currentRoadWidth: self.convertInputValue($('#projectCurrentRoadWidth').val()), // 現況路寬
            plannedRoadWidth: self.convertInputValue($('#projectPlannedRoadWidth').val()), // 計畫路寬
            step: self.convertSelectValue($('#projectStep').val()), // 階段
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

            let row = `
                <tr data-project-index="${startIndex + currentPageData.indexOf(item)}">
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-locate" data-id="${item.id}">
                            定位
                        </button>
                    </td>
                    ${hasUpdatePermission ? `<td><button class="btn btn-sm btn-outline-secondary btn-ProcessView" data-id="${item.projectId}">歷程</button></td>` : ''}
                    <td>${item.proposer || ''}</td>
                    <td>${item.administrativeDistrict || ''}</td>
                    <td class="td-clickable" style="cursor: pointer; color: #2563eb;">${item.startEndLocation || ''}</td>
                    <td>${totalBudgetDisplay}</td>
                </tr>`;
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

        // 綁定操作按鈕事件（開啟歷程詳情）
        if (hasUpdatePermission) {
            $('.btn-ProcessView').on('click', function() {
                const id = $(this).data('id');
                self.openProjectProcess(id);
            });
        }

        // 更新分頁控制項
        self.updatePagination(totalPages);
    },

    /**
     * 開啟專案歷程詳情（操作按鈕觸發）
     * @param {string} projectId - 專案 ID
     */
    openProjectProcess: function(projectId) {
        const self = this;

        console.log('開啟專案歷程，ID:', projectId);
        // 從 API 回傳的資料中尋找對應專案
        let projectData = self.filterProject.find(p => p.projectId === projectId);
        
        // 如果找不到，使用測試資料
        if (!projectData) {
            projectData = self.MOCK_PROJECTS.find(p => p.projectId === projectId);
        }
        console.log('專案資料:', projectData);
       
        // 補充 API 資料用於顯示）
        projectData = self.formatProjectData(projectData);
        

        // 呼叫 ProcessBox 開啟歷程詳情
        ProcessBox.openProcessBox(projectData);
    },

    /**
     * 開啟專案詳情檢視
     * @param {Object} projectData - 專案資料
     */
    openProjectView: function(projectData) {
        console.log('開啟專案詳情:', projectData);
        RoadProjectView.openView(projectData);
    },

    /**
     * 格式化專案資料（補充 API 回傳資料中缺少的欄位）
     * @param {Object} apiData - API 回傳的原始資料
     * @returns {Object} - 格式化後的資料
     */
    formatProjectData: function(apiData) {
        return {
            id: apiData.projectId || '-',
            name: apiData.startEndLocation || apiData.name || '未命名專案',
            step: apiData.step || '執行中',
            createDate: this.parseDate(apiData.createTime) || '-',
            budget: apiData.totalBudget ? (apiData.totalBudget / 10000) + ' 萬' : '-',
            pm: apiData.proposer || apiData.pm || '-',
            progress: apiData.progress || 0,
            // 保留原始資料供後續使用
            _raw: apiData
        };
    },

    parseDate: function(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    /**
     * 更新分頁控制項
     */
    updatePagination: function(totalPages) {
        const self = this;
        const $pagination = $('#protectPages');
        $pagination.empty();

        if (totalPages <= 1) {
            return;
        }

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = $('<a></a>')
                .text(i)
                .toggleClass('select', i === self.currentPage)
                .css({
                    'cursor': 'pointer',
                    'padding': '5px 10px',
                    'margin': '0 2px',
                    'border': '1px solid #ddd',
                    'display': 'inline-block'
                })
                .on('click', function() {
                    self.currentPage = i;
                    self.updateProjectTable();
                });
            
            if (i === self.currentPage) {
                pageButton.css({
                    'background-color': '#007bff',
                    'color': 'white',
                    'border-color': '#007bff'
                });
            }
            
            $pagination.append(pageButton);
        }
    },

    /**
     * 定位專案到地圖 - 完整實作
     */
    locateProject: function(projectId) {
        const self = this;

        if (!self.$indexMap || !self.projectLayer) {
            console.error('地圖未初始化');
            alert('地圖功能未就緒，請稍後再試');
            return;
        }

        // 呼叫 API 取得專案的座標點資料
        fetch(`/api/MapAPI/GetPointsByProjectId?projectId=${projectId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            console.log('專案座標資料:', data);
            
            // 清除舊的圖層
            self.projectLayer.clearLayers();

            // 取得範圍點和照片點
            const rangePoints = data['points']['rangePoints'] || [];
            const photoPoints = data['points']['photoPoints'] || [];

            if (rangePoints.length === 0) {
                alert('此專案無座標資料');
                return;
            }
            // 1. 累加所有點的經緯度
            let centerLat = 0;
            let centerLng = 0;
            rangePoints.forEach(point => {
                centerLat += point.latitude;
                centerLng += point.longitude;
            });

            // 2. 計算平均值得到中心點
            centerLat = centerLat / rangePoints.length;
            centerLng = centerLng / rangePoints.length;
            
            // 先設定視圖到目標位置
            self.$indexMap.setView([centerLat, centerLng], 18);
            
            // 計算偏移量，因為左側50%被遮擋，需要向右平移
            // 取得地圖容器尺寸
            const mapSize = self.$indexMap.getSize();
            
            // 向右偏移地圖寬度的 25%（因為左半邊被遮擋，所以移到右側可見區域的中心）
            const offsetX = -mapSize.x * 0.25;
            
            // 使用 panBy 平移地圖
            self.$indexMap.panBy([offsetX, 0], {
                animate: true,
                duration: 0.5
            });

            // 添加照片標記點 (photoPoints)
            photoPoints.forEach(point => {
                const marker = L.marker([point['latitude'], point['longitude']])
                    .addTo(self.projectLayer);
                
                // 產生照片彈出視窗內容
                const popupContent = self.createPhotoPopup(point['url']);
                
                marker.bindPopup(popupContent, {
                    maxWidth: 450,
                    maxHeight: 350
                });
            });

            // 添加範圍多邊形 (rangePoints)
            const polygonCoords = rangePoints.map(coord => [coord.latitude, coord.longitude]);
            const polygon = L.polygon(polygonCoords, {color: 'red'})
                .addTo(self.projectLayer);
            
            // 取得專案屬性資料
            const prop = rangePoints[0]['prop'];
            
            // 綁定專案資訊彈出視窗
            polygon.bindPopup(`
                <div>
                    <text style="font-size: 25px; font-weight: bolder;">
                        圖層：道路專案
                    </text>
                    <div style="font-size: 20px;">
                        ${self.createPopupForm(prop)}
                    </div>
                </div>`, {
                maxWidth: 350,
                maxHeight: 450
            });
        })
        .catch(error => {
            console.error('定位失敗:', error);
            alert('定位失敗，請稍後再試');
        });
    },

    /**
     * 產生照片彈出視窗內容
     */
    createPhotoPopup: function(urlData) {
        const url = JSON.parse(urlData);
        
        const popupContent = document.createElement('div');
        popupContent.id = 'photoPopup';

        // 添加圖片
        const img = document.createElement('img');
        const src = `/roadProject/${url["url"]}?v=${new Date().getTime()}`;
        img.src = src;
        img.style.width = '450px';
        img.style.height = '300px';
        popupContent.appendChild(img);

        return popupContent;
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
        const data = self.filterProject.map(project => {
            return {
                '申請人': project['proposer'],
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
    }
};

export default ProjectBox;