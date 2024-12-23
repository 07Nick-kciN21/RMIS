import {layers, layerProps} from './ctrlMap/layers.js';
import { getIndexMap } from './map.js';

export function initflagPanel(){
    $('#tb-flagPanel').on('click', function(){
        // 如果switch-7abd9458-39f1-436d-af8d-a3526e06ccf0 有 switch-on 類別，則不觸發 click 事件
        if( !$('#switch-7abd9458-39f1-436d-af8d-a3526e06ccf0' ).hasClass('switch-on')) {
            $('#switch-7abd9458-39f1-436d-af8d-a3526e06ccf0').trigger('click');
        };
        if( !$('#switch-b6a495be-937f-4093-8ffb-94d36c217b2b' ).hasClass('switch-on')) {
            $('#switch-b6a495be-937f-4093-8ffb-94d36c217b2b').trigger('click');
        }
    });

    $('#flagGoResult').on('click', function(){
        // 當需要取得選定的單選按鈕值時
        const i = $('input[name="locOcc"]:checked').val();
        const $landSelect = $('#landSelect').val();
        const $adminSelect = $('#adminSelect').val();
        console.log(layerProps);
        console.log(i, $landSelect, $adminSelect);
        const flagProps = layerProps['7abd9458-39f1-436d-af8d-a3526e06ccf0'].length != 0 ? layerProps['7abd9458-39f1-436d-af8d-a3526e06ccf0'] : layerProps['b6a495be-937f-4093-8ffb-94d36c217b2b'];
        // 過濾出"疑似占用類型" == 1 且 地段 == landSelect 的資料
        const result = flagProps.filter(function(item){
            return item['疑似占用類型'] == i && item['地段-名'] == $landSelect && item['鄉鎮市區'] == $adminSelect;
        });
        console.log(result);
        renderTableBody(result);
    });
}

function renderTableBody(result){
    const flagTbody = $('#flagTbody');
    flagTbody.empty();
    let $indexMap = getIndexMap();
    for(let data of result){
        const tableRow = $('<tr></tr>');
        const button = $('<button>目標</button>').on('click', function () {
            $indexMap.setView(data['座標'], 22);
        });
        const flagRow = 
        `
            <td>${data['勘查表編號']}</td>
            <td>${data['清查年度']}</td>
            <td>${data['疑似占用']}</td>
            <td><a href="https://oram-integ.tycg.gov.tw/TYMaintain/Doc/Land/${data['勘查表編號']}.pdf">文件</a></td>
            <td>${data['案件狀態']}</td>
            <td>${data['備註']}</td>
            <td>${data['附件']}</td>
        `; 
        tableRow.append($('<td></td>').append(button));
        tableRow.append(flagRow);
        flagTbody.append(tableRow);
    }
}