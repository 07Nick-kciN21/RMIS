$(document).ready(function () {
    initRoleTable();

    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        console.log(message);
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
                updateRoleTable(allRoles);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function updateRoleTable(roles){
    var tbody = $('#roleTable');
    tbody.empty();
    roles.forEach((role, index) => {
        var moreBtn = $(`<button class="btn btn-primary more-role read">more</button>`).on("click", function () {
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
        var updateBtn = $(`<button class="btn btn-primary update-role read">編輯</button>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            newWindow = window.open(`/Account/Role/Update?id=${role.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
            console.log("more");
        });
        var row = $("<tr>").attr({
            "data-role-id": role.id,
        });
        row.append($(`<td class="name-cell">
                        <span class="read">${role.name}</span>
                    </td>`));
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
            ${role.status ? 
                '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
            }
            <input class="edit d-none form-check-input status" type="checkbox" role="switch" ${role.status ? 'checked' : ''}>
        </td>`);
        row.append(`<td class="createAt-cell">${convertDate(role.createAt)}</td>`);
        
        row.append($(`<td class="permission-cell"></td>`).append(moreBtn));
        // 建立操作按鈕
        var actionTd = $("<td class='action-cell'></td>");
        var saveButton = $('<button class="btn btn-success save-role edit d-none">儲存</button>');
        var deleteButton = $(`<button class="btn btn-danger delete-role read">刪除</button>`);
        var cancelButton = $(`<button class="btn btn-secondary cancel-role edit d-none">取消</button>`);
        
        // 將按鈕 append 進 td，再 append 到 tr
        actionTd.append(updateBtn, saveButton, deleteButton, cancelButton);
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