$(document).ready(function () {
    $('.check-all-row').on('change', function () {
        const index = $(this).data('index');
        const isChecked = $(this).prop('checked');
        console.log(index);
        $(`.perm-checkbox[data-index="${index}"]`).prop('checked', isChecked);
    });
    $('#submit').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為

        let formData = new FormData();

        // 添加 RoleId 和 RoleName
        formData.append("RoleId", $('input[name="RoleId"]').val());
        formData.append("RoleName", $('input[name="RoleName"]').val());

        // 取得選中的 Status
        let status = $('input[name="Status"]:checked').val();
        formData.append("Status", status ? status : '');

        // 遍歷權限表格
        $('#permissionBody tr').each(function (index) {
            let permissionId = $(this).find('input[name^="Permissions"][type="hidden"]').val();
            formData.append(`Permissions[${index}].PermissionId`, permissionId);

            $(this).find('input[type="checkbox"][name^="Permissions"]').each(function () {
                let fieldName = $(this).attr('name').match(/\.(\w+)$/)[1]; // 取得欄位名稱 (Read, Create, Update, Delete, Export)
                formData.append(`Permissions[${index}].${fieldName}`, $(this).is(':checked'));
            });
        });
        console.log(formData);
        $.ajax({
            url: '/Account/Role/Update',
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
});
