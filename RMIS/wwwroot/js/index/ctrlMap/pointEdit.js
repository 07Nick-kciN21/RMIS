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
            <select id="mySelect" name="fillcolor" style="width:200px; height:40px">
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
            <canvas id="selectCanvas" width="200" height="50" style="display:none;"></canvas>
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
var pointStep2_2 = `<div id="symbolProp-2" class="symbolProp">            
                <div>依類型選擇</div>
                <!-- 欄位 -->
                <span>欄位</span>
                <!-- 填滿 -->
                <span>填滿</span>
                <!-- 外框 -->
                <span>外框</span>
                <!-- 大小 -->
                <span>大小</span>
                <div class="form-group" style="clear:both;">
                    <button class="btn js-modal-toggle editBack">上一步</button>
                    <button class="btn js-modal-toggle editComplete">完成</button>
                </div>
            </div>`;

// 預先定義各 value 對應的漸層顏色組合
var gradientColorsMap = {
    purples: ["#f2f0f7","#cbc9e2","#9e9ac8","#756bb1","#54278f"],
    reds: ["#fee5d9","#fcae91","#fb6a4a","#de2d26","#a50f15"],
    ylrd: ["#ffffb2","#fed976","#feb24c","#fd8d3c","#f03b20","#bd0026"],
    rdpu: ["#fde0dd","#fa9fb5","#f768a1","#dd3497","#ae017e","#7a0177"],
    ylbr: ["#ffffe5","#fff7bc","#fee391","#fec44f","#fe9929","#ec7014","#cc4c02","#993404","#662506"],
    greens: ["#f7fcf5","#e5f5e0","#c7e9c0","#a1d99b","#74c476","#41ab5d","#238b45","#006d2c","#00441b"],
    ylgnbu: ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"],
    gnbu: ["#f0f9e8","#bae4bc","#7bccc4","#43a2ca","#0868ac"],
    greys: ["#f7f7f7","#cccccc","#969696","#636363","#252525"]
};

// 繪製漸層圖函式：傳入顏色陣列，回傳對應的 DataURL
function createGradientDataURL(colors){
    var canvas = document.getElementById('selectCanvas');
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

// 編輯圖徽第二步
function pointEditStep2(id){
    console.log("pointEditStep2");
    $('#editSymbol-Step1').addClass('hidden');
    $('#editSymbol-Step2').removeClass('hidden');
    
    // 從.symbolClass下找到.selected的data-symclass
    var symClass = $('.symbolClass.selected').data('symclass');
    console.log(symClass);
    if(symClass == 0){
        console.log("pointStep2_0");
        $('#editSymbol-Step2').html(pointStep2_0);
    }
    if(symClass == 1){
        console.log("pointStep2_1");
        $('#editSymbol-Step2').html(pointStep2_1);
        var fields = Object.keys(layerProps[id][0]);
        fields.forEach(function (field) {
            $('select[name="field"]').append(`<option value="${field}">${field}</option>`);
        });

        // 2. 初始化 Select2，並使用 templateResult
        $('#mySelect').select2({
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
                    height: 15,
                    css: { 'vertical-align': 'middle', 'margin':'5px 0 0 5px', 'border':'1px solid #ccc' }
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
                    height: 15,
                    css: { 'vertical-align': 'middle', 'margin-right':'5px', 'border':'1px solid #ccc' }
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
    }

    $(".editBack").on('click', function () {
        $('#editSymbol-Step2').addClass('hidden');
        $('#editSymbol-Step1').removeClass('hidden');
    });

    // 編輯完成
    $(".editComplete").on('click', function () {
        // 選擇依符號
        if($(this).parent().parent().attr('id') == 'symbolProp-0'){
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
        if($(this).parent().parent().attr('id') == 'symbolProp-1'){
            var inputs = $('#symbolProp-1').find('input');
            var selects = $('#symbolProp-1').find('select');

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
            // 取得所有的popupData
            let layerDataList = [];
            idList.forEach(function (id) {
                if (layers[id]) {
                    layers[id].eachLayer(function (layer) {
                        var popup = layer.getPopup();
                        if (popup) {
                            var content = popup.getContent();
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(content, 'text/html');
                            var popupData = doc.querySelector('.popupData');
                            var jsonData = popupData.textContent.replace(/NaN/g, 'null');
                            layerDataList.push({
                                layer: layer,
                                jsonData: JSON.parse(jsonData)
                            });
                        }
                    });
                }
            });

            // 依照formData.field欄位進行排序
            jsonDatas.sort(function(a, b){
                return a[formData.field] - b[formData.field];
            });
            // 再把排序後的layer分成formData.level個等級
            var levels = parseInt(formData.level);
            var chunkSize = Math.ceil(jsonDatas.length / levels);
            var colorSet = gradientColorsMap[formData.fillcolor];

            jsonDatas.forEach(function (data, index) {
                var levelIndex = Math.floor(index / chunkSize);
                var fillColor = colorSet[levelIndex];
                var diameter = parseInt(formData.size);
                var strokeWidth = parseInt(formData.thickness) * 2;
                var radius = diameter / 2;

                var svgHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">
                    <circle cx="${radius}" cy="${radius}" r="${radius - strokeWidth / 2}"
                        fill="${fillColor}" 
                        stroke="${formData.frameColor}" 
                        stroke-width="${strokeWidth}"/>
                </svg>
                `;

                var svgDivIcon = L.divIcon({
                    className: '',
                    html: svgHTML,
                    iconAnchor: [radius, radius],
                    popupAnchor: [0, -radius]
                });

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
                                if (jsonData[formData.field] === data[formData.field]) {
                                    layer.setIcon(svgDivIcon);
                                }
                            }
                        });
                    }
                });
            });

            $('#editSymbol-Step1').empty();
            $('#editSymbol-Step2').empty();
        };

        // 選擇依類型
        if($(this).parent().parent().attr('id') == 'symbolProp-2'){
            var inputs = $('#symbolProp-2').find('input');
            var selects = $('#symbolProp-2').find('select');

            let formData = {};
            inputs.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            selects.each(function() {
                formData[$(this).attr('name')] = $(this).val();
            });
            console.log(formData);
        };
        $('.symbolProp').each(function () {
            $(this).addClass('hidden');
        });
        $('#editSymbol-Step2').addClass('hidden');
        $('#layerBarContainer').removeClass('hidden');
    });
}

