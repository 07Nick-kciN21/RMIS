const fixedFields = [
    "圖資編號",
    "圖資名稱",
    "圖資發布位置",
    "轉製單位",
    "圖層覆蓋率",
    "更新頻率",
    "上架時間",
    "供應單位",
    "圖資聯絡人",
    "連絡電話",
    "聯絡人電子郵件",
    "圖資摘要",
    "參考系統資訊",
    "詮釋資料更新時間",
    "圖資類型",
    "顯示比例尺"
];

$(document).ready(function () {
    var id = getQueryParam("id");
    var categoryId = $("#CategoryId").val();
    initCategories(id, categoryId);
    initDatainfo(id);
    $("#submit").on("click", function (e) {
        e.preventDefault(); // 阻止預設提交行為
        // 取得form的資料轉換成formdata
        let formData = new FormData();
        formData.append("Id", $('input[name="Id"]').val());
        formData.append("Name", $('input[name="Name"]').val());
        formData.append("CategoryId", $('#CategorySelect').val());
        formData.append("ManagementUnit", $('input[name="ManagementUnit"]').val());
        $.ajax({
            url: '/Mapdata/General/Update/Pipeline',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                if (data.success) {
                    alert(data.message);
                    window.opener.postMessage(JSON.stringify({ success: true }), window.location.origin);
                    window.close();
                } else {
                    alert(data.message);
                    window.opener.postMessage(JSON.stringify({ success: false }), window.location.origin);
                    window.close();
                }
            },
            error: function (xhr, status, error) {
                alert('提交失敗');
                console.error(error);
                window.opener.postMessage(
                    JSON.stringify({ success: false }), 
                    window.location.origin,
                );
                window.close();
            }
        });
    });

    $("#cancel").on("click", function () {
        window.close();
    });

    $('#datainfo-Save').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        const data = {};
        
        // 遍歷所有 input 與 textarea 並收集值
        $('#dataInfo').find('input, textarea').each(function () {
            const key = $(this).attr('name');
            const value = $(this).val();
            data[key] = value;
        });
    
        console.log('收集的 JSON 資料：', data);
    
        // 如需轉成 JSON 字串 
        const datainfoStr = JSON.stringify(data);
        // 使用formdata
        let formData = new FormData();
        formData.append("Id", id);
        formData.append("Datainfo", datainfoStr);
        for (const value of formData.values()) {
            console.log(value);
        }
        // 可送出 AJAX 或其他處理
        $.ajax({
            url: '/Mapdata/General/Update/Datainfo',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                alert(data.message);
                // 關閉 modal
                $('#dataInfo').modal('hide');
            },
            error: function (xhr, status, error) {
                alert('提交失敗');
                console.error(error);
                $('#dataInfo').modal('hide');
            }
        });
    });

    $("#datainfo-cancel").on("click", function () {
        console.log("取消按鈕被點擊了！");
        $('#resetdataInfo').modal('hide');
    });
});
function getQueryParam(name) {
    const results = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.href);
    return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
}
function initCategories(id, categoryId){    
    $.ajax({
        url: `/Mapdata/Department/Get/PipelineAccess?id=${id}`,
        type: 'POST',
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (result) {
            if (result.success) {
                var data = JSON.parse(result.data);
                var $select = $('#CategorySelect');
                console.log(data);
                $select.empty(); // 清空舊選項
                populateSelectFromTree(data, $select, 0, id); // 建立階層選單
                $select.val(categoryId).trigger('change');
                // 初始化 select2 並加上自訂樣式
                $select.select2({
                    placeholder: '請選擇管線',
                    theme: 'bootstrap-5',
                    minimumResultsForSearch: Infinity,
                    templateResult: function (data) {
                        if (!data.id) return data.text;

                        const $element = $(data.element);
                        const level = $element.data('level') || 0;
                        const isHighlighted = $element.data('highlight') === true;
                        const indent = '&emsp;'.repeat(level * 2);
                        const label = isHighlighted
                            ? `<span style="color:red;">${data.text}</span>`
                            : data.text;

                        return $('<span>').html(indent + label);
                    },
                    templateSelection: function (data) {
                        const $element = $(data.element);
                        const isHighlighted = $element.data('highlight') === true;
                        const label = isHighlighted
                            ? `<span style="color:red;">${data.text}</span>`
                            : data.text;

                        return $('<span>').html(label);
                    }
                });
            } else {
                console.error(result.message);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching pipeline access:', error);
        }
    });
}

function initDatainfo(id){
    $.ajax({
        url: `/Mapdata/General/Get/Datainfo?id=${id}`,
        type: 'POST',
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (result) {
            const $modalBody = $('#dataInfo');
            $modalBody.empty(); // 清空舊資料
        
            const $table = $('<table class="table">');
            const $tbody = $('<tbody>');
            $table.append($tbody);
        
            let datainfo = {};
        
            if (result.success) {
                if (result.datainfo != null) {
                    try {
                        datainfo = JSON.parse(result.datainfo);
                    } catch (e) {
                        console.error('JSON parse error:', e);
                    }
                }
        
                fixedFields.forEach(field => {
                    const $tr = $('<tr class="table-row">');
                    const $th = $('<th class="col-sm-4">').text(field + ' : ');
        
                    const $td = $('<td class="col-sm-8">');
                    // 圖資摘要跟轉製單位的欄位要改成 textarea
                    if (field == "圖資摘要" || field == "轉製單位") {
                        const $textarea = $('<textarea class="form-control"></textarea>').val(datainfo[field] || '');
                        $textarea.attr("name", field);
                        $td.append($textarea);
                    } else {
                        const $input = $('<input type="text" class="form-control">').val(datainfo[field] || '');
                        $input.attr("name", field);
                        $td.append($input);
                    }
                    $tr.append($th);
                    $tr.append($td);
                    $tbody.append($tr);
                });
        
                $modalBody.append($table);
            } else {
                console.error(result.message);
            }
        
            console.log(`/Mapdata/General/Get/Datainfo?id=${id}`);
        },
        
    });    
}

// 將階層資料放入 select 的函式
function populateSelectFromTree(data, $select, level = 0, id) {
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.text;
        option.setAttribute('data-level', level);

        // 是否為紅色高亮顯示
        if (id == item.id) {
            option.setAttribute('data-highlight', 'true');
        }

        // 禁用 pipeline 標籤的項目
        if (item.tag === 'pipeline') {
            option.disabled = true;
        }

        // 選取狀態
        if (item.selected) {
            option.selected = true;
        }

        $select.append(option);

        // 遞迴處理子節點
        if (Array.isArray(item.children) && item.children.length > 0) {
            populateSelectFromTree(item.children, $select, level + 1, id);
        }
    });
}