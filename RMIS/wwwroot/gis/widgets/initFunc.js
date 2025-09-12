var initFunc = {
    config_func: [
        //------------地圖工具------------
        // 類型 : panel, 
        // 位置 : 左側欄位 右上菜單 右下位
        // 尺寸 : 寬度 高度
        {
          funcId: 'painterPanel', name: '繪圖板', box: 'panel',
          url: '/gis/widgets/panel/painter/_painterPanel.html', 
          css: '/gis/widgets/panel/painter/painterPanel.css',
          width: 320, height: 450
        },
        {
          funcId: 'searchPanel', name: '道路查詢', box: 'panel',
          url: '/gis/widgets/panel/search/_searchPanel.html', 
          css: '/gis/widgets/panel/search/searchPanel.css',
          width: 400, height: 270
        },
        {
          funcId: 'measurePanel', name: '測量板', box: 'panel',
          url: '/gis/widgets/panel/measure/_measurePanel.html', 
          css: '/gis/widgets/panel/measure/measurePanel.css',
          width: 130, height: 150
        },
        {
          funcId: 'focusPanel', name: '養工焦點', box: 'panel',
          url: '/gis/widgets/panel/focus/_focusPanel.html', 
          css: '/gis/widgets/panel/focus/focusPanel.css',
          width: 450, height: 500
        },
      ]
};

export { initFunc };