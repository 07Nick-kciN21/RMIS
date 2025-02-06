const fieldMapping = {
    "dataId": "圖資編號",
    "name": "圖資名稱",
    "releaseLocation": "圖資發布位置",
    "conversionUnit": "轉製單位",
    "layerCoverage": "圖層覆蓋率",
    "updateFrequency": "更新頻率",
    "releaseDate": "上架時間",
    "providingUnit": "供應單位",
    "dataContactPerson": "圖資聯絡人",
    "contactPhoneNumber": "連絡電話",
    "contactEmail": "聯絡人電子郵件",
    "dataSummary": "圖資摘要",
    "referenceSystemInfo": "參考系統資訊",
    "metadataUpdateTime": "詮釋資料更新時間",
    "dataType": "圖資類型",
    "displayScale": "顯示比例尺"
};


export function openPanel(metaData) {
    $('#metaDataPanel').removeClass('hide');
    console.log("metaData", metaData);
    // metaDataPanel 下的 class="panelBody" jquery
    const $panelBody = $('#metaDataPanel .panelBody');
    // 清空 panelBody
    $panelBody.empty();
    const $table = $('<table class="table">');
    const $tbody = $('<tbody>');
    $table.append($tbody);
    
    Object.keys(metaData).forEach(key => {
        // 如果key不在fieldMapping中，則不顯示
        if (!fieldMapping[key]) {
            return;
        }
        const displayName = fieldMapping[key]; // 若無對應則顯示原始名稱
        const $tr = $('<tr>');
        const $th = $('<th>').text(displayName + ' : ');
        const $td = $('<td>').text(metaData[key]);
        $tr.append($th);
        $tr.append($td);
        $tbody.append($tr);
    });
    // panelBody添加table
    $panelBody.append($table);
}