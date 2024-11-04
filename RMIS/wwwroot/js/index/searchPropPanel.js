// Import required modules
import { layerProps } from './layers.js';
import { getIndexMap } from './map.js';
import { updatePropQuery, filterPropsByRules } from './propQueryBuilder.js';
import { handleDrawShape, filterPropsByShape, clearShape } from './shapeSearch.js';
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
        initProp1();
        initProp2();
        initProp3();
    });
}

function initProp1() {
    
    setupSelectChangeHandlers();
    setupFilterAndClearHandlers();
}

function initProp2() {
}

function initProp3() {
    setupExportHandlers();
    setupPaginationHandlers();
    setupMapClickHandler();
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
        $('#prop1, #prop2, #prop3').css('display', 'none');

        if (selectedLabel === '依屬性') {
            $('#prop1').css('display', 'block');
        } else if (selectedLabel === '依空間') {
            $('#prop2').css('display', 'block');
        } else if (selectedLabel === '結果') {
            $('#prop3').css('display', 'block');
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
        resetResult();
        $('#propResultLayer').text($('#pFeatSelect').find('option:selected').text());
        filteredProps = filterPropsByRules(props, result);
        $('#totalCount').text(`(總數:${filteredProps.length})`);
        updatePropTable();
        $('label[for="btnradio3"]').css('visibility', 'visible');
    });
    $('#propClear').on('click', function () {
        $('label[for="btnradio3"]').css('visibility', 'hidden');
        $('#pFeatSelect').val('-1').trigger('change');
    });

    $('#geoGoFilter').on('click', function () {
        $('#propResultLayer').text($('#gFeatSelect').find('option:selected').text());
        const filteredPropsbyShape = filterPropsByShape(gselectedId);
        filteredPropsbyShape.then((value) => {
            if (value.length == 0) {
                alert("no filteredProps");
                return;
            }
            else {
                filteredProps = value;
                updatePropTable();
                $('#totalCount').text(`(總數:${filteredProps.length})`);
                $('label[for="btnradio3"]').css('visibility', 'visible');
            }
        });
    });
    $('#geoClear').on('click', function () {
        clearShape($indexMap);
    });
}
// 匯出excel
function setupExportHandlers() {
    $('#exportExcel').on('click', function () {
        console.log(filteredProps);
        const filteredPropsWithoutFields = filteredProps.map(({ Instance, 座標, ...rest }) => rest);

        const worksheet = XLSX.utils.json_to_sheet(filteredPropsWithoutFields);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Props Data");
        XLSX.writeFile(workbook, "props_data.xlsx");
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

// 結果分頁設定
function updatePropTable() {
    const totalPages = Math.ceil(filteredProps.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProps.length);
    const pageData = filteredProps.slice(startIndex, endIndex);

    renderTableHeaders(pageData);
    renderTableBody(pageData);
    updatePagination(totalPages);
}

// Render table headers
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
// Render table body
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

// Highlight feature on the map
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

// 設定地圖點擊事件處理程序，用於取消高亮顯示
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

function resetResult() {
    pageSize = 10;
    currentPage = 1;
}