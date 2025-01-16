import { layers, layerProps } from './ctrlMap/layers.js';

let currentRow = null;
let currentSquare = null;
let currentPage = 1;
let focusData = null;
let pageSize = 10;
export function initFocusPanel(){
    $('#focusGoResult').on('click', function(){
        var formData = new FormData();
        // focusStartDate與focusEndDate，轉換成時間戳記
        formData.append('FocusStartDate', new Date($('#focusStartDate').val()).getTime());
        formData.append('FocusEndDate', new Date($('#focusEndDate').val()).getTime());
        formData.append('FocusType', $('#ofType').val());
        console.log(new Date($('#focusStartDate').val()).getTime(), new Date($('#focusEndDate').val()).getTime());
        fetch(`/api/AdminAPI/getFocusData`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(message => {
            // 取得搜尋後管線的資料
            var datas = message.datas;
            var focuseRoad = datas.focusedRoad;
            var focuseRange = datas.focusedRange;
            focusData = focuseRoad.concat(focuseRange);
        })
        .then(() => {
            // 更新屬性表格
            $("#focusTotalCount").text(`(總數:${focusData.length})`);
            updateFlagTable();
            console.log(focusData);
            $('#focusResultDiv').show();
        });
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
    for(var i = 0; i < pageData.length; i++){
        const button = $('<button>目標</button>').on('click', function () {
            if(currentRow){
                currentRow.removeClass('selectRow');
            }
            if(currentSquare){
                $indexMap.removeLayer(currentSquare);
            }
            currentRow = $(this).closest('tr');
            currentRow.addClass('selectRow');
        });
        const tableRow = $('<tr></tr>');
        const focusRow =
        `
            <td>${pageData[i].date}</td>
            <td>${pageData[i].location}</td>
            <td>${pageData[i].caseType}</td>
        `;
        tableRow.append($('<td></td>').append(button));
        tableRow.append(focusRow);
        $focusTbody.append(tableRow);
    };
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