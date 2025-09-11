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
          funcId: 'searchPanel', name: '繪圖板', box: 'panel',
          url: '/gis/widgets/panel/search/_searchPanel.html', 
          css: '/gis/widgets/panel/search/searchPanel.css',
          width: 400, height: 270
        },
      ]
};

export { initFunc };