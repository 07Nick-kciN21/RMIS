import { layers, layerProps } from './ctrlMap/layers.js';


export function initFocusPanel(){
    $('#focusGoResult').on('click', function(){
        var formData = new FormData();
        // focusStartDate與focusEndDate，轉換成時間戳記
        formData.append('FocusStartDate', new Date($('#focusStartDate').val()).getTime());
        formData.append('FocusEndDate', new Date($('#focusEndDate').val()).getTime());
        formData.append('FocusType', $('#ofType').val());
        console.log(new Date($('#focusStartDate').val()).getTime(), new Date($('#focusEndDate').val()).getTime());
        fetch(`/api/AdminAPI/getFocusData`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // 取得搜尋後管線的資料
            
        })
    });
}