import { initPage } from "../Pagination.js";
import { WindowManager } from "../../windowCtl.js";

const wm = new WindowManager();
let allPermissions = [];

$(document).ready(function () {
    initPermissionTable();
    
    $("#createPermission").on("click", function () {
        var windowWidth = 800;
        var windowHeight = 600;
        var screenWidth = window.screen.width;
        var screenHeight = window.screen.height;
        var left = 0 - (screenWidth + windowWidth) / 2;
        var top = (screenHeight - windowHeight) / 2;
        wm.open("createPermissionWindow", "/Account/Permission/Create", windowWidth, windowHeight);
        // window.open('/Account/Permission/Create', 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
    });

    $("#permissionSelector").on("change", function () {
        var selectedPermissionId = $(this).val();
        if(selectedPermissionId == 0){
            initPermissionTable();
        }
        else{
            var filteredPermissions = allPermissions.filter((permission) => {
                return permission.id == selectedPermissionId;
            });
            updatePermissionTable(filteredPermissions);
        }
    });
    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        if(message.success){
            console.log(message);
            initPermissionTable();
        }
        console.log(message.success);
    });
});

function initPermissionTable(){
    var tbody = $("#permissionTable");
    tbody.empty();
    $.ajax({
        url: '/Account/Permission/Get/ManagerData',
        type: 'POST',
        xhrFields: {
            withCredentials: true
        },
        success: function (data) {
            if (data.success) {
                var permissionData = data.permissionManager;
                allPermissions = permissionData.permissions;
                initPage("permissionPage", updatePermissionTable, allPermissions);
                // updatePermissionTable(allPermissions);
                updatePermissionFilter(allPermissions);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function updatePermissionTable(permissions){
    var tbody = $("#permissionTable");
    tbody.empty();
    permissions.forEach((permission) => {
        var row = $("<tr></tr>").attr("data-permission-id", permission.id);
        var updateBtn = $(`<button class="update-permission read">編輯</button>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            wm.open("updatePermissionWindow", `/Account/Permission/Update?id=${permission.id}`, windowWidth, windowHeight);
            // window.open(`/Account/Permission/Update?id=${permission.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
        });
        var deleteBtn = $(`<button class="delete-permission read">刪除</button>`).on("click", function () {
            if (confirm("確定要刪除權限？")) {
                $.ajax({
                    url: `/Account/Permission/Delete?permissionId=${permission.id}`,
                    type: "POST",
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (data) {
                        if (data.success) {
                            alert(data.message);
                            location.reload();
                        }
                        else{
                            alert(data.message);
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
        // 狀態根據status顯示啟用或停用
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

function convertDate(createAt){
    var createAt = createAt.split("T");
    var createAtDate = createAt[0];
    var createAtTime = createAt[1].split(".")[0];
    return `${createAtDate} ${createAtTime}`;
}

function updatePermissionFilter(allPermissions){
    $("#permissionSelector").empty();
    $("#permissionSelector").append(`<option value="0" selected>全部</option>`);
    allPermissions.forEach((permission) => {
        var option = $(`<option value="${permission.id}">${permission.name}</option>`);
        $("#permissionSelector").append(option);
    });
}

