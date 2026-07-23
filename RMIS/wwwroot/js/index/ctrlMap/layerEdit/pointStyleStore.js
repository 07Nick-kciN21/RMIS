// 記錄各 point 圖層目前生效的「圖徽樣式規則」，讓 viewport 重新載入 marker 時可以重放，
// 避免移動地圖觸發 _loadViewportPoints 重新建立 marker 後，編輯過的圖徽被伺服器預設樣式蓋掉。
const _pointStyleRules = {}; // layerId -> rule

export function setPointStyleRule(layerId, rule) {
    _pointStyleRules[layerId] = rule;
}

export function getPointStyleRule(layerId) {
    return _pointStyleRules[layerId];
}

// 依規則與屬性資料算出填色；rule.symClass === 2 時若找不到對應分類則回傳 null（維持原樣式）
export function resolvePointColor(rule, props) {
    if (rule.symClass === 1) {
        const value = props ? parseFloat(props[rule.field]) : NaN;
        const levelIndex = isNaN(value)
            ? rule.levels - 1
            : Math.min(rule.levels - 1, Math.floor((value - rule.minValue) / rule.rangeSize));
        return rule.colorSet[levelIndex];
    }
    if (rule.symClass === 2) {
        const value = props ? props[rule.field] : undefined;
        const levelIndex = rule.fields.indexOf(value);
        return levelIndex === -1 ? null : rule.colorSet[levelIndex];
    }
    return rule.fillColor;
}
