import { layerList } from './menu.js';
import { removePipeline, addPipeline } from './pipeline.js';
import { layers } from './layers.js';
// import { getIndexMap } from '../map.js';
import { Map } from '../map_test.js';
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
    let metaItem = metaData
        ? `<li id="more_action3_${id}">檢視詮釋資料</li>`
        : `<li id="more_action3_${id}" style="color: #ccc; cursor: default; pointer-events: none;">檢視詮釋資料</li>`;
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
                    ${metaItem}
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
        if(metaData == null || metaData == "") {
            return;
        };
        openPanel(metaData);
    });
    const $opacityInput = $(`#layerBar_${id} .layerOpacity`);

    $opacityInput.on('click', function (e) {
        e.stopPropagation();
    });

    $opacityInput.on('blur change', function () {
        let val = parseInt($(this).val(), 10);
        if (isNaN(val)) val = 100;
        val = Math.min(100, Math.max(0, val));
        $(this).val(val);
        opacityLayer(val, layersId);
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
    let $layerList = $(".div4");
    $layerList.find('#layerBar_' + id).remove();
    delete layerList[id];
}

// 不顯示圖層
function closeLayer(id, layersId) {
    layersId.forEach(function (layerId) {
        const layer = layers[layerId];
        if (!layer) return;
        layer._isVisible = false;
        if (typeof layer.setOpacity === 'function' && !layer.eachLayer) {
            // VectorGrid
            layer.setOpacity(0);
        } else if (typeof layer.eachLayer === 'function') {
            layer.eachLayer(function (sub) {
                sub._isVisible = false;
                if (sub instanceof L.Marker) sub.setOpacity(0);
                else if (sub instanceof L.Polygon) sub.setStyle({ opacity: 0, fillOpacity: 0 });
                else if (sub instanceof L.Polyline) sub.setStyle({ opacity: 0 });
            });
        }
    });
    layerList[id] = false;
}

// 顯示圖層
function displayLayer(id, layersId) {
    const zoom = Map.getIndexMap().getZoom();
    layersId.forEach(function (layerId) {
        const layer = layers[layerId];
        if (!layer) return;
        layer._isVisible = true;
        const opacity = zoom > 15 ? (layer._originalOpacity || 1) : 0;
        if (typeof layer.setOpacity === 'function' && !layer.eachLayer) {
            // VectorGrid
            layer.setOpacity(opacity);
        } else if (typeof layer.eachLayer === 'function') {
            layer.eachLayer(function (sub) {
                const subOpacity = zoom > 15 ? (sub._originalOpacity || 1) : 0;
                sub._isVisible = true;
                if (sub instanceof L.Marker) sub.setOpacity(subOpacity);
                else if (sub instanceof L.Polygon) sub.setStyle({ opacity: subOpacity, fillOpacity: subOpacity });
                else if (sub instanceof L.Polyline) sub.setStyle({ opacity: subOpacity });
            });
        }
    });
    layerList[id] = true;
}

export function addFocus2List() {

}