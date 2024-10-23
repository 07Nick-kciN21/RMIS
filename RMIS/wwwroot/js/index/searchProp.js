import { layerProps } from './layers.js'

export function initSearchPropPanel() {
    $(document).ready(function () {

        $('input[name="btnradio"]').on('change', function () {
            updateSelect('#pFeatSelect');
            updateSelect('#gFeatSelect');
            if ($(this).next('label').text() == '依屬性') {
                $('#prop1').css('display', 'block');
                $('#prop2').css('display', 'none');
            }
            else {
                $('#prop2').css('display', 'block');
                $('#prop1').css('display', 'none');
            }
            console.log($(this).next('label').text() + ' 被選取');
        });
        $('#pFeatSelect').on('change', function () {
            var selectedId = $(this).val();
            if (selectedId == -1) {
                console.log(null);
            }
            else {
                var prop = layerProps[selectedId][0];
                if (typeof prop === 'string') {
                    prop = prop.replace(/NaN/g, 'null');
                    try {
                        prop = JSON.parse(prop);
                    } catch (e) {
                        console.error("無法解析 JSON:", e);
                        return "無效的 JSON 資料";
                    }
                }
                Object.keys(prop).forEach(key => {
                    $('#propFieldList').append($(`<li data-field="${key}">${key}</li>`));
                    console.log(key);
                });
            }
        });
    });
}

function updateSelect(featSelect) {
    var $propSelect = $(featSelect);
    $propSelect.empty();
    $propSelect.append($("<option></option>").val(-1).text("請選擇"));
    $('.layerBar').each(function () {
        var name = $(this).find('.layerName')
        var value = $(this).attr('id').replace('layerBar_', '');
        console.log($(this).find('.layerName').text().trim());
        $propSelect.append($("<option></option>").val(value).text(name.text().trim()));
    });
}