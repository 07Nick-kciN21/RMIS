// 建立queryBuild
export function updatePropQuery(props) {
    // 清除前一次的狀態（可能是舊的 queryBuilder 實例，也可能是「無可查詢屬性」的提示文字）
    if ($('#propQuery').data('queryBuilder')) {
        $('#propQuery').queryBuilder('destroy');
    }
    $('#propQuery').empty();

    const propsDict = buildPropsDict(props || []);
    const filters = buildQueryFilters(propsDict);

    if (filters.length === 0) {
        $('#propQuery').text('此圖層無可查詢的屬性資料');
        return;
    }

    $('#propQuery').queryBuilder({
        filters: filters,
        operators: ['equal', 'not_equal', 'less', 'greater'],
        lang: getQueryBuilderLang()
    });
}

// 分類屬性資料（用 Set 避免 O(n²) includes 導致卡死）
function buildPropsDict(props) {
    function formatTimestamp(timestamp) {
        if (!timestamp) return timestamp;
        const date = new Date(timestamp);
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    }
    const setDict = {};
    props.forEach(prop => {
        for (const key in prop) {
            if (!prop.hasOwnProperty(key) || key === '備註' || key === '座標' || key === 'Instance' || key === 'AreaId' || key === 'Kind') continue;
            if (key === '設置日期') prop[key] = formatTimestamp(prop[key]);
            if (!setDict[key]) setDict[key] = new Set();
            setDict[key].add(prop[key]);
        }
    });
    // Set → sorted array
    const propsDict = {};
    for (const key in setDict) {
        propsDict[key] = [...setDict[key]].sort();
    }
    return propsDict;
}

// Build filters for the query builder
function buildQueryFilters(propsDict) {
    return Object.keys(propsDict).map(key => {
        const sortedValues = propsDict[key]; // buildPropsDict 已排序
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
// 設置QueryBuilder中文
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
// 過濾資料
export function filterPropsByRules(props, rules) {
    return props.filter(item => evaluateRules(item, rules));
}

// 條件式轉換
function evaluateRules(item, rules) {
    if (rules.condition) {
        return rules.rules.reduce((acc, rule) => {
            return rules.condition === 'AND' ? acc && evaluateRules(item, rule) : acc || evaluateRules(item, rule);
        }, rules.condition === 'AND');
    } else {
        return evaluateSingleRule(item, rules);
    }
}
// 過濾到最後一層篩選資料
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

export function parseRules(rules) {
    if (!rules) return '';

    let condition = rules.condition.toUpperCase(); // AND / OR
    let parts = [];

    rules.rules.forEach(rule => {
        if (rule.rules) {
            parts.push('(' + parseRules(rule) + ')');
        } else {
            var op = rule.operator;
            if (op == 'equal') {
                parts.push(rule.field + ' = ' + rule.value);
            }
            else if (op == 'not_equal') {
                parts.push(rule.field + ' != ' + rule.value);
            }
            else if (op == 'less 0') {
                parts.push(rule.field + ' < ' + rule.value);
            }
            else {
                parts.push(rule.field + ' > ' + rule.value);
            }
        }
    });

    return parts.join(' ' + condition + ' ');
}