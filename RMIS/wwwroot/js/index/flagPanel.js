import {layers, layerProps} from './ctrlMap/layers.js';
import { getIndexMap } from './map.js';


const adminDists = [
    "桃園區",  // value: 1
    "大溪區",  // value: 2
    "中壢區",  // value: 3
    "楊梅區",  // value: 4
    "蘆竹區",  // value: 5
    "大園區",  // value: 6
    "龜山區",  // value: 7
    "八德區",  // value: 8
    "龍潭區",  // value: 9
    "平鎮區",  // value: 10
    "新屋區",  // value: 11
    "觀音區",  // value: 12
    "復興區"   // value: 13
];

let filterFlags = [];

export function initflagPanel(){
    $('#tb-flagPanel').on('click', function(){
        if( !$('#switch-f0679c23-c520-48c1-b2cc-43dd70d5a194' ).hasClass('switch-on')) {
            // pipelineId = f0679c23-c520-48c1-b2cc-43dd70d5a194
            $('#f0679c23-c520-48c1-b2cc-43dd70d5a194').trigger('click');
        }
        // 如果switch-7abd9458-39f1-436d-af8d-a3526e06ccf0 有 switch-on 類別，則不觸發 click 事件
        if( !$('#switch-4a38a83d-0518-4c26-b538-22c7a755a9f0' ).hasClass('switch-on')) {
            // pipelineId = 4a38a83d-0518-4c26-b538-22c7a755a9f0
            $('#4a38a83d-0518-4c26-b538-22c7a755a9f0').trigger('click');
        };
    });

    $('#flagGoResult').on('click', function(){
        // 當需要取得選定的單選按鈕值時
        const i = $('input[name="locOcc"]:checked').val();
        const landSelect = $('#landSelect').val();
        const adminVal = parseInt($('#adminSelect').val(), 10); // 獲取選中的值並轉為數字
        console.log(i, landSelect, adminVal);
        const flagProps = layerProps['4a38a83d-0518-4c26-b538-22c7a755a9f0'];
        // 過濾出"疑似占用類型" == 1 且 地段 == landSelect 的資料
        filterFlags = flagProps.filter(function(item){
            return (i == -1 || item['疑似占用類型'] == i) && (landSelect == -1 || item['地段-名'] == landSelect) && (adminVal == -1 || item['鄉鎮市區'] == adminDists[adminVal]);
        });
        $("#flagCount").text(`(總數：${filterFlags.length})`);
        updateFlagTable();
    });

    $('#flagPageSize').on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updateFlagTable();
    });
}

let currentRow = null;
let currentSquare = null;
// 當前頁碼
let currentPage = 1;
// 每頁筆數
let pageSize = 10;

// 更新屬性表格
function updateFlagTable() {
    // 更新總頁數
    const totalPages = Math.ceil(filterFlags.length / pageSize);
    // 當前頁數索引範圍
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filterFlags.length);
    // 取得當前頁數的範圍資料
    const pageData = filterFlags.slice(startIndex, endIndex);

    renderTableBody(pageData);
    updatePagination(totalPages);
}

function renderTableBody(pageData){
    const flagTbody = $('#flagTbody');
    flagTbody.empty();
    let $indexMap = getIndexMap();
    pageData.forEach(data => {
        const tableRow = $('<tr></tr>');
        // 目標按鈕，點擊時將地圖視角設置為該標記的座標，並在該位置添加一個方框
        const button = $('<button>目標</button>').on('click', function () {
            if (currentRow) {
                currentRow.removeClass('selectRow');
            }
            if(currentSquare){
                $indexMap.removeLayer(currentSquare);
            }
            currentRow = $(this).closest('tr');
            currentRow.addClass('selectRow');
            const center = data['座標'];
            // 計算方框的地理範圍（假設方框大小固定，如 0.001 度範圍）
            const offset = 0.000005; // 偏移量，控制方框大小
            const bounds = [
                [center[0] - offset, center[1] - offset], // 左下角
                [center[0] + offset, center[1] + offset]  // 右上角
            ];
            console.log(bounds);
            $indexMap.setView(center, 22);
            // 創建一個帶有藍色正方形的自定義圖標
            const squareIcon = L.divIcon({
                html: `<svg width="24" height="24">
                        <rect 
                        x="0" 
                        y="0" 
                        width="24" 
                        height="24" 
                        fill="none" 
                        stroke="#ff0000" 
                        stroke-width="5"
                        />
                    </svg>`,
                className: 'square-marker',  // 避免 Leaflet 默認樣式
                iconSize: [24, 24],         // 圖標大小
                iconAnchor: [12, 12]        // 錨點在正方形中心
            });
            currentSquare = L.marker(center, { icon: squareIcon }).addTo($indexMap);
        });
        const flagRow = 
        `
            <td>${data['勘查表編號']}</td>
            <td>${data['清查年度']}</td>
            <td>${data['疑似占用']}</td>
            <td><a href="https://oram-integ.tycg.gov.tw/TYMaintain/Doc/Land/${data['勘查表編號']}.pdf">文件</a></td>
            <td>${data['案件狀態']}</td>
            <td>${data['備註']}</td>
            <td>${data['附件']}</td>
        `; 
        tableRow.append($('<td></td>').append(button));
        tableRow.append(flagRow);
        flagTbody.append(tableRow);
    })
}

function updatePagination(totalPages) {
    const $pagination = $('#flagPages');
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

