// main.js
import { initMap } from './index/map.js';
import { generateMenu, bindMenuEvents } from './index/menu.js';
import { initPanel } from './index/panel.js';
import { initSearchPanel } from './index/searchPanel.js'
import {initPainterPanel} from './index/painterPanel.js'

$(document).ready(function () {
    // 初始化地图
    initMap("indexMap");

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
