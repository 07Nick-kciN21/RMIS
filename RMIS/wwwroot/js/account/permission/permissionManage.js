import { initPage } from "../Pagination.js";

let allPermissions = [];

$(document).ready(function () {
    initPermissionTable();

    $("#createPermission").on("click", function () {
        $('#create-Name').val('');
        $('input[name="create-Status"][value="true"]').prop('checked', true);
        $('#createPermissionModal').modal('show');
    });

    $("#permissionSelector").on("change", function () {
        var selectedPermissionId = $(this).val();
        if (selectedPermissionId == 0) {
            initPermissionTable();
        } else {
            var filteredPermissions = allPermissions.filter((permission) => {
                return permission.id == selectedPermissionId;
            });
            updatePermissionTable(filteredPermissions);
        }
    });

    $("#btn-create-submit").on("click", function () {
        var name = $('#create-Name').val().trim();
        if (!name) { alert('請輸入功能模組名稱'); return; }
        var formData = new FormData();
        formData.append('Name', name);
        formData.append('Status', $('input[name="create-Status"]:checked').val() || 'true');
        $.ajax({
            url: '/Account/Permission/Create',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) {
                    $('#createPermissionModal').modal('hide');
                    initPermissionTable();
                }
            },
            error: function () { alert('提交失敗'); }
        });
    });

    $("#btn-update-submit").on("click", function () {
        var name = $('#update-Name').val().trim();
        if (!name) { alert('請輸入功能模組名稱'); return; }
        var formData = new FormData();
        formData.append('Id', $('#update-Id').val());
        formData.append('Name', name);
        formData.append('Status', $('input[name="update-Status"]:checked').val() || 'true');
        $.ajax({
            url: '/Account/Permission/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) {
                    $('#updatePermissionModal').modal('hide');
                    initPermissionTable();
                }
            },
            error: function () { alert('提交失敗'); }
        });
    });
});

function initPermissionTable() {
    var tbody = $("#permissionTable");
    tbody.empty();
    $.ajax({
        url: '/Account/Permission/Get/ManagerData',
        type: 'POST',
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (data.success) {
                var permissionData = data.permissionManager;
                allPermissions = permissionData.permissions;
                initPage("permissionPage", updatePermissionTable, allPermissions);
                updatePermissionFilter(allPermissions);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function updatePermissionTable(permissions) {
    var tbody = $("#permissionTable");
    tbody.empty();
    permissions.forEach((permission) => {
        var row = $("<tr></tr>").attr("data-permission-id", permission.id);

        var updateBtn = $(`<button class="update-permission read">編輯</button>`).on("click", function () {
            $('#update-Id').val(permission.id);
            $('#update-Name').val(permission.name);
            $(`input[name="update-Status"][value="${permission.status}"]`).prop('checked', true);
            $('#updatePermissionModal').modal('show');
        });

        var deleteBtn = $(`<button class="delete-permission read">刪除</button>`).on("click", function () {
            if (confirm("確定要刪除權限？")) {
                $.ajax({
                    url: `/Account/Permission/Delete?permissionId=${permission.id}`,
                    type: "POST",
                    xhrFields: { withCredentials: true },
                    success: function (data) {
                        alert(data.message);
                        if (data.success) {
                            initPermissionTable();
                        }
                    },
                    error: function (xhr) {
                        console.log("API 錯誤:", xhr.status);
                    }
                });
            }
        });

        row.append(`<td class="name-cell">
                        <span class="read">${permission.name}</span>
                    </td>`);
        row.append(`<td class="status-cell">
            ${permission.status ?
                '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
            }
            <input class="edit d-none form-check-input status" type="checkbox" role="switch" ${permission.status ? 'checked' : ''}>
        </td>`);
        row.append(`<td class="createAt-cell">${convertDate(permission.createAt)}</td>`);

        var actionTd = $("<td class='action-cell'></td>");
        actionTd.append(updateBtn, deleteBtn);
        row.append(actionTd);
        tbody.append(row);
    });
}

function convertDate(createAt) {
    var parts = createAt.split("T");
    return `${parts[0]} ${parts[1].split(".")[0]}`;
}

function updatePermissionFilter(allPermissions) {
    $("#permissionSelector").empty();
    $("#permissionSelector").append(`<option value="0" selected>全部</option>`);
    allPermissions.forEach((permission) => {
        $("#permissionSelector").append(`<option value="${permission.id}">${permission.name}</option>`);
    });
}
