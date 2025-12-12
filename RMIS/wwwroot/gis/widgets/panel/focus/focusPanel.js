import { addFocusPipeline, removePipeline } from '/gis/js/index/ctrlMap/pipeline.js';

let _fId = "focusPanel";
let _initFlag = false;
let _apiBaseUrl = "";
let _appCore;
let $indexMap;
let currentRow = null;
let currentSquare = null;
let currentPage = 1;
let focusData = null;
let focuseRoad = null;
let focuseRange = null;
let pageSize = 10;
let focusPipeline = [];

var instance = {
    id: _fId,
    set: function (appCore) {
        _apiBaseUrl = appCore.environment.url.apiBaseUrl;
        _appCore = appCore;
        return this;
    },
    init: function () {
        console.log(`panel ${_fId} init`);
        $indexMap = _appCore.map.leafletMap;
        initDate();
        initFocusPanel();
    },
    open: function () {
        if (!_initFlag) { _initFlag = true; instance.init(); }
        console.log(`${_fId} open`);
    },
    close: function () {
        console.log(`${_fId} close`);
    },
};

export { instance as focusPanel };

function initDate(){
    const i18nSettings = {
        previousMonth: '上個月',
        nextMonth: '下個月',
        months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
        weekdays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
        weekdaysShort: ['日', '一', '二', '三', '四', '五', '六']
    };
    
    const options = {
        i18n: i18nSettings,
        firstDay: 1, // 星期一為每週第一天
        container: document.getElementById('focusPanel'), // 將月曆渲染限制在 focusPanel 內
        reposition: false, // 確保月曆自動調整位置，避免超出容器
        
    };

    const startDateInput = document.getElementById('focusStartDate');
    const endDateInput = document.getElementById('focusEndDate');

    var focusStart = new Pikaday({ 
        field: startDateInput,
        ...options,
        onOpen: function() {
            adjustCalendarPosition(focusStart.el, 'focusStartDate');
        },
        onSelect: function(selectedDate) {
            const formattedDate = formatDate(selectedDate, 'YYYY/MM/DD'); // 格式化日期
            document.getElementById('focusStartDate').value = formattedDate; // 更新輸入框
        }
    });
    
    var focusEnd = new Pikaday({ 
        field: endDateInput,
        ...options,
        onOpen: function() {
            adjustCalendarPosition(focusEnd.el, 'focusEndDate');
        },
        onSelect: function(selectedDate) {
            const formattedDate = formatDate(selectedDate, 'YYYY/MM/DD'); // 格式化日期
            document.getElementById('focusEndDate').value = formattedDate; // 更新輸入框
        }
    });

    // 調整月曆位置的函數
    function adjustCalendarPosition(calendar, inputId) {
        const input = document.getElementById(inputId);
        const inputRect = input.getBoundingClientRect();
        const panelRect = document.getElementById('focusPanel').getBoundingClientRect();
        const calendarRect = calendar.getBoundingClientRect();

        // 計算月曆的 top 和 left，使其位於目標 input 下方
        const top = inputRect.bottom - panelRect.top;
        const left = inputRect.left - panelRect.left;

        // 確保月曆不超出 focusPanel 的右邊界
        const maxLeft = panelRect.width - calendarRect.width;
        const adjustedLeft = Math.min(left, maxLeft);

        // 設置月曆的位置
        calendar.style.position = 'absolute';
        calendar.style.top = `${top}px`;
        calendar.style.left = `${adjustedLeft}px`;
    }

    function formatDate(date, format) {
        const padZero = (num) => (num < 10 ? `0${num}` : num);
        const year = date.getFullYear();
        const month = padZero(date.getMonth() + 1); // 月份從 0 開始
        const day = padZero(date.getDate());

        switch (format) {
            case 'YYYY/MM/DD':
                return `${year}/${month}/${day}`;
            case 'DD-MM-YYYY':
                return `${day}-${month}-${year}`;
            default:
                return date.toISOString().split('T')[0]; // 默認格式為 YYYY-MM-DD
        }
    }
}

function initFocusPanel(){
    $('#focusGoResult').on('click', function(){
        var formData = new FormData();
        // focusStartDate與focusEndDate，轉換成時間戳記
        var focusStartDate = $('#focusStartDate').val();
        var focusEndDate = $('#focusEndDate').val();
        var focusType = $('#ofType').val();
        var roadName = $('#focusRoad').val();

        formData.append('FocusStartDate', focusStartDate);
        formData.append('FocusEndDate', focusEndDate);
        formData.append('FocusType', focusType);
        formData.append('RoadName', roadName);
        console.log($('#focusStartDate').val(), $('#focusEndDate').val());
        fetch(`/api/MapAPI/GetFocusData`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(message => {
            // 取得搜尋後管線的資料
            var datas = message.datas;
            if($('#ofType').val() == 3){
                console.log(datas.construct);
                focusData = datas.construct || [];
            }
            else{
                focuseRoad = datas.focusedRoad || [];
                focuseRange = datas.focusedRange || [];
                focusData = focuseRoad.concat(focuseRange);
            }
        })
        .then(() => {
            let ofType = $('#ofType').val();
            // 新增圖資清單
            focusPipeline.forEach(id => {
                removePipeline(id).then(result => {
                    // remove2List(id);
                    delete _appCore.layerList[id]
                });
            })
            focusPipeline.length = 0;
            addFocusPipeline(ofType).then((result) => {
                var datas = result.datas;
                console.log(datas);
                for(var i = 0; i < datas.length; i++){
                    var { id, name, layers } = datas[i];
                    focusPipeline.push(id);
                    // add2List(id, name, layers);
                    _appCore.layerList[id] = { name, datas: layers, metaData: null };
                    // addFocusLayer2Map(id, ofType, layers, $('#focusStartDate').val(), $('#focusEndDate').val());
                }
                console.log(focusPipeline);
            });
            
            
            // $("#focusTotalCount").text(`(總數:${focusData.length})`);
            // updateFlagTable();
            // $('#focusResultDiv').show();
        });
    });
    $('#focusExcel').on('click', function(){
        const data = focusData.map(function (item) {
            return {
                '借用類型': item['caseType'],
                '日期': item['date'],
                '地點': item['location'],
                '施工通報許可證號': item['licenseNumber'],
                '臨時道路租借事由': item['reason']
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, `養工焦點列表_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`);
        console.log(focusData);
    });
    $('#focusPageSize').on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updateFlagTable();
    });
}

// 更新屬性表格
function updateFlagTable() {
    // 更新總頁數
    const totalPages = Math.ceil(focusData.length / pageSize);
    // 當前頁數索引範圍
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, focusData.length);
    // 取得當前頁數的範圍資料
    const pageData = focusData.slice(startIndex, endIndex);

    // 添加當前範圍內的資料
    renderTableBody(pageData);
    // 更新分頁按鈕
    updatePagination(totalPages);
}

function renderTableBody(pageData){
    var $focusTbody = $('#focusTbody');
    $focusTbody.empty();
    pageData.forEach(data => {
        const button = $('<button>目標</button>').on('click', function () {
            if(currentRow){
                currentRow.removeClass('selectRow');
            }
            if(currentSquare){
                $indexMap.removeLayer(currentSquare);
            }
            console.log(data);
            currentRow = $(this).closest('tr');
            currentRow.addClass('selectRow');
            // 轉換成可用的經緯度
            
            if(data.caseType == "臨時道路借用申請(範圍)"){
                const latlngs = data.points.map(point => [point.latitude, point.longitude]);
                currentSquare = L.polygon(latlngs, {color: 'red', interactive: false}).addTo($indexMap);
                // zoom:19
                $indexMap.fitBounds(currentSquare.getBounds(), { maxZoom: 19 });
            }
            else if(data.caseType == "臨時道路借用申請(路線)"){
                const latlngs = data.points.map(point => [point.latitude, point.longitude]);
                currentSquare = L.polyline(latlngs, {color: 'red', interactive: false}).addTo($indexMap);
                // zoom:19
                $indexMap.fitBounds(currentSquare.getBounds(), { maxZoom: 19 });
            }
            else if(data.caseType == "施工通報(道路挖掘)"){
                const latlngs = data.points.map(point => [point.latitude, point.longitude]);
                console.log(latlngs[0]);
                const squareIcon = L.divIcon({
                    html: `<svg width="24" height="24">
                            <rect 
                            x="0" 
                            y="0" 
                            width="24" 
                            height="24" 
                            fill="none" 
                            stroke="#0066CC" 
                            stroke-width="3"
                            />
                        </svg>`,
                    className: 'square-marker',  // 避免 Leaflet 默認樣式
                    iconSize: [24, 24],         // 圖標大小
                    iconAnchor: [12, 12]        // 錨點在正方形中心
                });

                currentSquare = L.marker(latlngs[0], { icon: squareIcon, interactive: false }).addTo($indexMap);
                // 使用 setView() 將地圖聚焦到 marker
                $indexMap.setView(latlngs[0], 19);
            }
        });
        const tableRow = $('<tr></tr>');
        const focusRow =
        `
            <td>${data.date}</td>
            <td>${data.location}</td>
            <td>${data.caseType}</td>
        `;
        tableRow.append($('<td></td>').append(button));
        tableRow.append(focusRow);
        $focusTbody.append(tableRow);
    });
}

function updatePagination(totalPages) {
    const $pagination = $('#focusPages');
    $pagination.empty();
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = $('<a></a>')
            .text(i)
            .toggleClass('select', i === currentPage)
            .on('click', function () {
                currentPage = i;
                updateFlagTable();
            });
        $pagination.append(pageButton);
    }
}
