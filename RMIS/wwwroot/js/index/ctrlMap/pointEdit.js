import {layers, layerProps} from './layers.js';

var pointStep1 = `<h5 class="offcanvas-title editSymbol-Title"></h5>
        <div id="editStep1">
            <div class="symbolClass" data-symclass="0">            
                <div>點符號</div>
            </div>
            <div class="symbolClass" data-symclass="1">            
                <div>依分級</div>
            </div>
            <div class="symbolClass" data-symclass="2">            
                <div>依類型</div>
            </div>
        </div>
        <div class="form-group" style="clear:both;">
            <button class="btn js-modal-toggle editCancel">取消</button>
            <button class="btn js-modal-toggle" id="editNext">下一步</button>
        </div>`;
let idList 

// 每一種點開都有三種選擇
// 符號、分級、類型
export function pointEdit(id, name, layersId) {
    id=id;
    idList = layersId;
    console.log("pointEdit", id, idList);
    $(".editSymbol-Title").html(`編輯圖徽<br>${name}`);
    $('#layerBarContainer').addClass('hidden');
    $('#editSymbol-Step1').removeClass('hidden');
    $('#editSymbol-Step1').html(pointStep1);
    $('#editNext').click(function () {
        pointEditStep2(id);
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

// 符號
var pointStep2_0 = `<div id="symbolProp-0" class="symbolProp">            
        <div>點符號選擇</div>
        <!-- 填滿 -->
        <span>填滿</span>
        <input class="color-box" type="color" name="fillColor" value="#ff0000">
        <br>
        <!-- 外框 -->
        <span>外框</span>
        <input class="color-box" type="color" name="frameColor" value="#ff0000"> 
        <select class="select2" name="thickness">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
        </select>   
        <br>            
        <!-- 大小1-10 -->
        <span>大小</span>
        <select class="select2" name="size">
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
        </select>
        <div class="form-group" style="clear:both;">
            <button class="btn js-modal-toggle editBack">上一步</button>
            <button class="btn js-modal-toggle editComplete">完成</button>
        </div>                
            </div>`;

// 分級
var pointStep2_1 = `
        <div id="symbolProp-1" class="symbolProp">  
            <div>依分級選擇</div>
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
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
            </select>
            <br>
            <!-- 大小 -->
            <span>大小</span>
            <select class="select2" name="size">
                <option value="12">12</option>
                <option value="14">14</option>
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="20">20</option>
            </select>
            <br>
            <div class="form-group" style="clear:both;">
                <button class="btn js-modal-toggle editBack">上一步</button>
                <button class="btn js-modal-toggle editComplete">完成</button>
            </div>
        </div>`;

// 類型
var pointStep2_2 = `
            <div id="symbolProp-2" class="symbolProp">     
                <div>依類型選擇</div>
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
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                </select>
                <br>
                <!-- 大小 -->
                <span>大小</span>
                <select class="select2" name="size">
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="20">20</option>
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

// 編輯圖徽第二步
function pointEditStep2(id){
    console.log("pointEditStep2");
    // 從.symbolClass下找到.selected的data-symclass
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
    }
    if(symClass == 1){
        console.log("pointStep2_1");
        $('#editSymbol-Step2').html(pointStep2_1);
        var fields = Object.keys(layerProps[id][0]);
        fields.forEach(function (field) {
            if(field == "孔蓋種類" || field == "尺寸單位" || field == "蓋部寬度" || field == "蓋部長度" || field == "地盤高" || field == "孔深" || field == "孔蓋型態" || field == "使用狀態" || field == "資料狀態"){
                $('select[name="field"]').append(`<option value="${field}">${field}</option>`);
            };
        });

        // 2. 初始化 Select2，並使用 templateResult
        $('#gradientColorsMap').select2({
            templateResult: function (state) {
                if (!state.id) {
                    return state.text;
                }
                var colors = gradientColorsMap[state.id];
                if(!colors) return state.text; // 如果無對應顏色集，則顯示文字即可
                
                var imgData = createGradientDataURL(colors);
                var $span = $('<span></span>');
                var $img = $('<img>', {
                    src: imgData,
                    width: 170, 
                    height: 20,
                    css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' }
                });
                $span.append($img); // 將 value 當作文字標籤顯示
                return $span;
            },
            templateSelection: function(state){
                // 選擇後顯示同樣的圖片
                if(!state.id) return state.text;
                var colors = gradientColorsMap[state.id];
                if(!colors) return state.text;
                
                var imgData = createGradientDataURL(colors);
                var $span = $('<span></span>');
                var $img = $('<img>', {
                    src: imgData,
                    width: 170, 
                    height: 20,
                    css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' }
                });
                $span.append($img);
                return $span;
            },
            minimumResultsForSearch: Infinity, // 隱藏搜索框
            // name: 'field'

        });
    }
    if(symClass == 2){
        console.log("pointStep2_2");
        $('#editSymbol-Step2').html(pointStep2_2);
        var fields = Object.keys(layerProps[id][0]);
        fields.forEach(function (field) {
            // 不等於座標、備註、OBJECTID、內容物、Instance
            if(field != "座標" && field != "備註" && field != "OBJECTID" && field != "內容物" && field != "Instance"){
                $('select[name="field"]').append(`<option value="${field}">${field}</option>`);
            };
        });
        $('#groupColorsMap').select2({
            // 使用groupColorsMap的顏色但不要漸層
            templateResult: function (state) {
                if (!state.id) {
                    return state.text;
                }
                var colors = groupColorsMap[state.id];
                if(!colors) return state.text;
                
                var imgData = creategroupColor(colors);
                var $span = $('<span></span>');
                var $img = $('<img>', {
                    src: imgData,
                    width: 170, 
                    height: 20,
                    css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' }
                });
                $span.append($img);
                return $span;
            },
            templateSelection: function(state){
                if(!state.id) return state.text;
                var colors = groupColorsMap[state.id];
                if(!colors) return state.text;
                // 每個寬度平均分佈在 200 px 的 Canvas 中，不同的區段顏色清晰分隔（類似色階圖的感覺）
                var imgData = creategroupColor(colors);
                var $span = $('<span></span>');
                var $img = $('<img>', {
                    src: imgData,
                    width: 170, 
                    height: 20,
                    css: { 'vertical-align': 'unset', 'margin-top': '4px', 'border':'1px solid #ccc' }
                });
                $span.append($img);
                return $span;
            },
            minimumResultsForSearch: Infinity, // 隱藏搜索框

        });
    }

    $(".editBack").on('click', function () {
        $('#editSymbol-Step2').addClass('hidden');
        $('#editSymbol-Step1').removeClass('hidden');
    });

    // 編輯完成
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
            console.log(formData);
            // formData = {
            //     "fillColor": "#ff0000", 填滿顏色
            //     "frameColor": "#ff0000", 外框顏色
            //     "thickness": "1", 外框厚度
            //     "size": "1"  大小
            // }
            var diameter = parseInt(formData.size);
            var strokeWidth = parseInt(formData.thickness)*2;
            var radius = diameter / 2; // 半徑

            var svgHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
                <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth/2}"
                    fill="${formData.fillColor}" 
                    stroke="${formData.frameColor}" 
                    stroke-width="${strokeWidth}"/>
            </svg>
            `;
            // 建立新的 DivIcon
            var svgDivIcon = L.divIcon({
                className: '', 
                html: svgHTML,
                iconAnchor: [radius, radius],
                popupAnchor: [0, -radius]
            });
            // 把layers[id]中的圖形改成circleMarker
            idList.forEach(function (id) {
                if(layers[id]){
                    console.log("idList ", id);
                    layers[id].eachLayer(function (layer) {
                        console.log("icon change");
                        layer.setIcon(svgDivIcon);
                    });
                }
            });

            // 清除sections_{id}下的所有section
            $(`#sections_${id}`).empty();

            // 新增 SVG 內容以 encodeURIComponent 包起來
            var encodedSVG = encodeURIComponent(svgHTML);

            // 使用模板字串插入資料
            var section = `
            <div class="section" id="section_${id}">
                <span class="edit_icon" style="background-image: url('data:image/svg+xml;utf8,${encodedSVG}');"></span>
            </div>
            `;
            $('#editSymbol-Step1').empty();
            $('#editSymbol-Step2').empty();
            // 將 section 插入到對應的元素中
            $(`#sections_${id}`).append(section);
            
        };

        // 選擇依分級
        if (symbolProp == 'symbolProp-1') {
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
        
            // 找到數值範圍（第一遍遍歷）
            let minValue = Infinity;
            let maxValue = -Infinity;
        
            idList.forEach(function (id) {
                if (layers[id]) {
                    layers[id].eachLayer(function (layer) {
                        var popup = layer.getPopup();
                        if (popup) {
                            var content = popup.getContent();
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(content, 'text/html');
                            var popupData = doc.querySelector('.popupData');
                            var jsonData = JSON.parse(popupData.textContent.replace(/NaN/g, 'null'));
                            const value = jsonData[formData.field];
                            if (value < minValue) minValue = value;
                            if (value > maxValue) maxValue = value;
                        }
                    });
                }
            });
        
            if (minValue === maxValue) {
                alert("數值範圍過於集中，無法進行有效分層");
                return;
            }
        
            // 計算分層區間大小
            let levels = parseInt(formData.level);
            let rangeSize = (maxValue - minValue) / levels;

            // 確保顏色頭尾一致，均勻映射到層級
            const gradientColors = gradientColorsMap[formData.fillcolor];
            let colorSet = [];
            if (levels === gradientColors.length) {
                colorSet = gradientColors; // 層級數等於顏色數，直接使用
            } else {
                // 均勻分配顏色
                for (let i = 0; i < levels; i++) {
                    const index = Math.round(i * (gradientColors.length - 1) / (levels - 1));
                    colorSet.push(gradientColors[index]);
                }
            }
        
            // 賦予顏色和樣式（第二遍遍歷）
            idList.forEach(function (id) {
                if (layers[id]) {
                    layers[id].eachLayer(function (layer) {
                        var popup = layer.getPopup();
                        if (popup) {
                            var content = popup.getContent();
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(content, 'text/html');
                            var popupData = doc.querySelector('.popupData');
                            var jsonData = JSON.parse(popupData.textContent.replace(/NaN/g, 'null'));
                            const value = jsonData[formData.field];

                            // 計算層級索引
                            let levelIndex = Math.floor((value - minValue) / rangeSize);
                            if (levelIndex >= levels) levelIndex = levels - 1;

                            const fillColor = colorSet[levelIndex];
                            const diameter = parseInt(formData.size);
                            const strokeWidth = parseInt(formData.thickness) * 2;
                            const radius = diameter / 2;

                            // 建立 SVG 圖示
                            const svgHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
                                <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth / 2}"
                                    fill="${fillColor}" 
                                    stroke="${formData.frameColor}" 
                                    stroke-width="${strokeWidth}"/>
                            </svg>
                            `;
                            const svgDivIcon = L.divIcon({
                                className: '',
                                html: svgHTML,
                                iconAnchor: [radius, radius],
                                popupAnchor: [0, -radius]
                            });

                            // 更新圖層圖標
                            layer.setIcon(svgDivIcon);
                        }
                    });
                }
            });
        
            // 建立階層對應圖示
            $(`#sections_${id}`).empty(); // 清除舊的階層圖示
            for (let i = 0; i < levels; i++) {
                let rangeMin = minValue + i * rangeSize;
                let rangeMax = minValue + (i + 1) * rangeSize;
        
                const diameter = parseInt(formData.size);
                const strokeWidth = parseInt(formData.thickness) * 2;
                const radius = diameter / 2;
        
                const fillColor = colorSet[i];
                const svgHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
                    <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth / 2}"
                        fill="${fillColor}" 
                        stroke="${formData.frameColor}" 
                        stroke-width="${strokeWidth}"/>
                </svg>
                `;
        
                const encodedSVG = encodeURIComponent(svgHTML);
        
                const section = `
                <div class="section" id="section_${i}">
                    <span class="edit_icon" style="background-image: url('data:image/svg+xml;utf8,${encodedSVG}');"></span>
                    <span class="range_label" style="margin-left:5px">${rangeMin.toFixed(1)} - ${rangeMax.toFixed(1)}</span>
                </div>
                `;
        
                $(`#sections_${id}`).append(section); // 將階層對應圖示插入到 overview 中
            }
            // 清空表單步驟
            $('#editSymbol-Step1').empty();
            $('#editSymbol-Step2').empty();
        }
        

        // 選擇依類型
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
            // 使用dictionary取得該欄位處重複的值
            let fieldsMap = {};
            let fields = [];
            idList.forEach(function (id) {
                if (layers[id]) {
                    layers[id].eachLayer(function (layer) {
                        var popup = layer.getPopup();
                        if (popup) {
                            var content = popup.getContent();
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(content, 'text/html');
                            var popupData = doc.querySelector('.popupData');
                            var jsonData = JSON.parse(popupData.textContent.replace(/NaN/g, 'null'));
                            
                            let value = jsonData[formData.field];
                            // 保持當前 `value` 的原始型態
                            if (!fieldsMap[value]) {
                                fieldsMap[value] = true;
                                fields.push(value);
                            }   
                        }
                    });
                }
            });
            if(typeof(fields[0]) === 'string'){
                fields.sort();
            }else{
                fields.sort((a, b) => a - b);
            }
            fields = fields.sort((a, b) => a - b);
            console.log(fields);
            if(fields.length > 20){
                alert("類型數量超過20,無法進行有效分類");
                return;
            }
            // 取得選擇類別的頭尾顏色
            const groupColors = groupColorsMap[formData.fillcolor];
            // types由小到大排序，並以頭尾之間的顏色均勻分佈
            let colorSet = [];
            fields.forEach(function (key, index) {
                const colorIndex = Math.floor(index / fields.length * (groupColors.length - 1));
                colorSet.push(groupColors[colorIndex]);
            });
            colorSet = adjustDuplicateColors(colorSet);
            console.log(colorSet);
            // 賦予顏色和樣式（第二遍遍歷）
            idList.forEach(function (id) {
                if (layers[id]) {
                    layers[id].eachLayer(function (layer) {
                        var popup = layer.getPopup();
                        if (popup) {
                            var content = popup.getContent();
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(content, 'text/html');
                            var popupData = doc.querySelector('.popupData');
                            var jsonData = JSON.parse(popupData.textContent.replace(/NaN/g, 'null'));
                            const value = jsonData[formData.field];
                            const index = fields.indexOf(value);
                            if (index === -1) return;
                            const fillColor = colorSet[index];
                            const diameter = parseInt(formData.size);
                            const strokeWidth = parseInt(formData.thickness) * 2;
                            const radius = diameter / 2;
                            const svgHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
                                <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth / 2}"
                                    fill="${fillColor}" 
                                    stroke="${formData.frameColor}" 
                                    stroke-width="${strokeWidth}"/>
                            </svg>
                            `;
                            const svgDivIcon = L.divIcon({
                                className: '',
                                html: svgHTML,
                                iconAnchor: [radius, radius],
                                popupAnchor: [0, -radius]
                            });
                            layer.setIcon(svgDivIcon);
                        }
                    });
                }
            });
            // 建立階層對應圖示
            $(`#sections_${id}`).empty(); // 清除舊的階層圖示
            for (let i = 0; i < colorSet.length; i++) {
                const diameter = parseInt(formData.size);
                const strokeWidth = parseInt(formData.thickness) * 2;
                const radius = diameter / 2;
        
                const fillColor = colorSet[i];
                const svgHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
                    <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth / 2}"
                        fill="${fillColor}" 
                        stroke="${formData.frameColor}" 
                        stroke-width="${strokeWidth}"/>
                </svg>
                `;
        
                const encodedSVG = encodeURIComponent(svgHTML);
        
                const section = `
                <div class="section" id="section_${i}">
                    <span class="edit_icon" style="background-image: url('data:image/svg+xml;utf8,${encodedSVG}');"></span>
                    <span class="range_label" style="margin-left:5px">${fields[i]}</span>
                </div>
                `;
        
                $(`#sections_${id}`).append(section); // 將階層對應圖示插入到 overview 中
            }
        };
        $('.symbolProp').each(function () {
            $(this).addClass('hidden');
        });
        $('#editSymbol-Step2').addClass('hidden');
        $('#layerBarContainer').removeClass('hidden');
    });
}

