var initFunc = {
    config_func: [
        //------------地圖工具------------
        // 類型 : panel, action
        {
            funcId: 'zoomIn',
            name: '放大',
            box: 'action',
            tab: "left-toolbar",
            content: {}
        },
        {
            funcId: 'zoomOut',
            name: '縮小',
            box: 'action',
            tab: "left-toolbar",
            content: {}
        },
        {
            funcId: 'location',
            name: '目前位置',
            box: 'action',
            tab: "left-toolbar",
            content: {}
        },
        {
            funcId: 'propEnabled',
            name: '屬性資料',
            box: 'action',
            tab: "left-toolbar",
            content: {}
        },
        {
            funcId: 'searchPanel',
            name: '道路快搜',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/search/_searchPanel.html',
                css: '/gis/widgets/panel/search/searchPanel.css',
                width: 200,
                height: 250
            }
        },
        {
            funcId: 'painterPanel',
            name: '繪圖板',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/painter/_painterPanel.html',
                css: '/gis/widgets/panel/painter/painterPanel.css',
                width: 320,
                height: 450
            }
        },
        {
            funcId: 'measurePanel',
            name: '測量板',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/measure/_measurePanel.html',
                css: '/gis/widgets/panel/measure/measurePanel.css',
                width: 130,
                height: 150
            }
        },
        {
            funcId: 'searchPropPanel',
            name: '屬性搜尋',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/searchProp/_searchPropPanel.html',
                css: '/gis/widgets/panel/searchProp/searchPropPanel.css',
                width: 500
            }
        },
        {
            funcId: 'focusPanel',
            name: '養工焦點',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/focus/_focusPanel.html',
                css: '/gis/widgets/panel/focus/focusPanel.css',
                width: 450,
                height: 500
            }
        },
        {
            funcId: 'accidentPanel',
            name: '交通事故',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/accident/_accidentPanel.html',
                css: '/gis/widgets/panel/accident/accidentPanel.css',
                width: 450,
                height: 450
            }
        },
        {
            funcId: 'flagPanel',
            name: '權管土地',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/flag/_flagPanel.html',
                css: '/gis/widgets/panel/flag/flagPanel.css',
                width: 500,
                height: 500
            }
        },
        {
            funcId: 'projectPanel',
            name: '專案查詢',
            box: 'panel',
            tab: "left-toolbar",
            content: {
                url: '/gis/widgets/panel/project/_projectPanel.html',
                css: '/gis/widgets/panel/project/projectPanel.css',
                width: 550,
                height: 630
            }
        }
    ]
};

export { initFunc };
