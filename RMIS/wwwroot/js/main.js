// main.js
import { initMap } from './index/map.js';
import { generateMenu, bindMenuEvents } from './index/ctrlMap/menu.js';
import { initPanel } from './index/panel.js';
import { initSearchPanel } from './index/searchPanel.js'
import { initPainterPanel } from './index/painterPanel.js'
import { initPhoto } from './index/photo.js'
import { initSearchPropPanel } from './index/propPanel/searchPropPanel.js'
$(document).ready(function () {
    // 初始化地图
    initMap("indexMap");

    // 生成選單
    var menuHtml = generateMenu(MenuData, "", 0);
    $('#top-vav-list1').html(menuHtml);
    initPanel("searchPanel");
    initPanel("searchPanel2");
    initPanel("painterPanel");
    initPanel("searchPropPanel");
    initSearchPanel();
    initPainterPanel();
    initPhoto();
    initSearchPropPanel();

    bindMenuEvents();
});
