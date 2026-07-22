// Import required modules
import { loadLayerProps } from '../ctrlMap/layers.js';
import { Map } from '../map_test.js';
import { updatePropQuery, filterPropsByRules, parseRules } from './propQueryBuilder.js';
import { handleDrawShape, filterPropsByShape, clearShape, getShape } from './shapeSearch.js';
import { showLoading, hideLoading } from '../../loading.js';
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

// 切換管理
function setupRadioButtonHandlers() {
    $('input[name="propradio"]').on('change', function () {
        $('input[name="propradio"]').each(function () {
            $(this).next('label').removeClass('select');
        });
        $(this).next('label').addClass('select');

        const selectedLabel = $(this).next('label').text();
        $('#prop1, #prop2, #prop3, #prop4').css('display', 'none');

        if (selectedLabel === '依屬性') {
            $('#prop1').css('display', 'block');
        } else if (selectedLabel === '依空間') {
            $('#prop2').css('display', 'block');
        } else if (selectedLabel === '結果') {
            $('#prop3').css('display', 'block');
        } else if (selectedLabel === '統計') {
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
        showLoading('圖層資料載入中...', '#searchPropPanel');
        loadLayerProps(pselectedId)
            .then(function (result) {
                props = result;
                updatePropQuery(props);
            })
            .catch(function (err) {
                console.error('載入圖層屬性失敗', err);
                alert('載入圖層屬性失敗，請稍後再試');
            })
            .finally(function () {
                hideLoading('#searchPropPanel');
            });
    });

    // 依圖形塗層選擇
    $('#gFeatSelect').on('change', function () {
        gselectedId = $(this).val();
        if (gselectedId == -1) {
            $('label[for="propradio3"]').css('visibility', 'hidden');
            $('label[for="propradio4"]').css('visibility', 'hidden');
            $('#shapeGroup').addClass('hide');
            return;
        }
        showLoading('圖層資料載入中...', '#searchPropPanel');
        loadLayerProps(gselectedId)
            .then(function (result) {
                props = result;
                // 選擇後顯示圖形選項
                $('#shapeGroup').removeClass('hide');
                // 開始繪圖
                handleDrawShape($indexMap, gselectedId);
            })
            .catch(function (err) {
                console.error('載入圖層屬性失敗', err);
                alert('載入圖層屬性失敗，請稍後再試');
            })
            .finally(function () {
                hideLoading('#searchPropPanel');
            });
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
        console.log(props, result);
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
        $('label[for="propradio3"]').css('visibility', 'visible');
        $('label[for="propradio4"]').css('visibility', 'visible');
    });
    $('#propClear').on('click', function () {
        $('label[for="propradio3"]').css('visibility', 'hidden');
        $('label[for="propradio4"]').css('visibility', 'hidden');
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
                $('label[for="propradio3"]').css('visibility', 'visible');
                $('label[for="propradio4"]').css('visibility', 'visible');
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
    $('#propPageSize').on('change', function () {
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

const countablePoint = ["作業區分", "設施長度", "孔蓋種類", "尺寸單位", "蓋部寬度", "蓋部長度", "地盤高", "孔深", "孔蓋型態", "設施寬度", "設施高度", "設施型態", "使用狀態", "使用資料", "QualityLV"];
const countableLine = [ "管徑寬度", "管徑高度", "涵管條數", "管線長度", "管線型態", "使用狀態", " 資料狀態", "起點埋設深度", "終點埋設深度", "前一次Status_XY"];
const countablePlane = ["段號", "地號", "子地號", "開闢年度", "公園面積", "地籍面積", "Shape.STArea()", "Shape.STLength()"];
// 合併 三個陣列
const countableTypes = countablePoint.concat(countableLine, countablePlane);

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
        // $anaFieldList.append($('<li class="panelResult anaField"></li>').text(key));
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
        if (key !== "座標" && key !== 'Instance' && key !== 'AreaId' && key !== 'Kind') {
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

    $indexMap = Map.getIndexMap();
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
            if (key !== "座標" && key !== 'Instance' && key !== 'AreaId' && key !== 'Kind') {
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
    if (item['Instance'] instanceof L.Marker || item['Instance'] instanceof L.CircleMarker) {
        markerHighlight(item['Instance']);
        $indexMap.setView(item["座標"], 19);
        return;
    }
    if (item['Instance'] instanceof L.Polygon) {
        polygonHighlight(item['Instance']);
        $indexMap.setView(item["座標"], 19);
        return;
    }
    if (item['Instance'] instanceof L.Polyline) {
        lineHighlight(item['Instance']);
        $indexMap.setView(item["座標"], 19);
        return;
    }
    // line/plane：向後端要該 Area 完整座標畫出整條線/整個面（多筆結果可能同屬一個 Area，仍照各自座標置中）
    if ((item['Kind'] === 'line' || item['Kind'] === 'arrowline' || item['Kind'] === 'plane') && item['AreaId'] != null) {
        highlightByAreaId(item['AreaId'], item['Kind']);
    }
    // point（或無法辨識種類）：每一列本來就有自己的座標，不需要問後端，直接用自己的座標畫框
    else if (item['座標']) {
        if (highlightRectangle) { $indexMap.removeLayer(highlightRectangle); highlightRectangle = null; }
        if (highlightedLine) { $indexMap.removeLayer(highlightedLine); highlightedLine = null; }
        highlightRectangle = drawHighlightFrame(L.latLng(item['座標'][0], item['座標'][1]), 30);
    }
    $indexMap.setView(item["座標"], 19);
}

// line/plane：用 AreaId 向後端要該 Area 完整座標序列，畫出整條線/整個面（僅負責畫形狀，置中已由呼叫端處理）
function highlightByAreaId(areaId, kind) {
    $.ajax({
        url: `/api/MapAPI/GetPointsbyLayerId?AreaId=${areaId}`,
        method: 'POST'
    }).then(function (result) {
        const latlngs = (result.points || []).map(p => [p.latitude, p.longitude]);
        if (latlngs.length === 0) return;

        if (highlightRectangle) { $indexMap.removeLayer(highlightRectangle); highlightRectangle = null; }
        if (highlightedLine) { $indexMap.removeLayer(highlightedLine); highlightedLine = null; }

        if (kind === 'plane' && latlngs.length >= 3) {
            ensureHighlightPane();
            highlightRectangle = L.polygon(latlngs, {
                color: '#ff7800',
                weight: 2,
                fillColor: '#ff7800',
                fillOpacity: 0.4,
                interactive: false,
                pane: 'searchHighlightPane'
            }).addTo($indexMap);
        } else if ((kind === 'line' || kind === 'arrowline') && latlngs.length >= 2) {
            ensureHighlightPane();
            highlightedLine = L.polyline(latlngs, {
                color: 'white',
                weight: 6,
                opacity: 0.9,
                interactive: false,
                pane: 'searchHighlightPane'
            }).addTo($indexMap);
        }
    }).catch(function (err) {
        console.error('取得 Area 座標失敗', err);
    });
}

// 確保有一個專用的高亮 pane，z-index 高於預設的 markerPane(600)/overlayPane(400)，
// 避免高亮標示跟原本的點位在不同 pane 排序時被蓋住
function ensureHighlightPane() {
    if (!$indexMap.getPane('searchHighlightPane')) {
        const pane = $indexMap.createPane('searchHighlightPane');
        pane.style.zIndex = 700;
        pane.style.pointerEvents = 'none';
    }
}

// 畫一個橘色框線標示（純座標+尺寸，不需要實際的 marker 物件）
// line 用 L.polyline（SVG 向量圖層）在同一個 searchHighlightPane 裡已證實能正常顯示，
// 改用同樣是向量圖層的 L.circleMarker，而不是 L.marker+divIcon（HTML 圖示，實測不會顯示）
function drawHighlightFrame(latLng, size) {
    ensureHighlightPane();
    const layer = L.circleMarker(latLng, {
        radius: size / 2,
        color: '#ff7800',
        weight: 3,
        fill: false,
        interactive: false,
        pane: 'searchHighlightPane'
    }).addTo($indexMap);

    // 除錯用：暴露到 window，方便在 Console 用 hasLayer()/outerHTML 直接確認，不受物件複製貼上失真影響
    window.__debugMap = $indexMap;
    window.__debugHighlight = layer;

    return layer;
}

// 產生選中標示：不管有沒有圖示，統一用橘色框線標示
function markerHighlight(marker) {
    const latLng = marker.getLatLng();

    if (highlightRectangle) {
        $indexMap.removeLayer(highlightRectangle);
        highlightRectangle = null;
    }

    let size = 30;
    if (marker instanceof L.Marker) {
        const icon = marker.getIcon();
        size = (icon && icon.options && icon.options.iconSize && icon.options.iconSize[0]) || 30;
    } else {
        size = ((marker.options.radius || 6) * 2) + 8;
    }

    highlightRectangle = drawHighlightFrame(latLng, size);
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

function polygonHighlight(polygon) {
    console.log('click Polygon');
    if (highlightRectangle) {
        $indexMap.removeLayer(highlightRectangle);
    }
    // 從原本的顏色取得反色
    const color = polygon.options.fillColor;
    const inverseColor = getInverseColor(color);
    // 高亮多邊形
    highlightRectangle = L.polygon(polygon.getLatLngs(), {
        color: inverseColor,
        weight: 2,
        fillColor: inverseColor,
        fillOpacity: 0.5
    }).addTo($indexMap);
}

function getInverseColor(color) {
    if (!color.startsWith("#")) return "#FFFFFF"; // 預設為白色

    const hex = color.replace("#", "");
    const r = 255 - parseInt(hex.substring(0, 2), 16);
    const g = 255 - parseInt(hex.substring(2, 4), 16);
    const b = 255 - parseInt(hex.substring(4, 6), 16);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

// 設定地圖點擊事件處理，取消顯示
function setupMapClickHandler() {
    $indexMap = Map.getIndexMap();
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
