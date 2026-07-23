import {layers, loadLayerProps} from '../layers.js';

// VectorGrid 1.3.0 沒有 setStyle，直接更新 options 再 redraw
function _vtSetStyle(layer, style) {
    layer.options.vectorTileLayerStyles = style;
    layer.redraw();
}

var pointStep1 = `
        <h5 class="offcanvas-title">編輯圖徽 - 編輯類型</h5>
        <div id="editStep1">
            <div id="planeEdit0" class="symbolClass pSymbol0" data-symclass="0">
                <div class="symbolText">面符號</div>
            </div>
            <div id="planeEdit1" class="symbolClass pSymbol1" data-symclass="1">
                <div class="symbolText">依分級</div>
            </div>
            <div id="planeEdit2" class="symbolClass pSymbol2" data-symclass="2">
                <div class="symbolText">依類型</div>
            </div>
        </div>
        <div class="form-group" style="clear:both;">
            <button class="btn js-modal-toggle editCancel">取消</button>
            <button class="btn js-modal-toggle" id="editNext">下一步</button>
        </div>`;
let idList;
let name;
export function planeEdit(id, pipeName, layersId){
    console.log("lineEdit");
    idList = layersId;
    name = pipeName;
    console.log("pointEdit", id, idList, `編輯圖徽 - ${name}`);

    $('#layerBarContainer').addClass('hidden');
    $('#editSymbol-Step1').removeClass('hidden');
    $('#editSymbol-Step1').html(pointStep1);
    // $("#editSymbol-Title0").append(`編輯圖徽 - ${name} <br> 選擇編輯類型`);

    $('#editNext').click(function () {
        planeEditStep2(id);
    });

    // 編輯圖徽第一步
    $('.symbolClass').on('click', function () {
        $(this).addClass('selected');
        // 其他的symbolClass 移除selected
        $(this).siblings().removeClass('selected');
    });
    $(".editCancel").on('click', function (e) {
        console.log("editCancel");
        $('.symbolProp').each(function () {
            $(this).addClass('hidden');
        });
        $('#editSymbol-Step1').addClass('hidden');
        $('#editSymbol-Step2').addClass('hidden');
        $('#layerBarContainer').removeClass('hidden');
    });
}

// 點符號選擇
var pointStep2_0 = `
<div id="symbolProp-0" class="symbolProp">
    <h5 id="editSymbol-Title1" class="offcanvas-title"></h5>
    <!-- 填滿 -->
    <span>填滿</span>
    <input class="color-box" type="color" name="fillColor" value="#ff0000">
    <br>
    <!-- 外框 -->
    <span>外框</span>
    <input class="color-box" type="color" name="frameColor" value="#ff0000">
    <select class="select2" name="thickness">
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
    </select>
    <br>
    <div class="form-group" style="clear:both;">
        <button class="btn js-modal-toggle editBack">上一步</button>
        <button class="btn js-modal-toggle editComplete">完成</button>
    </div>
</div>`;

// 依分級選擇
var pointStep2_1 = `
<div id="symbolProp-1" class="symbolProp">
    <h5 id="editSymbol-Title1" class="offcanvas-title"></h5>
    <!-- 欄位 -->
    <span>欄位</span>
    <select class="select2" name="field">
        <option value="none">請選擇欄位</option>
    </select>
    <br>
    <!-- 填滿 -->
    <span>填滿</span>
    <select id="gradientColorsMap" name="fillcolor" style="width:200px; height:40px">
        <option value="purples"></option>
        <option value="reds"></option>
        <option value="ylrd"></option>
        <option value="rdpu"></option>
        <option value="ylbr"></option>
        <option value="greens"></option>
        <option value="ylgnbu"></option>
        <option value="gnbu"></option>
        <option value="greys"></option>
    </select>
    <canvas id="gradientColor" width="200" height="50" style="display:none;"></canvas>
    <br>
    <!-- 等級 -->
    <span>等級</span>
    <select class="select2" name="level">
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
        <option value="8">8</option>
        <option value="9">9</option>
    </select>
    <br>
    <!-- 外框 -->
    <span>外框</span>
    <input class="color-box" type="color" name="frameColor" value="#ff0000">
    <select class="select2" name="thickness">
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
    </select>
    <br>
    <div class="form-group" style="clear:both;">
        <button class="btn js-modal-toggle editBack">上一步</button>
        <button class="btn js-modal-toggle editComplete">完成</button>
    </div>
</div>`;

// 依類型選擇
var pointStep2_2 = `
<div id="symbolProp-2" class="symbolProp">
    <h5 id="editSymbol-Title1" class="offcanvas-title"></h5>
    <!-- 欄位 -->
    <span>欄位</span>
    <select class="select2" name="field">
        <option value="none">請選擇欄位</option>
    </select>
    <br>
    <!-- 填滿 -->
    <span>填滿</span>
    <select id="groupColorsMap" name="fillcolor" style="width:200px; height:40px">
        <option value="type1"></option>
        <option value="type2"></option>
        <option value="type3"></option>
        <option value="type4"></option>
        <option value="type5"></option>
        <option value="type6"></option>
        <option value="type7"></option>
        <option value="type8"></option>
    </select>
    <canvas id="groupColor" width="200" height="50" style="display:none;"></canvas>
    <br>
    <!-- 外框 -->
    <span>外框</span>
    <input class="color-box" type="color" name="frameColor" value="#ff0000">
    <select class="select2" name="thickness">
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
    </select>
    <br>
    <div class="form-group" style="clear:both;">
        <button class="btn js-modal-toggle editBack">上一步</button>
        <button class="btn js-modal-toggle editComplete">完成</button>
    </div>
</div>`;

// 漸層顏色組合
var gradientColorsMap = {
    purples:["#f2f0f7", "#dadadb", "#bcbcdb", "#adabd1", "#9e9ac8", "#8f8bc1", "#807dba", "#6a51a3", "#4a1486"],
    reds:   ["#fee5d9", "#fcbbb7", "#fc9272", "#fb7e5e", "#fb6a4a", "#f5523b", "#ef3b2c", "#cb181d", "#99000d"],
    ylrd:   ["#ffffb2", "#fed976", "#feb24c", "#fd9f44", "#fd8d3c", "#fc6d33", "#fc4e2a", "#e31a1c", "#b10026"],
    rdpu:   ["#feece2", "#fcc5c0", "#fa9fb5", "#f883ab", "#f768a1", "#ea4e9c", "#dd3497", "#ae017e", "#7a0177"],
    ylbr:   ["#ffffd4", "#fee391", "#fec44f", "#feae3c", "#fe9929", "#f5841e", "#ec7014", "#cc4c02", "#8c2d04"],
    greens: ["#edf8e9", "#c7e9c0", "#a1d99b", "#8ace88", "#74c476", "#5ab769", "#41ab5d", "#238b45", "#005a32"],
    ylgnbu: ["#ffffcc", "#c7e9b4", "#7fcdbb", "#60c1bf", "#41b6c4", "#2fa3c2", "#1d91c0", "#225ea8", "#0c2c84"],
    gnbu:   ["#f0f9e8", "#cce5c5", "#a8ddb5", "#91d4bc", "#7bccc4", "#64bfcb", "#4eb3d3", "#2b8cbf", "#08589e"],
    greys:  ["#f7f7f7", "#d9d9d9", "#bdbdbd", "#a9a9a9", "#969696", "#848484", "#737373", "#525252", "#252525"]
};

// 分類顏色組合
var groupColorsMap = {
    type1: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628"],
    type2: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#a5d8bd"],
    type3: ["#8c510a", "#d8b365", "#f6e8c3", "#f5f5f5", "#c7eae5", "#5ab4ac", "#01665e"],
    type4: ["#c51b7d", "#e9a3c9", "#fde0ef", "#f7f7f7", "#e6f5d0", "#a1d76a", "#4d9221"],
    type5: ["#b35806", "#f1a340", "#fee0b6", "#f7f7f7", "#d8daeb", "#998ec3", "#542788"],
    type6: ["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d1e5f0", "#67a9cf", "#2166ac"],
    type7: ["#b2182b", "#ef8a62", "#fddbc7", "#ffffff", "#e0e0e0", "#999999", "#4d4d4d"],
    type8: ["#d53e4f", "#fc8d59", "#fee08b", "#ffffbf", "#e6f598", "#99d594", "#3288bd"]
};

// 繪製漸層圖函式：傳入顏色陣列，回傳對應的 DataURL
function createGradientDataURL(colors){
    var canvas = document.getElementById('gradientColor');
    var ctx = canvas.getContext('2d');

    // 清空畫布
    ctx.clearRect(0,0,200,50);

    // 建立水平漸層
    var gradient = ctx.createLinearGradient(0,0,200,0);

    // 根據顏色數量平均分佈
    var step = 1/(colors.length-1);
    colors.forEach(function(color, index){
        gradient.addColorStop(index * step, color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,200,50);
    return canvas.toDataURL();
}

// 每個寬度平均分佈在 200 px 的 Canvas 中，不同的區段顏色清晰分隔（類似色階圖的感覺）
function creategroupColor(colors){
    var canvas = document.getElementById('groupColor');
    var ctx = canvas.getContext('2d');

    // 清空畫布
    ctx.clearRect(0,0,200,50);

    // 計算每個區段的寬度
    var step = 200 / colors.length;
    colors.forEach(function(color, index){
        ctx.fillStyle = color;
        ctx.fillRect(index * step, 0, step, 50);
    });
    return canvas.toDataURL();
}

// 調整重複顏色
function adjustDuplicateColors(colorSet) {
    // 將顏色從十六進制轉換為 RGB
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
        };
    }

    // 將 RGB 轉換回十六進制
    function rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    for (let i = 1; i < colorSet.length - 1; i++) {
        if (colorSet[i] === colorSet[i - 1] || colorSet[i] === colorSet[i + 1]) {
            // 當顏色重複時，計算與前後顏色的中間值
            const prevRgb = hexToRgb(colorSet[i - 1]);
            const nextRgb = hexToRgb(colorSet[i + 1]);

            const avgRgb = {
                r: Math.round((prevRgb.r + nextRgb.r) / 2),
                g: Math.round((prevRgb.g + nextRgb.g) / 2),
                b: Math.round((prevRgb.b + nextRgb.b) / 2),
            };

            // 替換當前顏色為中間值
            colorSet[i] = rgbToHex(avgRgb.r, avgRgb.g, avgRgb.b);
        }
    }

    return colorSet;
}

// 圖例色塊，直接用 CSS 畫，不再產生 SVG data URL
function buildLegendSwatch(fillColor, frameColor) {
    return `<span class="edit_icon" style="display:inline-block; background-color:${fillColor}; border:2px solid ${frameColor}; box-sizing:border-box;"></span>`;
}

// 系統／內部欄位，不提供使用者選擇
const SYSTEM_FIELDS = ["座標", "備註", "OBJECTID", "內容物", "Instance", "AreaId", "Kind"];

function getSelectableFields(allProps) {
    if (!allProps || !allProps[0]) return [];
    return Object.keys(allProps[0]).filter(field => !SYSTEM_FIELDS.includes(field));
}

// 動態判斷「可分級」欄位：抽樣檢查是否具備可解析成數字的值，取代寫死的欄位名單
function getNumericFields(allProps) {
    if (!allProps || allProps.length === 0) return [];
    const sample = allProps.slice(0, 50);
    return getSelectableFields(allProps).filter(function (field) {
        return sample.some(function (p) { return p[field] != null && p[field] !== '' && !isNaN(parseFloat(p[field])); });
    });
}

function planeEditStep2(id){
    console.log("planeEditStep2");
    var symClass = $('.symbolClass.selected').data('symclass');
    console.log(symClass);
    if(symClass == undefined){
        alert("請選擇編輯類型");
        return;
    }
    $('#editSymbol-Step1').addClass('hidden');
    $('#editSymbol-Step2').removeClass('hidden');

    if(symClass == 0){
        console.log("pointStep2_0");
        $('#editSymbol-Step2').html(pointStep2_0);
        $('#editSymbol-Title1').append(`編輯圖徽 - 點符號選擇`);
        bindStep2Actions(id, null);
        return;
    }

    // 依分級／依類型需要該 pipeline 完整屬性資料才能正確列出欄位與計算範圍/分類，
    // 不能只看目前剛好被其他功能載入的部分資料（甚至可能完全還沒載入）
    $('#editSymbol-Step2').html(`<div style="padding:20px;">載入欄位資料中...</div>`);
    loadLayerProps(id).then(function (allProps) {
        if(symClass == 1){
            console.log("pointStep2_1");
            $('#editSymbol-Step2').html(pointStep2_1);
            $('#editSymbol-Title1').append(`編輯圖徽 - 依分級選擇`);
            getNumericFields(allProps).forEach(function (field) {
                $('select[name="field"]').append(`<option value="${field}">${field}</option>`);
            });

            // 初始化 Select2，並使用 templateResult
            $('#gradientColorsMap').select2({
                templateResult: function (state) {
                    if (!state.id) return state.text;
                    var colors = gradientColorsMap[state.id];
                    if(!colors) return state.text;
                    var imgData = createGradientDataURL(colors);
                    var $span = $('<span></span>');
                    var $img = $('<img>', { src: imgData, width: 170, height: 20, css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' } });
                    $span.append($img);
                    return $span;
                },
                templateSelection: function(state){
                    if(!state.id) return state.text;
                    var colors = gradientColorsMap[state.id];
                    if(!colors) return state.text;
                    var imgData = createGradientDataURL(colors);
                    var $span = $('<span></span>');
                    var $img = $('<img>', { src: imgData, width: 170, height: 20, css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' } });
                    $span.append($img);
                    return $span;
                },
                minimumResultsForSearch: Infinity, // 隱藏搜索框
            });
        } else if(symClass == 2){
            console.log("pointStep2_2");
            $('#editSymbol-Step2').html(pointStep2_2);
            $('#editSymbol-Title1').append(`編輯圖徽 - 依類型選擇`);
            getSelectableFields(allProps).forEach(function (field) {
                $('select[name="field"]').append(`<option value="${field}">${field}</option>`);
            });

            $('#groupColorsMap').select2({
                // 使用groupColorsMap的顏色但不要漸層
                templateResult: function (state) {
                    if (!state.id) return state.text;
                    var colors = groupColorsMap[state.id];
                    if(!colors) return state.text;
                    var imgData = creategroupColor(colors);
                    var $span = $('<span></span>');
                    var $img = $('<img>', { src: imgData, width: 170, height: 20, css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' } });
                    $span.append($img);
                    return $span;
                },
                templateSelection: function(state){
                    if(!state.id) return state.text;
                    var colors = groupColorsMap[state.id];
                    if(!colors) return state.text;
                    var imgData = creategroupColor(colors);
                    var $span = $('<span></span>');
                    var $img = $('<img>', { src: imgData, width: 170, height: 20, css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' } });
                    $span.append($img);
                    return $span;
                },
                minimumResultsForSearch: Infinity, // 隱藏搜索框
            });
        }
        bindStep2Actions(id, allProps);
    });
}

function bindStep2Actions(id, allProps) {
    $(".editBack").on('click', function () {
        $('#editSymbol-Step2').addClass('hidden');
        $('#editSymbol-Step1').removeClass('hidden');
    });

    $(".editComplete").on('click', function () {
        var symbolProp = $(this).parent().parent().attr('id');

        // 選擇依符號
        if(symbolProp == 'symbolProp-0'){
            // 取得symbolProp-0下的所有input與select
            var inputs = $('#symbolProp-0').find('input');
            var selects = $('#symbolProp-0').find('select');

            let formData = {};
            inputs.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            selects.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            const fw = parseInt(formData.thickness);
            idList.forEach(function (layerId) {
                const layer = layers[layerId];
                if (!layer) return;
                if (typeof layer.eachLayer !== 'function') {
                    _vtSetStyle(layer, {'layer': {
                        fillColor: formData.fillColor, color: formData.frameColor,
                        fill: true, fillOpacity: 0.5, weight: fw, opacity: 1
                    }});
                } else {
                    layer.eachLayer(function(sub) {
                        sub.setStyle({ fillColor: formData.fillColor, color: formData.frameColor, weight: fw });
                    });
                }
            });

            // 清除sections_{id}下的所有section
            $(`#sections_${id}`).empty();
            $(`#sections_${id}`).append(`
            <div class="section" id="section_${id}">
                ${buildLegendSwatch(formData.fillColor, formData.frameColor)}
            </div>
            `);
            $('#editSymbol-Step1').empty();
            $('#editSymbol-Step2').empty();
        };
        if(symbolProp == 'symbolProp-1'){
            var inputs = $('#symbolProp-1').find('input');
            var selects = $('#symbolProp-1').find('select');

            let formData = {};
            inputs.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            selects.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });

            if (formData.field == 'none') {
                alert("請選擇欄位");
                return;
            }

            const allPropsP1 = allProps || [];
            let minValue = Infinity, maxValue = -Infinity;
            allPropsP1.forEach(function(p) {
                const v = parseFloat(p[formData.field]);
                if (!isNaN(v)) { if (v < minValue) minValue = v; if (v > maxValue) maxValue = v; }
            });
            if (minValue === maxValue || !isFinite(minValue)) { alert("數值範圍過於集中，無法進行有效分層"); return; }

            let levels = parseInt(formData.level);
            let rangeSize = (maxValue - minValue) / levels;
            const gradientColors = gradientColorsMap[formData.fillcolor];
            let colorSet = [];
            if (levels === gradientColors.length) { colorSet = gradientColors; }
            else { for (let i = 0; i < levels; i++) { colorSet.push(gradientColors[Math.round(i * (gradientColors.length - 1) / (levels - 1))]); } }

            const fieldP1 = formData.field, wP1 = parseInt(formData.thickness), fcP1 = formData.frameColor;
            idList.forEach(function(layerId) {
                const layer = layers[layerId];
                if (!layer) return;
                if (typeof layer.eachLayer !== 'function') {
                    _vtSetStyle(layer, {'layer': function(properties) {
                        try {
                            const pd = properties.prop ? JSON.parse(properties.prop.replace(/NaN/g, 'null')) : {};
                            const v = parseFloat(pd[fieldP1]);
                            if (isNaN(v)) return { fillColor: colorSet[0], color: fcP1, fill: true, fillOpacity: 0.5, weight: wP1 };
                            let idx = Math.floor((v - minValue) / rangeSize);
                            if (idx >= levels) idx = levels - 1; if (idx < 0) idx = 0;
                            return { fillColor: colorSet[idx], color: fcP1, fill: true, fillOpacity: 0.5, weight: wP1 };
                        } catch(e) { return { fillColor: colorSet[0], color: fcP1, fill: true, fillOpacity: 0.5, weight: wP1 }; }
                    }});
                } else {
                    layer.eachLayer(function(sub) {
                        const popup = sub.getPopup();
                        if (!popup) return;
                        try {
                            const pd = JSON.parse(new DOMParser().parseFromString(popup.getContent(), 'text/html').querySelector('.popupData').textContent.replace(/NaN/g, 'null'));
                            let idx = Math.floor((parseFloat(pd[fieldP1]) - minValue) / rangeSize);
                            if (idx >= levels) idx = levels - 1;
                            sub.setStyle({ fillColor: colorSet[idx], color: fcP1, weight: wP1 });
                        } catch(e) {}
                    });
                }
            });

            // 建立階層對應圖示
            $(`#sections_${id}`).empty(); // 清除舊的階層圖示
            for (let i = 0; i < levels; i++) {
                let rangeMin = minValue + i * rangeSize;
                let rangeMax = minValue + (i + 1) * rangeSize;

                const section = `
                <div class="section" id="section_${id}_${i}">
                    ${buildLegendSwatch(colorSet[i], formData.frameColor)}
                    <span class="range_label" style="margin-left:5px">${rangeMin.toFixed(1)} - ${rangeMax.toFixed(1)}</span>
                </div>
                `;
                $(`#sections_${id}`).append(section);
            }
            // 清空表單步驟
            $('#editSymbol-Step1').empty();
            $('#editSymbol-Step2').empty();
        };

        if(symbolProp == 'symbolProp-2'){
            var inputs = $('#symbolProp-2').find('input');
            var selects = $('#symbolProp-2').find('select');

            let formData = {};
            inputs.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            selects.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            if(formData.field == 'none'){
                alert("請選擇欄位");
                return;
            }
            console.log(formData);
            const allPropsP2 = allProps || [];
            let fields = [...new Set(allPropsP2.map(p => p[formData.field]).filter(v => v != null))];
            if (typeof fields[0] === 'string') fields.sort(); else fields.sort((a, b) => a - b);
            if (fields.length > 20) { alert("類型數量超過20,無法進行有效分類"); return; }

            const groupColors = groupColorsMap[formData.fillcolor];
            let colorSet = fields.map((k, i) => groupColors[Math.floor(i / fields.length * (groupColors.length - 1))]);
            colorSet = adjustDuplicateColors(colorSet);

            const fieldP2 = formData.field, wP2 = parseInt(formData.thickness), fcP2 = formData.frameColor;
            idList.forEach(function(layerId) {
                const layer = layers[layerId];
                if (!layer) return;
                if (typeof layer.eachLayer !== 'function') {
                    _vtSetStyle(layer, {'layer': function(properties) {
                        try {
                            const pd = properties.prop ? JSON.parse(properties.prop.replace(/NaN/g, 'null')) : {};
                            const idx = fields.indexOf(pd[fieldP2]);
                            if (idx === -1) return { fillColor: '#888', color: fcP2, fill: true, fillOpacity: 0.5, weight: wP2 };
                            return { fillColor: colorSet[idx], color: fcP2, fill: true, fillOpacity: 0.5, weight: wP2 };
                        } catch(e) { return { fillColor: '#888', color: fcP2, fill: true, fillOpacity: 0.5, weight: wP2 }; }
                    }});
                } else {
                    layer.eachLayer(function(sub) {
                        const popup = sub.getPopup();
                        if (!popup) return;
                        try {
                            const pd = JSON.parse(new DOMParser().parseFromString(popup.getContent(), 'text/html').querySelector('.popupData').textContent.replace(/NaN/g, 'null'));
                            const idx = fields.indexOf(pd[fieldP2]);
                            if (idx === -1) return;
                            sub.setStyle({ fillColor: colorSet[idx], color: fcP2, weight: wP2 });
                        } catch(e) {}
                    });
                }
            });
            // 建立類別對應圖示
            $(`#sections_${id}`).empty(); // 清除舊的類別圖示
            for (let i=0; i<fields.length; i++) {
                const section = `
                <div class="section" id="section_${id}_${i}">
                    ${buildLegendSwatch(colorSet[i], formData.frameColor)}
                    <span class="range_label" style="margin-left:5px">${fields[i]}</span>
                </div>
                `;
                $(`#sections_${id}`).append(section);
            }
        }
        $('.symbolProp').each(function () {
            $(this).addClass('hidden');
        });
        $('#editSymbol-Step2').addClass('hidden');
        $('#layerBarContainer').removeClass('hidden');
    });
}
