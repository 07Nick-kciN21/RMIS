// main.js
import { initMap } from './index/map.js';
import { generateMenu, bindMenuEvents } from './index/menu.js';
import { initPanel } from './index/panel.js';
import { initSearchPanel } from './index/searchPanel.js'
import {initPainterPanel} from './index/painterPanel.js'

$(document).ready(function () {
    // 初始化地图
    initMap("indexMap");


    var $offcanvasElement = $('#layerListBlock');
    var $indexMapElement = $('#indexMap');

    // 當 offcanvas 開啟時壓縮地圖
    $offcanvasElement.on('shown.bs.offcanvas', function () {
        var offcanvasWidth = $offcanvasElement.outerWidth();
        $indexMapElement.css({
            'transition': 'all 0.3s ease-in-out',
            'margin-left': offcanvasWidth + 'px',
            'width': 'calc(100% - ' + offcanvasWidth + 'px)'
        });
    });

    // 當 offcanvas 關閉時恢復地圖
    $offcanvasElement.on('hidden.bs.offcanvas', function () {
        $indexMapElement.css({
            'margin-left': '0',
            'width': '100%'
        });
    });

    // 生成選單
    var menuHtml = generateMenu(MenuData, "", 0);
    $('#header-layer-list1').html(menuHtml);
    initPanel("searchPanel");
    initPanel("painterPanel");
    initSearchPanel();
    initPainterPanel();
    // 绑定菜单事件
    bindMenuEvents();
});
