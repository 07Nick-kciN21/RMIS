let initialSelectedValues = [];
let currentSelectedValues = [];
$(document).ready(function () {
    initPipelineAccess();
    $('#submit').on('click', function (e) {
        currentSelectedValues = $('#pipelineAccess').val() || [];
        const added = currentSelectedValues.filter(id => !initialSelectedValues.includes(id));
        const removed = initialSelectedValues.filter(id => !currentSelectedValues.includes(id));
        console.log("Added:", added);
        console.log("Removed:", removed);
        console.log("Added:", added);
        console.log("Removed:", removed);
        e.preventDefault(); // 阻止預設提交行為

        let formData = new FormData();

        // 添加 RoleId 和 RoleName
        formData.append("Id", $('input[name="Id"]').val());
        formData.append("Name", $('input[name="Name"]').val());

        // 取得選中的 Status
        let status = $('input[name="Status"]:checked').val();
        formData.append("Status", status ? status : '');
        // 正確附加陣列（多次 append 同一個 key）
        added.forEach(id => formData.append("Added", id));
        removed.forEach(id => formData.append("Removed", id));
        $.ajax({
            url: '/Account/Department/Update',
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
                }
                else{
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
    $('#get').on('click', function (e) {
        e.preventDefault();
        currentSelectedValues = $('#pipelineAccess').val() || [];
        const added = currentSelectedValues.filter(id => !initialSelectedValues.includes(id));
        const removed = initialSelectedValues.filter(id => !currentSelectedValues.includes(id));
        console.log("initialSelectedValues:", initialSelectedValues);
        console.log("currentSelectedValues:", currentSelectedValues);
        console.log("Added:", added);
        console.log("Removed:", removed);
    });
});

function initPipelineAccess(){
    function getQueryParam(name) {
        const results = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
      }
    var id = getQueryParam("id");
    $.ajax({
        url: `/Account/Department/Get/PipelineAccess?id=${id}`,
        type: 'POST',
        processData: false,
        contentType: false,
        dataType: 'json',
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (result) {
            if (result.success) {
                var data = JSON.parse(result.data);
                var $select = $('#pipelineAccess');
                $select.empty(); // 清空舊選項
                populateSelectFromTree(data, $select); // 建立階層選單

                // 初始化 select2 並加上自訂樣式
                $select.select2({
                    placeholder: '請選擇管線',
                    width: '100%',
                    templateResult: function (data) {
                        if (!data.id) return data.text;

                        const isDisabled = $(data.element).prop('disabled');
                        const level = $(data.element).data('level') || 0;
                        const indent = '&emsp;'.repeat(level);
                        const label = isDisabled
                            ? `<strong>${data.text}</strong>`
                            : data.text;
                        return $('<span>').html(indent + label);
                    },
                    templateSelection: function (data) {
                        return data.text;
                    }
                }).on('select2:open', function () {
                    if (initialSelectedValues.length === 0) {
                        initialSelectedValues = $select.val() || [];
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

// 將階層資料放入 select 的函式
function populateSelectFromTree(data, $select, level = 0) {
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.text;
        option.setAttribute('data-level', level);

        if (item.tag === 'node') {
            option.disabled = true;
        }

        if (item.selected) {
            option.selected = true;
        }

        $select.append(option);

        // 遞迴處理子節點
        if (Array.isArray(item.children) && item.children.length > 0) {
            populateSelectFromTree(item.children, $select, level + 1);
        }
    });
}

