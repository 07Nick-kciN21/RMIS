
{/* <div id="flagResultDiv" class="panelList">
    <table id="flagTable" class="propTable">
        <thead id="flagThead">
            <tr id="Occdr" role="row">
                <th style="width:100px"></th>
                <th style="width:100px">案號</th>
                <th style="width:120px">清查年度</th>
                <th style="width:120px">疑似占用</th>
                <th style="width:100px">勘查表</th>
                <th style="width:120px">案件狀態</th>
                <th style="width:100px">備註</th>
                <th style="width:65px">附件</th>
            </tr>
        </thead>
        <tbody id="flagTbody"></tbody>
    </table>
</div>
<div class="tablePage" style="margin: 15px;">
    <span style="float:left">每頁最多</span>
    <select id="flagPageSize" style="float:left">
        <option value="10">10</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="200">200</option>
    </select>
    <span style="float:left"> 筆</span>
    <span id="flagPages" class="pageList" style="height:63px; width:50%; float:right;overflow-x: hidden; overflow-y: auto;">
    </span>
</div> */}

{/* <div class="propResultDiv" style="width:100%; height:280px; max-height:280px; overflow:auto;">
    <table id="propResult" class="propTable">
        <thead id="propThead"></thead>
        <tbody id="propTbody"></tbody>
    </table>
</div>
<div class="tablePage">
    <span style="float:left">每頁最多</span>
    <select id="propPageSize" style="float:left">
        <option value="10">10</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="200">200</option>
    </select>
    <span style="float:left"> 筆</span>
    <span id="propPages" class="pageList" style="height:63px; width:50%; float:right;overflow-x: hidden; overflow-y: auto;">
    </span>
</div> */}

export function initPagination(name, datas){
    var $tbody = $(`#${name}Tbody`);
    $tbody.empty();
    // 根據name生成
    var $resultDiv = $(`#${name}ResultDiv`);
    // 在resultDiv中生成下方生成tablePage
    var $tablePage = $(`<div class="tablePage">
        <span style="float:left">每頁最多</span>
        <select id="${name}PageSize" style="float:left">
            <option value="10">10</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
        </select>
        <span style="float:left"> 筆</span>
        <span id="${name}Pages" class="pageList" style="height:63px; width:50%; float:right;overflow-x: hidden; overflow-y: auto;">
        </span>
    </div>`);
    // 插入 tablePage 到 resultDiv 下方
    $resultDiv.append($tablePage);

    $(`#${name}PageSize`).on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updateFlagTable();
    });
}

function updateFlagTable(datas){
    // 更新總頁數
    const totalPages = Math.ceil(datas.length / pageSize);
    // 當前頁數索引範圍
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, datas.length);
    // 取得當前頁數的範圍資料
    const pageData = datas.slice(startIndex, endIndex);

    // 添加當前範圍內的資料
    renderTableBody(pageData);
    // 更新分頁按鈕
    updatePagination(totalPages);
}


function renderTableBody(){

}

function updatePagination(){

}



function updateFlagTable() {
    // 更新總頁數
    const totalPages = Math.ceil(filterFlags.length / pageSize);
    // 當前頁數索引範圍
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filterFlags.length);
    // 取得當前頁數的範圍資料
    const pageData = filterFlags.slice(startIndex, endIndex);

    // 添加當前範圍內的資料
    renderTableBody(pageData);
    // 更新分頁按鈕
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
            $indexMap.setView(center, 18);
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
            currentSquare = L.marker(center, { icon: squareIcon, interactive: false }).addTo($indexMap);
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



// 更新屬性表格
function updatePropTable() {
    // 更新總頁數
    const totalPages = Math.ceil(filteredProps.length / pageSize);
    // 當前頁數索引範圍
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProps.length);
    // 取得當前頁數的範圍資料
    const pageData = filteredProps.slice(startIndex, endIndex);

    renderTableHeaders(pageData);
    renderTableBody(pageData);
    updatePagination(totalPages);
}

function renderTableHeaders(pageData) {
    const $propThead = $('#propThead');
    $propThead.empty();

    const headRow = $('<tr></tr>').append($('<th></th>'));
    Object.keys(pageData[0]).forEach(key => {
        if (key !== "座標" && key !== 'Instance') {
            headRow.append($('<th></th>').text(key));
        }
    });
    $propThead.append(headRow);
}

let currentRow;

// 生成結果表格
function renderTableBody(pageData) {
    const $propTbody = $('#propTbody');
    $propTbody.empty();

    $indexMap = getIndexMap();
    pageData.forEach(item => {
        const tableRow = $('<tr></tr>');
        const button = $('<button>目標</button>').on('click', function () {
            highlightMapFeature(item);
            if (currentRow) {
                currentRow.removeClass('selectRow');
            }
            currentRow = $(this).closest('tr');
            currentRow.addClass('selectRow');
        });
        tableRow.append($('<td></td>').append(button));

        for (const key in item) {
            if (key !== "座標" && key !== 'Instance') {
                tableRow.append($('<td></td>').text(item[key]));
            }
        }
        $propTbody.append(tableRow);
    });
}
function updatePagination(totalPages) {
    const $pagination = $('#propPages');
    $pagination.empty();
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = $('<a></a>')
            .text(i)
            .toggleClass('select', i === currentPage)
            .on('click', function () {
                currentPage = i;
                updatePropTable();
            });
        $pagination.append(pageButton);
    }
}