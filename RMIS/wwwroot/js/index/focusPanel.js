import { addFocusPipeline, removePipeline } from './ctrlMap/pipeline.js';
import { add2List, remove2List} from './ctrlMap/list.js';
import { addFocusLayer2Map } from './ctrlMap/layers.js';
import { getIndexMap } from './map.js';

let currentRow = null;
let currentSquare = null;
let currentPage = 1;
let focusData = null;
let focuseRoad = null;
let focuseRange = null;
let pageSize = 10;
let focusPipeline = [];

export function initFocusPanel(){
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
                    remove2List(id);
                });
            })
            focusPipeline.length = 0;
            addFocusPipeline(ofType).then((result) => {
                var datas = result.datas;
                console.log(datas);
                for(var i = 0; i < datas.length; i++){
                    var { id, name, layers } = datas[i];
                    focusPipeline.push(id);
                    add2List(id, name, layers);
                    addFocusLayer2Map(id, ofType, layers, $('#focusStartDate').val(), $('#focusEndDate').val());
                }
                console.log(focusPipeline);
            });
            
            
            $("#focusTotalCount").text(`(總數:${focusData.length})`);
            updateFlagTable();
            console.log(focusData);
            $('#focusResultDiv').show();
        });
    });
    $('#focusExportExcel').on('click', function(){
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
    var $indexMap = getIndexMap();
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
                currentSquare = L.polygon(latlngs, {color: 'red'}).addTo($indexMap);
                // zoom:19
                $indexMap.fitBounds(currentSquare.getBounds(), { maxZoom: 19 });
            }
            else if(data.caseType == "臨時道路借用申請(路線)"){
                const latlngs = data.points.map(point => [point.latitude, point.longitude]);
                currentSquare = L.polyline(latlngs, {color: 'red'}).addTo($indexMap);
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
