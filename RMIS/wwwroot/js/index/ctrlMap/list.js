import { layerList } from './menu.js';
import { removePipeline, addPipeline } from './pipeline.js';
import { layers } from './layers.js';
import { getIndexMap } from '../map.js';
import { layerEditor } from './layerEdit/layerEditor.js';
import { opacityLayer } from './opacityCtrl.js';
import { openPanel } from '../metaDataPanel.js';

// 圖資清單控制
export function add2List(id, name, datas, metaData) {
    let sections = "";
    let layersId = [];
    // pipeline下的layer
    datas.forEach(function (data) {
        layersId.push(data.id);
        var section = `
            <div class="section" id="section_${data.id}">
                <span class="section_icon" style="background-image: url('/img/${data.svg}');"></span>
                ${data.name}
            </div>
        `;
        sections += section;
    });
    // layer編輯工具
    let layerItem = `
        <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
            <div class="layerTitle" style="border-top">
                <div style="display:flex; border-bottom:solid 1px #160386;"> 
                    <span class="menu-icon menu-open" id="layerLegend_${id}"></span>
                    <div class="layerName">${name}</div>
                </div>
                <div id="sections_${id}">
                    ${sections}
                </div>
            </div>
            <div class="more more-off" id="more_${id}">
                <ul class="moreMenu" >
                    <li id="more_action2_${id}">編輯圖徽</li>
                    <li id="more_action3_${id}">檢視詮釋資料</li>
                    <li id="more_action4_${id}">
                        透明度
                        <input class="layerOpacity" type="text" value="100" placeholder="100">
                    </li>
                </ul>
            </div>
            <div class="eye eyeOpen" id="eye_${id}"></div>
            <div class="layerRemove" id="layerRemove_${id}"></div>
        </div>
    `;
    $('#layerBarContainer').append(layerItem);
    
    $(`#more_${id}`).on('click', function () {
        $(this).find('.moreMenu').toggle();
        // .moreMenu顯示在class="more"的下方
        const offset = $(this).offset();
        const height = $(this).outerHeight();
        $(this).find('.moreMenu').css('top', offset.top + height);
    });

    // 編輯圖徽
    $(`#more_action2_${id}`).on('click', function () {
        layerEditor(id, name, layersId);
    });

    $(`#more_action3_${id}`).on('click', function () {
        openPanel(metaData);
    });
    // 使用透明度不要关闭
    $('.layerOpacity').on('click', function (e) {
        e.stopPropagation(); // 阻止冒泡，防止关闭菜单
    });

    // 输入透明度
    $('.layerOpacity').on('blur', function () {        
        const opacity = $(this).val();
        console.log("layerOpacity", opacity);
        // 从 layersId 中找到图层，修改透明度
        opacityLayer(opacity, layersId);
    });

    $(`#eye_${id}`).on('click', function () {
        if ($(this).hasClass('eyeOpen')) {
            closeLayer(id, layersId);
            $(this).removeClass('eyeOpen');
            $(this).addClass('eyeClosed');
        } else {
            displayLayer(id, layersId);
            $(this).removeClass('eyeClosed');
            $(this).addClass('eyeOpen');
        }
    });

    $(`#layerLegend_${id}`).on('click', function () {
        if ($(this).hasClass('menu-open')) {
            $(this).removeClass('menu-open');
            $(this).addClass('menu-close');
            $(`#sections_${id}`).css('display', 'none');
        } else {
            $(this).removeClass('menu-close');
            $(this).addClass('menu-open');
            $(`#sections_${id}`).css('display', 'block');
        }
    });
    $(`#layerRemove_${id}`).on('click', function () {
        removePipeline(id).then(result => {
            layerList[id] = false;
            console.log("Remove click");
            remove2List(id);
            var $switch = $(`#switch-${id}`);
            $switch.removeClass('switch-on');
            $switch.addClass('switch-off');
        });
    });
    console.log("Add List Success");
}

// 從清單中移除圖層bar
export function remove2List(id) {
    console.log("Remove from List", id);
    let $layerList = $(".layerList");
    $layerList.find('#layerBar_' + id).remove();
    delete layerList[id];
}

// 不顯示圖層
function closeLayer(id, layersId) {
    layersId.forEach(function (id) {
        if(layers[id]){
            layers[id].eachLayer(function (layer) {
                layer._isVisible = false;
                if (layer instanceof L.Marker) {
                    layer.setOpacity(0); // 設置不可見
                } else if (layer instanceof L.Polygon) {
                    layer.setStyle({
                        opacity: 0,       // 邊框透明度
                        fillOpacity: 0    // 填充透明度同步
                    });
                } else if (layer instanceof L.Polyline) {
                    layer.setStyle({ opacity: 0 }); // 設置不可見
                }
            });
        }
    });
    layerList[id] = false;
}

// 顯示圖層
function displayLayer(id, layersId) {
    layersId.forEach(function (id) {
        if(layers[id]){
            layers[id].eachLayer(function (layer) {
                var opacity = getIndexMap().getZoom()>15 ?  (layer._originalOpacity || 1) : 0;

                layer._isVisible = true;
                if (layer instanceof L.Marker) {
                    layer.setOpacity(opacity); // 恢復透明度
                } else if (layer instanceof L.Polygon) {
                    layer.setStyle({
                        opacity: opacity, // 邊框透明度
                        fillOpacity: opacity // 填充透明度同步
                    });
                } else if (layer instanceof L.Polyline) {
                    layer.setStyle({ opacity: opacity }); // 恢復透明度
                }
            });
        }
    });
    layerList[id] = true;
}

export function addFocus2List() {

}