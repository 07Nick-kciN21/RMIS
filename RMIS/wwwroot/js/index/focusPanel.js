import { layers, layerProps } from './ctrlMap/layers.js';


export function initFocusPanel(){
    let focusProps = [];
    let id;

    $('#focusGoResult').on('click', function(){
        // focusStartDate與focusEndDate，轉換成時間戳記
        const focusStartDate = new Date($('#focusStartDate').val()).getTime();
        const focusEndDate = new Date($('#focusEndDate').val()).getTime();

        fetch(`/api/AdminAPI/getFocusedPipelines?selectType=${2}`, {method: 'POST'})
        .then(response => response.json())
        .then(data => {
            // 從圖層加載完成
            return Promise.all(data['pipelines'].map(pipeline => {
            pipeline = pipeline.toLowerCase();
            if($(`#switch-${pipeline}`).hasClass('switch-off')){
                $(`#${pipeline}`).click();
                id = pipeline;
                console.log(`#${id} click`);
            }
            }));
        })
        .then(() => {
            focusProps = layerProps[id];
            // 篩選 租借起始日 >= focusStartDate && 租借結束日 <= focusEndDate
            let filterProps = focusProps.filter(prop => {
                return prop['租借起始日'] >= focusStartDate && prop['租借結束日'] <= focusEndDate;
            });
            
        });
    });
}