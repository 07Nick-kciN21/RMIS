// main.js
import { Map } from './index/map_test.js'
import { initMap } from './index/map.js';
import { initMenu } from './index/ctrlMap/menu.js';
// import { initCommonLink } from './index/commonLink.js';
import { initPanel } from './index/panel.js';
import { initSearchPanel } from './index/searchPanel.js'
import { initPainterPanel } from './index/painterPanel.js'
import { initPhoto } from './index/photo.js'
import { initSearchPropPanel } from './index/propPanel/searchPropPanel.js'
// import { initModal } from './index/modal.js';
import { initMeasurePanel } from './index/measure.js';
import { initFlagPanel } from './index/flagPanel.js';
import { initFocusPanel } from './index/focusPanel.js';
import { initProjectPanel } from './index/projectPanel.js';
import { initAccidentPanel } from './index/accidentPanel.js';

import BoxManager from './index/box.js';
import ProjectBox from './index/projectBox.js';
import ProcessBox from './index/processBox.js';
import RoadProjectView from './index/roadProjectView.js';
import RoadProjectAdd from './index/roadProjectAdd.js';
import RoadProjectEdit from './index/roadProjectEdit.js';
import RoadProjectImport from './index/roadProjectImport.js';

// 供非 module 腳本 (例如 dashboardBox.js) 呼叫
window.BoxManager = BoxManager;
window.RoadProjectView = RoadProjectView;

$(document).ready(function () {
    // 各面板的權限旗標。頁面若沒有設定 window.panelPermissions（例如舊版頁面），預設視為有權限，維持原本行為
    const perm = window.panelPermissions || {};
    const canUse = (name) => perm[name] ?? true;

    // 初始化地图
    Map.init("indexMap");
    // initMap("indexMap");
    initMenu();
    // initCommonLink();
    // initModal();
    initPanel("metaDataPanel");
    initPanel("searchPanel");
    initPanel("painterPanel");
    initPanel("measurePanel");
    if (canUse("searchPropPanel")) initPanel("searchPropPanel");
    if (canUse("flagPanel")) initPanel("flagPanel");
    if (canUse("focusPanel")) initPanel("focusPanel");
    if (canUse("accidentPanel")) initPanel("accidentPanel");
    // initPanel("projectPanel");
    initSearchPanel();
    initPainterPanel();
    initPhoto();
    initMeasurePanel();
    if (canUse("searchPropPanel")) initSearchPropPanel();
    if (canUse("flagPanel")) initFlagPanel();
    if (canUse("focusPanel")) initFocusPanel();
    if (canUse("accidentPanel")) initAccidentPanel();

    BoxManager.initFullBox();
    BoxManager.initRightBox();
    BoxManager.initLeftBox();

    ProjectBox.init();
    ProcessBox.init();
    RoadProjectView.init();
    RoadProjectAdd.init();
    RoadProjectEdit.init();
    RoadProjectImport.init();
});
