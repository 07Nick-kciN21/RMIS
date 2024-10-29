// Import required modules
import { layerProps } from './layers.js';
import { getIndexMap } from './map.js';

// Global variables
let props;
let currentPage = 1;
let filteredProps = [];
let pageSize = 10;
let highlightRectangle = null;
let highlightedLine = null; // 用於保存新增的高亮線
export function initSearchPropPanel() {
    $(document).ready(function () {
        observeLayerBarChanges();
        setupRadioButtonHandlers();
        setupSelectChangeHandlers();
        setupFilterAndClearHandlers();
        setupExportHandlers();
        setupPaginationHandlers();
        setupMapClickHandler();
    });
}

// 監聽 layerBarContainer 的變動來更新下拉選單
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

// 設定選擇變更事件的處理程序
function setupSelectChangeHandlers() {
    $('#pFeatSelect').on('change', function () {
        console.log('pFeatSelect change');
        if ($('#propQuery').data('queryBuilder')) {
            $('#propQuery').queryBuilder('destroy');
        }
        $('#propResultLayer').text($(this).find('option:selected').text());
        const selectedId = $(this).val();

        if (selectedId == -1) {
            return;
        }
        updatePropQuery(selectedId);
    });
}

function setupFilterAndClearHandlers() {
    $('#propGoFilter').on('click', function () {
        const result = $('#propQuery').queryBuilder('getRules');
        if (!result || !result.rules.length) {
            console.error("No valid rules found.");
            return;
        }

        resetHighlight();

        filteredProps = filterPropsByRules(props, result);
        $('#totalCount').text(`(總數:${filteredProps.length})`);
        updatePropTable();
        $('label[for="btnradio3"]').css('visibility', 'visible');
    });

    $('#propClear').on('click', function () {
        $('label[for="btnradio3"]').css('visibility', 'hidden');
        $('#pFeatSelect').val('-1').trigger('change');
    });
}

// Setup handlers for exporting data
function setupExportHandlers() {
    $('#exportExcel').on('click', function () {
        const worksheet = XLSX.utils.json_to_sheet(props);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Props Data");
        XLSX.writeFile(workbook, "props_data.xlsx");
    });
}

// Setup handlers for pagination
function setupPaginationHandlers() {
    $('#pageSize').on('change', function () {
        pageSize = parseInt($(this).find('option:selected').text(), 10);
        currentPage = 1;
        updatePropTable();
    });
}

// Filter properties based on rules
function filterPropsByRules(props, rules) {
    return props.filter(item => evaluateRules(item, rules));
}

// Recursively evaluate each rule
function evaluateRules(item, rules) {
    if (!item['Instance']) {
        return false;
    }
    if (rules.condition) {
        return rules.rules.reduce((acc, rule) => {
            return rules.condition === 'AND' ? acc && evaluateRules(item, rule) : acc || evaluateRules(item, rule);
        }, rules.condition === 'AND');
    } else {
        return evaluateSingleRule(item, rules);
    }
}

// Evaluate a single rule
function evaluateSingleRule(item, rule) {
    const { field, operator, value } = rule;
    switch (operator) {
        case 'equal':
            return item[field] == value;
        case 'not_equal':
            return item[field] != value;
        case 'less':
            return item[field] < value;
        case 'greater':
            return item[field] > value;
        case 'in':
            return value.includes(item[field]);
        case 'not_in':
            return !value.includes(item[field]);
        default:
            return false;
    }
}

// Update dropdown options
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

// Update property query builder
function updatePropQuery(selectedId) {
    props = layerProps[selectedId];
    const propsDict = buildPropsDict(props);
    const filters = buildQueryFilters(propsDict);

    $('#propQuery').queryBuilder({
        filters: filters,
        operators: ['equal', 'not_equal', 'less', 'greater'],
        lang: getQueryBuilderLang()
    });
}

// Build a dictionary of property values
function buildPropsDict(props) {
    const propsDict = {};
    props.forEach(prop => {
        for (const key in prop) {
            if (prop.hasOwnProperty(key) && key !== '備註' && key !== '座標') {
                if (key === "設置日期") {
                    prop[key] = formatTimestamp(prop[key]);
                }
                if (!propsDict[key]) {
                    propsDict[key] = [];
                }
                if (!propsDict[key].includes(prop[key])) {
                    propsDict[key].push(prop[key]);
                }
            }
        }
    });
    return propsDict;
}

// Build filters for the query builder
function buildQueryFilters(propsDict) {
    return Object.keys(propsDict).map(key => {
        const sortedValues = propsDict[key].sort();
        const type = typeof sortedValues[0] === 'number' ? 'integer' : 'string';
        return {
            id: key,
            label: key,
            type: type,
            input: 'select',
            values: sortedValues.reduce((acc, val) => {
                acc[val] = val;
                return acc;
            }, {})
        };
    });
}

// Format timestamp to yyyy/mm/dd
function formatTimestamp(timestamp) {
    if (!timestamp) return timestamp;
    const date = new Date(timestamp);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

// Get language settings for query builder
function getQueryBuilderLang() {
    return {
        "add_rule": "添加規則",
        "add_group": "添加組",
        "delete_rule": "刪除規則",
        "delete_group": "刪除組",
        "operators": {
            "equal": "=",
            "not_equal": "!=",
            "less": "<",
            "greater": ">"
        },
        "errors": {
            "no_filter": "沒有選擇過濾器",
            "empty_group": "組是空的",
            "radio_empty": "未選擇值",
            "checkbox_empty": "未選擇值",
            "select_empty": "未選擇值",
            "string_empty": "未填寫文字",
            "string_exceed_min_length": "少於最小字數限制",
            "string_exceed_max_length": "超過最大字數限制",
            "string_invalid_format": "無效的格式",
            "number_nan": "不是數字",
            "number_not_integer": "不是整數",
            "number_not_double": "不是浮點數",
            "datetime_empty": "日期時間為空",
            "datetime_invalid": "無效的日期時間",
            "boolean_not_valid": "不是布林值",
            "operator_not_multiple": "運算符不接受多個值"
        }
    };
}

// Update the properties table
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

// Render table body
function renderTableBody(pageData) {
    const $propTbody = $('#propTbody');
    $propTbody.empty();

    const $indexMap = getIndexMap();
    pageData.forEach(item => {
        const tableRow = $('<tr></tr>');
        const button = $('<button>目標</button>').on('click', () => highlightMapFeature(item, $indexMap));
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
function highlightMapFeature(item, $indexMap) {
    try {
        if (item['Instance'] instanceof L.Marker) {
            markerHighlight($indexMap, item['Instance']);
        } else if (item['Instance'] instanceof L.Polyline) {
            lineHighlight($indexMap, item['Instance']);
        }
    } catch (e) {
        console.log("error:", e);
    } finally {
        $indexMap.setView(item["座標"], 30);
        item['Instance'].openPopup();
    }
}

function markerHighlight($indexMap, marker) {
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

function lineHighlight($indexMap, polyline) {
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
    const $indexMap = getIndexMap();
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

function resetHighlight() {
    pageSize = 10;
    currentPage = 1;
}
