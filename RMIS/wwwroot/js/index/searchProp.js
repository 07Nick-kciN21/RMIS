import { layerProps } from './layers.js'

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
            }
            else {
                $('#prop2').css('display', 'block');
                $('#prop1').css('display', 'none');
            }
        });
        $('#pFeatSelect').on('change', function () {
            var selectedId = $(this).val();
            if (selectedId != -1) {
                var props = layerProps[selectedId];
                // 初始化一個字典
                var propsDict = {};
                // 逐一遍歷每個 prop 並轉換為 JSON
                props.forEach(function (prop, index) {
                    // 將每個 prop 字串轉換為 JSON
                    props[index] = JSON.parse(prop.replace(/NaN/g, 'null'));
                    for (var key in props[index]) {
                        if (props[index].hasOwnProperty(key) && key != '備註') {
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
                    lang: {
                        "add_rule": "添加規則",
                        "add_group": "添加組",
                        "delete_rule": "刪除規則",
                        "delete_group": "刪除組",
                        "operators": {
                            "equal": "等於",
                            "not_equal": "不等於",
                            "in": "在列表中",
                            "not_in": "不在列表中",
                            "less": "小於",
                            "less_or_equal": "小於或等於",
                            "greater": "大於",
                            "greater_or_equal": "大於或等於",
                            "between": "在兩者之間",
                            "not_between": "不在兩者之間",
                            "begins_with": "開始於",
                            "not_begins_with": "不開始於",
                            "contains": "包含",
                            "not_contains": "不包含",
                            "ends_with": "結束於",
                            "not_ends_with": "不結束於",
                            "is_empty": "為空",
                            "is_not_empty": "不為空",
                            "is_null": "為空值",
                            "is_not_null": "不為空值"
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
                // 檢查結果
                $('#propGoFilter').on('click', function () {
                    var result = $('#propQuery').queryBuilder('getRules');
                    console.log(result);
                })
            }
        });
    });
}

function selectProps() {

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