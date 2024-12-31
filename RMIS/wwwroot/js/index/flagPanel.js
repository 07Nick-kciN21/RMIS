import { layerProps } from './ctrlMap/layers.js';
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

const locOccs = ["否", "是"];

const manages = ["桃園市政府養護工程處", "公園綠地科", "道路行政科", "秘書室"];

const caseStatus = ["發文通知", "未處理", "已處理"];

const suspectTypes = ["第一類-荒廢未管理之地", "第二類-民眾種植有價作物", "第三類-鐵皮、柵欄或其他可移動式之臨時設施", "第四類-永久建築物"];

let filterFlags = [];

export function initFlagPanel(){
    let flagProps;
    $('#tb-flagPanel').on('click', function(){
        fetch('/api/AdminAPI/getFlaggedPipelines', {method: 'POST'})
        .then(response => response.json())
        .then(data => {
            console.log(data['pipelines']);
            for(let i=0; i<data['pipelines'].length; i++){
                const pipeline = data['pipelines'][i].toLowerCase();
                if($(`#switch-${pipeline}`).hasClass('switch-off')){
                    $(`#${pipeline}`).click();
                    // console.log(`#${pipeline} click`);
                }
                console.log(`#${pipeline} click`);
            };
            flagProps = layerProps[data['pipelines'][0]];
        });
    });

    $('#flagGoResult').on('click', function(){
        // 疑似占用
        const locOccVal = $('input[name="locOcc"]:checked').val();
        // 地段
        const landSelect = $('#landSelect').val();
        // 鄉鎮市區
        const adminVal = parseInt($('#adminSelect').val(), 10); 
        // 疑似占用類型
        const suspectVal = $('#suspectTypeSelect').val(); 
        // 管理單位
        const manageVal = $('#manageSelect').val();
        // 案件狀況
        const caseStatusVal = $('#caseSelect').val();
        // 年度
        const yearVal = $('#yearSelect').val();

        console.log(locOccVal, landSelect, adminVal, suspectVal, manageVal, caseStatusVal, yearVal);
        console.log(locOccs[locOccVal], adminDists[adminVal], suspectTypes[suspectVal], manages[manageVal], caseStatus[caseStatusVal], yearVal);
        const flagProps = layerProps['827acad2-6e1d-4343-bc1c-82b68f87a65b'];
        filterFlags = flagProps.filter(function(item){
            return (locOccVal == -1 || item['疑似占用'] == locOccs[locOccVal]) && 
                   (landSelect == -1 || item['地段-名'] == landSelect) && 
                   (adminVal == -1 || item['鄉鎮市區'] == adminDists[adminVal]) && 
                   (suspectVal == -1 || item['疑似占用類型'] == suspectTypes[suspectVal]) &&
                   (manageVal == -1 || item['管理單位'] == manages[manageVal]) &&
                   (caseStatusVal == -1 || item['案件狀態'] == caseStatus[caseStatusVal]) &&
                   (yearVal == -1 || item['清查年度'] == yearVal);
        });
        $("#flagCount").text(`(總數：${filterFlags.length})`);
        updateFlagTable();
    });

    $('#flagPageSize').on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updateFlagTable();
    });

    $('#flagExcel').on('click', function () {
        const data = filterFlags.map(function (item) {
            return {
                '案號': item['勘查表編號'],
                '清查年度': item['清查年度'],
                '疑似占用': item['疑似占用'],
                '勘查表': `https://oram-integ.tycg.gov.tw/TYMaintain/Doc/Land${item['案件狀態']}.pdf`,
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, '權管土地.xlsx');
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

