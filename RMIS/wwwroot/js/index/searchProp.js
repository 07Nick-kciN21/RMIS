import { layerProps } from './layers.js'
import { getIndexMap } from './map.js'
let props;
let currentPage = 1;
let filteredProps = [];
let pageSize = 10;
let last_item;
let originalColor;
export function initSearchPropPanel() {
    $(document).ready(function () {
        const observerConfig = { childList: true, subtree: true };
        const callback = function (mutationsList, observer) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // 當 .layerBar 有變動時，呼叫 updateSelect
                    updateSelect('#pFeatSelect');
                    updateSelect('#gFeatSelect');
                }
            }
        };

        // 觀察包含 .layerBar 的容器
        const layerContainer = $('#layerBarContainer')[0]; // 假設 #layerContainer 是包含 .layerBar 的容器
        const observer = new MutationObserver(callback);
        if (layerContainer) {
            observer.observe(layerContainer, observerConfig);
        }

        $('input[name="btnradio"]').on('change', function () {
            if ($(this).next('label').text() == '依屬性') {
                $('#prop1').css('display', 'block');
                $('#prop2').css('display', 'none');
                $('#prop3').css('display', 'none');
            }
            else if ($(this).next('label').text() == '依空間') {
                $('#prop2').css('display', 'block');
                $('#prop1').css('display', 'none');
                $('#prop3').css('display', 'none');
            }
            else if ($(this).next('label').text() == '結果') {
                $('#prop3').css('display', 'block');
                $('#prop1').css('display', 'none');
                $('#prop2').css('display', 'none');
            }
        });
        $('#pFeatSelect').on('change', function () {
            // 銷毀現有的 queryBuilder 以便重新初始化
            if ($('#propQuery').data('queryBuilder')) {
                $('#propQuery').queryBuilder('destroy');
            }
            $('#propResultLayer').text($(this).find('option:selected').text());
            var selectedId = $(this).val();

            if (selectedId == -1) {
                return;
            }
            updatePropQuery(selectedId);
        });

        $('#propGoFilter').on('click', function () {
            var result = $('#propQuery').queryBuilder('getRules');
            if (!result || !result.rules.length) {
                console.error("No valid rules found.");
                return;
            }

            last_item = null;
            originalColor = null;

            pageSize = 10;
            currentPage = 1;

            // 過濾 props
            filteredProps = filterPropsByRules(props, result);
            $('#totalCount').text(`(總數:${filteredProps.length})`);
            updatePropTable();
            // 將 btnradio3 的 label 標籤設置為可見
            $('label[for="btnradio3"]').css('visibility', 'visible');
        });

        $('#propClear').on('click', function () {
            $('label[for="btnradio3"]').css('visibility', 'hidden');
            $('#pFeatSelect').val('-1').trigger('change');
        });

        $('#exportExcel').on('click', function () {
            // 創建一個工作表（Sheet），將 props 數據轉換為 Excel 支持的格式
            var worksheet = XLSX.utils.json_to_sheet(props);

            // 創建一個工作簿（Workbook）
            var workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Props Data");

            // 導出為 Excel 文件
            XLSX.writeFile(workbook, "props_data.xlsx");
        });

        $('#pageSize').on('change', function () {
            pageSize = $(this).find('option:selected').text();
            currentPage = 1;
            updatePropTable();
            console.log($(this).find('option:selected').text());
        })
    });
}

// 定義一個函數來檢查單個對象是否符合所有規則
function filterPropsByRules(props, rules) {
    return props.filter(item => {
        return evaluateRules(item, rules);
    });
}
// 遞歸評估每個規則
function evaluateRules(item, rules) {
    if (rules.condition) {
        // 如果是組合規則 (condition 為 AND 或 OR)
        return rules.rules.reduce((acc, rule) => {
            if (rules.condition === 'AND') {
                return acc && evaluateRules(item, rule);
            } else if (rules.condition === 'OR') {
                return acc || evaluateRules(item, rule);
            }
            return acc;
        }, rules.condition === 'AND');
    } else {
        // 單個規則的處理
        let { field, operator, value } = rules;
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
}
function updateSelect(featSelect) {
    var $propSelect = $(featSelect);
    $propSelect.empty();
    $propSelect.append($("<option></option>").val(-1).text("請選擇圖層"));
    $('.layerBar').each(function () {
        var name = $(this).find('.layerName')
        var value = $(this).attr('id').replace('layerBar_', '');
        console.log($(this).find('.layerName').text().trim());
        $propSelect.append($("<option></option>").val(value).text(name.text().trim()));
    });
}
function updatePropQuery(selectedId) {
    props = layerProps[selectedId];
    // 初始化一個字典
    var propsDict = {};

    props.forEach(function (prop, index) {
        // 將每個 prop 字串轉換為 JSON
        for (var key in props[index]) {
            if (props[index].hasOwnProperty(key) && key != '備註' && key != '座標') {
                if (key === "設置日期") {
                    var timestamp = prop[key];
                    if (timestamp) {
                        var date = new Date(timestamp);
                        var formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                        prop[key] = formattedDate;
                    }
                }
                // 如果字典中還沒有該欄位，初始化為空陣列
                if (!propsDict[key]) {
                    propsDict[key] = [];
                }
                // 如果該值還不存在於陣列中，則推入陣列
                if (!propsDict[key].includes(props[index][key])) {
                    propsDict[key].push(props[index][key]);
                }
            }
        }
    });
    // 將 propsDict 轉換為 jQuery QueryBuilder 的 filter 格式
    var filters = Object.keys(propsDict).map(function (key) {
        var sortedValues = propsDict[key].sort();
        // 根據值的第一個項目決定類型（假設所有值的類型一致）
        var type = typeof sortedValues[0] === 'number' ? 'integer' : 'string';
        return {
            id: key,
            label: key,
            type: type,
            input: 'select',  // 假設使用 select 選單
            values: sortedValues.reduce((acc, val) => {
                acc[val] = val;  // 建立 {value: label} 的對應關係
                return acc;
            }, {})
        };
    });

    $('#propQuery').queryBuilder({
        filters: filters,
        operators: ['equal', 'not_equal', 'less', 'greater'],
        lang: {
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
        }
    });
}
function updatePropTable() {
    // 計算分頁
    const totalPages = Math.ceil(filteredProps.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProps.length);
    const pageData = filteredProps.slice(startIndex, endIndex);

    var $propThead = $('#propThead');
    $propThead.empty();

    var headRow = $("<tr></tr>");
    headRow.append($('<th></th>'));
    Object.keys(pageData[0]).map(function (key) {
        if (key != "座標") {
            headRow.append($('<th></th>').text(key));
        }
    });
    $propThead.append(headRow);

    var $propTbody = $('#propTbody');
    $propTbody.empty();

    var $indexMap = getIndexMap();
    pageData.forEach(function (item) {
        var tableRow = $("<tr></tr>");

        // 創建一個按鈕，並添加點擊事件
        var button = $("<button>目標</button>").on("click", function () {
            try {
                if (last_item != null) {
                    last_item.setStyle({
                        color: originalColor
                    });
                    console.log("reset color");
                }

                // Store the current color of the marker before changing it to white
                originalColor = item['marker'].options.color;

                item['marker'].setStyle({
                    color: 'white'
                });
                last_item = item['marker'];
            }
            finally {
                $indexMap.setView(item["座標"], 30);
                console.log(item["座標"]);
                item['marker'].openPopup();
            }
        });

        // 將按鈕放入 td 中，並添加到表格行
        tableRow.append($("<td></td>").append(button));

        for (var key in item) {
            if (item.hasOwnProperty(key) && key != "座標") {
                tableRow.append($("<td></td>").text(item[key]));
            }
        }
        $propTbody.append(tableRow);
    });

    updatePropPages(totalPages);
}
function updatePropPages(totalPages) {
    var $pagination = $('#propPages');
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