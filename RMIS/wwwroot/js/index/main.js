// main.js

import { initMap } from './map.js';
import { generateMenu, bindMenuEvents } from './menu.js';

$(document).ready(function () {
    // 初始化地图
    initMap("indexMap");

    // 生成選單
    var menuHtml = generateMenu(MenuData, "", 0);
    $('#header-layer-list1').html(menuHtml);

    // 绑定菜单事件
    bindMenuEvents();
});
