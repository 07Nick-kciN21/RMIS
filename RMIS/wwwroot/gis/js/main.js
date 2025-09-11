// main.js
import { Map } from './index/map_test.js'
import { initMap } from './index/map.js';
import { initMenu } from './index/ctrlMap/menu.js';
import { initCommonLink } from './index/commonLink.js';
import { initPanel } from './index/panel.js';
import { initSearchPanel } from './index/searchPanel.js'
import { initPainterPanel } from './index/painterPanel.js'
import { initPhoto } from './index/photo.js'
import { initSearchPropPanel } from './index/propPanel/searchPropPanel.js'
import { initModal } from './index/modal.js';
import { initMeasurePanel } from './index/measure.js';
import { initFlagPanel } from './index/flagPanel.js';
import { initFocusPanel } from './index/focusPanel.js';
import { initProjectPanel } from './index/projectPanel.js';
import { initAccidentPanel } from './index/accidentPanel.js';


$(document).ready(function () {
    // 初始化地图
    Map.init("indexMap");
    // initMap("indexMap");
    initMenu();
    initCommonLink();
    initModal();
    initPanel("metaDataPanel");
    initPanel("searchPanel");
    initPanel("painterPanel");
    initPanel("searchPropPanel");
    initPanel("measurePanel");
    initPanel("flagPanel");
    initPanel("focusPanel");
    initPanel("accidentPanel");
    initPanel("projectPanel");
    initSearchPanel();
    initPainterPanel();
    initPhoto();
    initSearchPropPanel();
    initMeasurePanel();
    initFlagPanel();
    initFocusPanel();
    initProjectPanel();
    initAccidentPanel();
});
