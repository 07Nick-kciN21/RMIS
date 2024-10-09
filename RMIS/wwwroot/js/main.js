// main.js

import { initMap } from './index/map.js';
import { generateMenu, bindMenuEvents } from './index/menu.js';
import { initMovablePanel } from './index/panel.js';
$(document).ready(function () {
    // 初始化地图
    initMap("indexMap");

    // 生成選單
    var menuHtml = generateMenu(MenuData, "", 0);
    $('#header-layer-list1').html(menuHtml);
    initMovablePanel();
    // 绑定菜单事件
    bindMenuEvents();
});
