﻿// Import required modules
import { layerProps } from '../ctrlMap/layers.js';
import { getIndexMap } from '../map.js';
import { updatePropQuery, filterPropsByRules, parseRules } from './propQueryBuilder.js';
import { handleDrawShape, filterPropsByShape, clearShape, getShape } from './shapeSearch.js';
// Global variables
let props;
let currentPage = 1;
let filteredProps = [];
let pageSize = 10;
let highlightRectangle = null;
let highlightedLine = null; // 用於保存新增的高亮線
let $indexMap;
let pselectedId;
let gselectedId;

export function initSearchPropPanel() {
    $(document).ready(function () {
        observeLayerBarChanges();
        setupRadioButtonHandlers();
        setupSelectChangeHandlers();
        setupFilterAndClearHandlers();
        setupPaginationHandlers();
        setupMapClickHandler();
    });
}


// 監聽 layerBarContainer 的變動來更新FeatSelect
function observeLayerBarChanges() {
    const observerConfig = { childList: true, subtree: true };
    const callback = function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                updateSelect('#pFeatSelect');
                updateSelect('#gFeatSelect');
            }
        }
    };
    const layerContainer = $('#layerBarContainer')[0];
    if (layerContainer) {
        const observer = new MutationObserver(callback);
        observer.observe(layerContainer, observerConfig);
    }
}

// 管理切換
function setupRadioButtonHandlers() {
    $('input[name="btnradio"]').on('change', function () {
        const selectedLabel = $(this).next('label').text();
        $('#prop1, #prop2, #prop3, #prop4').css('display', 'none');

        if (selectedLabel === '依屬性') {
            $('#prop1').css('display', 'block');
        } else if (selectedLabel === '依空間') {
            $('#prop2').css('display', 'block');
        } else if (selectedLabel === '結果') {
            $('#prop3').css('display', 'block');
        } else {
            $('#prop4').css('display', 'block');
        }
    });
}


// FeatSelect變更的處理程序
function setupSelectChangeHandlers() {
    $('#pFeatSelect').on('change', function () {
        if ($('#propQuery').data('queryBuilder')) {
            $('#propQuery').queryBuilder('destroy');
        }
        pselectedId = $(this).val();
        if (pselectedId == -1) {
            return;
        };
        props = layerProps[pselectedId];
        updatePropQuery(props);
    });

    $('#gFeatSelect').on('change', function () {
        gselectedId = $(this).val();
        if (gselectedId == -1) {
            $('label[for="btnradio3"]').css('visibility', 'hidden');
            $('label[for="btnradio4"]').css('visibility', 'hidden');
            $('#shapeGroup').addClass('hide');
            return;
        }
        props = layerProps[gselectedId];
        $('#shapeGroup').removeClass('hide');
        handleDrawShape($indexMap, gselectedId);
    });
}


// 設定篩選與清除按鈕
function setupFilterAndClearHandlers() {
    $('#propGoFilter').on('click', function () {
        const result = $('#propQuery').queryBuilder('getRules');
        if (!result || !result.rules.length) {
            console.error("No valid rules found.");
            return;
        }
        filteredProps = filterPropsByRules(props, result);
        if (filteredProps.length == 0) {
            alert("沒有符合條件的結果");
            return;
        }
        pageSize = 10;
        currentPage = 1;

        var resultLayer = $('#pFeatSelect').find('option:selected').text();
        $('#propResultLayer').text(resultLayer);
        $('#analysisResultLayer').text(resultLayer);

       
        var condition = parseRules(result);
        $('#propResultCond').text(condition);

        console.log(parseRules(result));
        $('#totalCount').text(`(總數:${filteredProps.length})`);
        updatePropTable();
        updateAnalysisList();
        $('label[for="btnradio3"]').css('visibility', 'visible');
        $('label[for="btnradio4"]').css('visibility', 'visible');
    });
    $('#propClear').on('click', function () {
        $('label[for="btnradio3"]').css('visibility', 'hidden');
        $('label[for="btnradio4"]').css('visibility', 'hidden');
        $('#pFeatSelect').val('-1').trigger('change');
    });

    $('#geoGoFilter').on('click', function () {
        var resultLayer = $('#gFeatSelect').find('option:selected').text();
        $('#propResultLayer').text(resultLayer);
        $('#analysisResultLayer').text(resultLayer);
        $('#propResultCond').text(getShape());
        const filteredPropsbyShape = filterPropsByShape(gselectedId);
        filteredPropsbyShape.then((value) => {
            if (value.length == 0) {
                alert("no filteredProps");
                return;
            }
            else {
                filteredProps = value;
                updatePropTable();
                updateAnalysisList();
                $('#totalCount').text(`(總數:${filteredProps.length})`);
                $('label[for="btnradio3"]').css('visibility', 'visible');
                $('label[for="btnradio4"]').css('visibility', 'visible');
            }
        });
    });
    $('#geoClear').on('click', function () {
        $('#gFeatSelect').val('-1').trigger('change');
        clearShape($indexMap);
    });

    $('#exportExcel1').on('click', function () {
        console.log(filteredProps);
        const filteredPropsWithoutFields = filteredProps.map(({ Instance, 座標, ...rest }) => rest);

        const worksheet = XLSX.utils.json_to_sheet(filteredPropsWithoutFields);
        const workbook = XLSX.utils.book_new();
        const name = $('#propResultLayer').text();
        const cond = $('#propResultCond').text();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Props Data");
        XLSX.writeFile(workbook, `${name}屬性篩選(${cond}).xlsx`);
    });
}
// 設置分頁顯示資料
function setupPaginationHandlers() {
    $('#pageSize').on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updatePropTable();
    });
}

// 隨Featselect更新下拉選單內容
function updateSelect(featSelect) {
    const $propSelect = $(featSelect);
    $propSelect.empty().append($('<option></option>').val(-1).text("請選擇圖層"));
    $('.layerBar').each(function () {
        const name = $(this).find('.layerName').text().trim();
        const value = $(this).attr('id').replace('layerBar_', '');
        $propSelect.append($('<option></option>').val(value).text(name));
    });
    $propSelect.trigger('change');
}

const countableTypes = ["作業區分", "設施長度", "孔蓋種類", "尺寸單位", "蓋部寬度", "蓋部長度", "地盤高", "孔深", "孔蓋型態", "設施寬度", "設施高度", "設施型態", "使用狀態", "使用資料", "QualityLV"]

// 統計頁面設定
function updateAnalysisList() {
    const $anaFieldList = $('#anaFieldList');
    const $anaSelList = $('#anaSelList');
    $anaFieldList.empty();
    $anaSelList.empty();
    Object.keys(filteredProps[0]).forEach(key => {
        if (countableTypes.includes(key)) {
            $anaFieldList.append($('<li class="panelResult anaField"></li>').text(key));
        }
    });
    $anaFieldList.off('click', '.anaField').on('click', '.anaField', function () {
        $anaSelList.append($('<li class="panelResult anaSelect"></li>').text($(this).text()));
        $(this).remove();
    });
    $anaSelList.off('click', '.anaSelect').on('click', '.anaSelect', function () {
        $anaFieldList.append($('<li class="panelResult anaField"></li>').text($(this).text()));
        $(this).remove();  // This should work to remove the clicked element
    });
    $('#anaAll').on('click', function () {
        const isChecked = $(this).is(':checked');
        $('.anaI').prop('checked', isChecked);
    });

    $('#anaGoResult').on('click', function () {
        let statistList = [];
        let $anaBody = $('#anaBody');
        let $anaHeader = $('#anaHdr');
        $anaHeader.empty();
        $anaHeader.append('<td class="col-3">目標欄位</td>');

        // Append the remaining headers, which will be evenly spaced
        $('.anaI:checked').each(function () {
            const label = $(`label[for="${$(this).attr('id')}"]`).text();
            $anaHeader.append(`<td class="col-2">${label}</td>`);
            statistList.push(label);
        });

        $anaBody.empty();
        $('#anaSelList .anaSelect').each(function () {
            const name = $(this).text();
            
            let $rowItem = `<td>${name}</td>`;
            statistList.forEach(function (statist) {
                $rowItem += `<td>${calculate(name, statist)}</td>`;
            });
            let $row = `<tr>${$rowItem}</tr>`;
            $anaBody.append($row);
        });
        $('#anaResultDiv').css('display', 'block');
    })

    $('#exportExcel2').on('click', function () {
        var $propResult = $('#propAnaResult');
        const worksheet = XLSX.utils.table_to_book($propResult[0], { sheet: "Sheet1" });

        XLSX.writeFile(worksheet, `屬性統計.xlsx`);
    });
}
function calculate(field, statist) {
    let ret = 0;

    if (statist == "加總") {
        // Sum all values of the specified field
        filteredProps.forEach(function (prop) {
            ret += prop[field];
        });
    }

    if (statist == "最大值") {
        // Find the maximum value of the specified field
        ret = filteredProps.reduce((max, prop) => {
            return prop[field] > max ? prop[field] : max;
        }, Number.NEGATIVE_INFINITY);
    }

    if (statist == "最小值") {
        // Find the minimum value of the specified field
        ret = filteredProps.reduce((min, prop) => {
            return prop[field] < min ? prop[field] : min;
        }, Number.POSITIVE_INFINITY);
    }

    if (statist == "平均") {
        // Calculate the average value of the specified field
        let sum = 0;
        filteredProps.forEach(function (prop) {
            sum += prop[field];
        });
        ret = filteredProps.length > 0 ? sum / filteredProps.length : 0;
    }

    return parseFloat(ret.toFixed(3));
}
function updatePropTable() {
    const totalPages = Math.ceil(filteredProps.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProps.length);
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
function renderTableBody(pageData) {
    const $propTbody = $('#propTbody');
    $propTbody.empty();

    $indexMap = getIndexMap();
    pageData.forEach(item => {
        const tableRow = $('<tr></tr>');
        const button = $('<button>目標</button>').on('click', function () {
            highlightMapFeature(item, $indexMap);
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
// 物件標記
function highlightMapFeature(item) {
    try {
        if (item['Instance'] instanceof L.Marker) {
            markerHighlight(item['Instance']);
        } else if (item['Instance'] instanceof L.Polyline) {
            lineHighlight(item['Instance']);
        }
    } catch (e) {
        console.log("error:", e);
    } finally {
        $indexMap.setView(item["座標"], 30);
        item['Instance'].openPopup();
    }
}

function markerHighlight(marker) {
    console.log('click Marker');
    const latLng = marker.getLatLng();

    if (highlightRectangle) {
        $indexMap.removeLayer(highlightRectangle);
    }
    const bounds = [[latLng.lat - 0.00002, latLng.lng - 0.00002], [latLng.lat + 0.00002, latLng.lng + 0.00002]];
    highlightRectangle = L.rectangle(bounds, {
        color: "#ff7800",
        weight: 1,
        fillOpacity: 0.3
    }).addTo($indexMap);
}

function lineHighlight(polyline) {
    console.log('click Line');
    if (highlightedLine) {
        $indexMap.removeLayer(highlightedLine);
    }

    highlightedLine = L.polyline(polyline.getLatLngs(), {
        color: 'white',
        weight: polyline.options.weight + 2,
        opacity: 0.8
    }).addTo($indexMap);
}

// 設定地圖點擊事件處理，取消顯示
function setupMapClickHandler() {
    $indexMap = getIndexMap();
    $indexMap.on('click', function () {
        if (highlightRectangle) {
            $indexMap.removeLayer(highlightRectangle);
            highlightRectangle = null;
        }
        if(highlightedLine) {
            $indexMap.removeLayer(highlightedLine);
            highlightedLine = null;
        }
    });
}