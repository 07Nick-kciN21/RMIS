import { initPage } from "../Pagination.js";

let allRoles = [];

$(document).ready(function () {
    initRoleTable();

    $('#roleSelector').on('change', function () {
        var selectedRoleId = $(this).val();
        if(selectedRoleId == 0){
            initRoleTable(allRoles);
        }
        else{
            var filteredRoles = allRoles.filter((role) => {
                return role.id == selectedRoleId;
            });
            updateRoleTable(filteredRoles);
        }
    });

    $('#createRole').on('click', function () {
        var windowWidth = 800;
        var windowHeight = 600;
        // 獲取螢幕的寬高
        var screenWidth = window.screen.width;
        var screenHeight = window.screen.height;
        // 計算彈出視窗的位置
        var left = 0 - (screenWidth + windowWidth) / 2;
        var top = (screenHeight - windowHeight) / 2;
        window.open("/Account/Role/Create", 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
    });
    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        if(message.success){
            console.log("message.success");
            // 重整頁面
            initRoleTable();
        }
        console.log(message.success);
    });
});

function initRoleTable(){
    $.ajax({
        url: '/Account/Role/Get/ManagerData',
        type: 'POST',
        xhrFields: {
            withCredentials: true
        },
        success: function (data) {
            if (data.success) {
                var managerData = data.roleManager;
                allRoles = managerData.roles;
                initPage("rolePage", updateRoleTable, allRoles);
                // updateRoleTable(allRoles);
                updateRoleFilter(allRoles);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function updateRoleFilter(allRoles){
    console.log(allRoles);
    $('#roleSelector').empty();
    $('#roleSelector').append(`<option value="0" selected>全部</option>`);
    allRoles.forEach((role) => {
        $('#roleSelector').append(`<option value="${role.id}"}>${role.name}</option>`);
    });
}

function updateRoleTable(roles){
    var tbody = $('#roleTable');
    tbody.empty();
    roles.forEach((role) => {
        var moreBtn = $(`<a class="more-role read">more</a>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            // 開啟新視窗，顯示角色的權限
            newWindow = window.open(`/Account/Role/Read/Permission?id=${role.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
            console.log("more");
        });
        var updateBtn = $(`<button class="update-role read">編輯</button>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            window.open(`/Account/Role/Update?id=${role.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
            console.log("more");
        });
        var deleteBtn = $(`<button class="delete-role read">刪除</button>`).on("click", function () {
            if(confirm("確定要刪除身分？")){
                // 刪除角色
                $.ajax({
                    url: `/Account/Role/Delete?id=${role.id}`,
                    type: 'POST',
                    processData: false,
                    contentType: false,
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function (data) {
                        if (data.success) {
                            console.log("刪除成功");
                            alert(data.message);
                            location.reload();
                        }
                        else{
                            console.log("刪除失敗");
                            alert(data.message);
                        }
                    },
                    error: function (xhr) {
                        console.log("刪除失敗:", xhr.status);
                    }
                });
            }
        });
        var row = $("<tr>").attr({
            "data-role-id": role.id,
        });
        row.append($(`<td class="name-cell">
                        <span class="read">${role.name}</span>
                    </td>`));
        row.append($(`<td class="permission-cell"></td>`).append(moreBtn));
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
            ${role.status ? 
                '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
            }
            <input class="edit d-none form-check-input status" type="checkbox" role="switch" ${role.status ? 'checked' : ''}>
        </td>`);
        row.append(`<td class="createAt-cell">${convertDate(role.createAt)}</td>`);
        
        // 建立操作按鈕
        var actionTd = $("<td class='action-cell'></td>");        
        // 將按鈕 append 進 td，再 append 到 tr
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