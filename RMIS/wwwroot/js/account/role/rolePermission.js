$(document).ready(function () {
    // 初始顯示第一個角色的權限
    let firstRole = $('#roleSelector').val();
    let currentRoleId = "@Model.RoleId"; // 初始 Admin 角色 ID
    $(`#role-${firstRole}`).show();

    // 切換角色時請求新的權限
    $('#roleSelector').on('change', function () {
        let selectedRole = $(this).val();
        $.ajax({
            url: '/Account/RolePermissions/Get',
            type: 'GET',
            data: { roleName: selectedRole },
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                if (data) {
                    console.log(data);
                    currentRoleId = data.roleId;
                    let tbody = $('#permissionBody');
                    tbody.empty(); // 清空舊資料
    
                    data.permissions.forEach((perm, index) => {
                        let row = `
                        <tr>
                            <td class="permissionName">${perm.permissionName}</td>
                            <td>
                                <input type="hidden" name="Permissions[${index}].Read" value="false">
                                <input type="checkbox" name="Permissions[${index}].Read" value="true" ${perm.read ? 'checked' : ''}>
                            </td>
                            <td>
                                <input type="hidden" name="Permissions[${index}].Create" value="false">
                                <input type="checkbox" name="Permissions[${index}].Create" value="true" ${perm.create ? 'checked' : ''}>
                            </td>
                            <td>
                                <input type="hidden" name="Permissions[${index}].Update" value="false">
                                <input type="checkbox" name="Permissions[${index}].Update" value="true" ${perm.update ? 'checked' : ''}>
                            </td>
                            <td>
                                <input type="hidden" name="Permissions[${index}].Delete" value="false">
                                <input type="checkbox" name="Permissions[${index}].Delete" value="true" ${perm.delete ? 'checked' : ''}>
                            </td>
                            <td>
                                <input type="hidden" name="Permissions[${index}].Export" value="false">
                                <input type="checkbox" name="Permissions[${index}].Export" value="true" ${perm.export ? 'checked' : ''}>
                            </td>
                            <td>
                                <input type="checkbox" class="check-all-row" data-index="${index}"> 全部
                            </td>
                        </tr>`;
                        tbody.append(row);
                    });
                    $('.check-all-row').on('change', function () {
                        const index = $(this).data('index');
                        const isChecked = $(this).prop('checked');
                        $(`.perm-checkbox[data-index="${index}"]`).prop('checked', isChecked);
                    });
                }
            },
            error: function (xhr) {
                console.log("API 錯誤:", xhr.status);
            }
        });
    });
    

    // 儲存變更
    $('#saveChanges').on('click', function (e) {
        e.preventDefault();

        let formData = new FormData();
        formData.append("RoleId", currentRoleId); // 加入 RoleId

        $('#permissionBody tr').each(function (index) {
            let permName = $(this).find('.permissionName').text();
            let read = $(this).find(`input[name="Permissions[${index}].Read"]`).is(':checked') ? "true" : "false";
            let create = $(this).find(`input[name="Permissions[${index}].Create"]`).is(':checked') ? "true" : "false";
            let update = $(this).find(`input[name="Permissions[${index}].Update"]`).is(':checked') ? "true" : "false";
            let del = $(this).find(`input[name="Permissions[${index}].Delete"]`).is(':checked') ? "true" : "false";
            let exportData = $(this).find(`input[name="Permissions[${index}].Export"]`).is(':checked') ? "true" : "false";
            formData.append(`Permissions[${index}].PermissionName`, permName);
            formData.append(`Permissions[${index}].Read`, read);
            formData.append(`Permissions[${index}].Create`, create);
            formData.append(`Permissions[${index}].Update`, update);
            formData.append(`Permissions[${index}].Delete`, del);
            formData.append(`Permissions[${index}].Export`, exportData);
        });

        $.ajax({
            url: '/Account/RolePermission/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            success: function () {
                alert('儲存成功！');
            },
            error: function () {
                alert('儲存失敗，請檢查權限！');
            }
        });
    });
});