
var departmentSelect = "";
var allUsers = [];
var allRoles = [];
var allDepartments = [];

$(document).ready(function () {
    initUserTable();
    $("#departmentSelector").on("change", function () {
        var selectedDepartment = $(this).val();
        if(selectedDepartment == 0){
            updateUserTable(allUsers);
            return;
        }
        // 透過 selectedDepartment 過濾 allUsers
        var filteredUsers = allUsers.filter((user) => {
            return user.departmentId == selectedDepartment;
        });
        updateUserTable(filteredUsers);
        console.log(selectedDepartment, filteredUsers);
    });
    $("#createUser").on("click", function () {
        var windowWidth = 800;
        var windowHeight = 600;
        // 獲取螢幕的寬高
        var screenWidth = window.screen.width;
        var screenHeight = window.screen.height;
        // 計算彈出視窗的位置
        var left = 0 - (screenWidth + windowWidth) / 2;
        var top = (screenHeight - windowHeight) / 2;
        newWindow = window.open("/Account/User/Create", 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
    });
    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        if(message.success){
            console.log("message.success");
            initUserTable();
        }
        console.log(message.success);
    });
});

function initUserTable(){
    $.ajax({
        url: "/Account/User/Get/ManagerData",
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                var managerData = data.userManager;
                allUsers = managerData.users;
                allRoles = managerData.roles;
                allDepartments = managerData.departments;
                initDepartmentFilter(allDepartments);
                updateUserTable(allUsers);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function initDepartmentFilter(){
    var departmentFilter = $("#departmentSelector");
    departmentFilter.empty();
    departmentFilter.append('<option value="0">全部</option>');
    allDepartments.forEach((department) => {
        departmentFilter.append(`<option value="${department.id}">${department.name}</option>`);
    });
}


function updateUserTable(users){
    var tbody = $("#userTable");
    console.log(users);
    tbody.empty(); // 清空舊資料
    users.forEach((user) => {
        var row = $("<tr>").attr({
            "data-user-id": user.id,
            "data-user-role": user.role
        });

        var updateBtn = $(`<button class="btn btn-primary update-user read">編輯</button>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            newWindow = window.open(`/Account/User/Update?id=${user.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
        });

        var deleteBtn = $(`<button class="btn btn-danger delete-user read">刪除</button>`).on("click", function () {
            if (confirm("確定要刪除使用者？")) {
                $.ajax({
                    url: `/Account/User/Delete?UserId=${user.id}`,
                    type: "POST",
                    processData: false,
                    contentType: false,
                    xhrFields: {
                        withCredentials: true // 確保攜帶 Cookie
                    },
                    success: function (data) {
                        if (data.success) {
                            console.log(data);
                            location.reload();
                        }
                    },
                    error: function (xhr) {
                        console.log("API 錯誤:", xhr.status);
                    }
                });
            }
        });

        // 選取框
        row.append(`<td class="department-cell">
                        <span class="read">${user.department}</span>
                    </td>`);
        row.append(`<td class="display-cell">
                        <span class="read">${user.displayName}</span>
                    </td>`);
        row.append(`<td class="user-cell">
                        <span class="read">${user.userName}</span>
                    </td>`);
        row.append(`<td class="role-cell">
                        <span class="read">${user.role}</span>
                    </td>`)
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
                        ${user.status ? 
                            '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
                        }
                    </td>`);
        // 信箱 遮蔽@前面第一個字元之後
        row.append(`<td class="email-cell">
                        <span class="read">${maskEmail(user.email)}</span>
                    </td>`);

        row.append(`<td class="phone-cell">
                        <span class="read">${maskPhone(user.phone)}</span>
                    </td>`);

        row.append(`<td class="createAt-cell">${convertDate(user.createAt)}</td>`);

        // 建立操作按鈕
        var actionTd = $("<td class='action-cell'></td>");

        // 將按鈕 append 進 td，再 append 到 tr
        actionTd.append(updateBtn, deleteBtn);
        row.append(actionTd);

        tbody.append(row);
    });
}

// 2025-02-17T10:21:36.8466667 轉換成 2025-02-17 10:21:36
function convertDate(createAt){
    var datetime = createAt.split("T");
    var createAtDate = datetime[0];
    var createAtTime = datetime[1].split(".")[0];
    return `${createAtDate} ${createAtTime}`;
}

function maskEmail(email) {
    if (!email) return ""; // 若為 null 或 undefined 則回傳空字串
    const [local, domain] = email.split("@");
    if (local.length > 1) {
        return local[0] + "*".repeat(local.length - 1) + "@" + domain;
    }
    return email;
}

// 處理電話遮蔽（中間 6 碼）
function maskPhone(phone) {
    if (!phone) return ""; // 若為 null 或 undefined 則回傳空字串
    return phone.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
}