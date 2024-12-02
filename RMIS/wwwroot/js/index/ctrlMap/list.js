﻿import { layerList } from './menu.js';
import { removePipeline, addPipeline } from './pipeline.js';
import { addLayer2Map } from './layers.js';


// 圖資清單控制
export function add2List(id, name, datas) {
    let sections = "";
    datas.forEach(function (data) {
        var section = `
            <div class="section" id="section_${data.id}">
                <span class="section_icon" style="background-image: url('/img/${data.svg}');"></span>
                ${data.name}
            </div>
        `;
        sections += section;
    });
    let layerItem = `
        <div class="layerBar featureLayer-Bg" id="layerBar_${id}">
            <div class="layerTitle" style="border-top">
                <div style="display: flex; border-bottom: solid 1px green;"> 
                    <span class="menu-icon menu-open" id="layerLegend_${id}"></span>
                    <div class="layerName">${name}</div>
                </div>
                <div id="sections_${id}">
                    ${sections}
                </div>
                
            </div>
            <div class="eye eyeOpen" id="eye_${id}"></div>
            <div class="layerRemove" id="layerRemove_${id}"></div>
        </div>
    `;
    $('#layerBarContainer').append(layerItem);

    $(`#eye_${id}`).on('click', function (e) {
        if ($(this).hasClass('eyeOpen')) {
            closeLayer(id);
            $(this).removeClass('eyeOpen');
            $(this).addClass('eyeClosed');
        } else {
            displayLayer(id);
            $(this).removeClass('eyeClosed');
            $(this).addClass('eyeOpen');
        }
    });

    $(`#layerLegend_${id}`).on('click', function (e) {
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
    $(`#layerRemove_${id}`).on('click', function (e) {
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

export function remove2List(id) {
    let $layerList = $(".layerList");
    $layerList.find('#layerBar_' + id).remove();
    layerList[id] = false;
}

export function closeLayer(id) {
    removePipeline(id);
    layerList[id] = false;
}

export function displayLayer(id) {
    addPipeline(id).then(result => {
        layerList[id] = true;
        addLayer2Map(id, result);
    });
}
