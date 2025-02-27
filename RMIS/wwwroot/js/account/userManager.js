
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
    
    // 使用事件委派綁定 `.edit-user`
    $("#userTable").on("click", ".edit-user", function () {
        var row = $(this).closest("tr");

        row.find(".department-cell, .name-cell, .role-cell, .status-cell, .email-cell, .phone-cell").each(function () {
            var cell = $(this);
            var input = cell.find("input.edit");
    
            // 存儲原始值（如果沒有，才存儲，避免重複進入編輯模式覆蓋原始值）
            if (!input.attr("data-original")) {
                input.attr("data-original", input.val());
            }
    
            // 進入編輯模式
            cell.find(".read").addClass("d-none");
            input.removeClass("d-none");
        });
        // 進入編輯模式，read 隱藏，edit 顯示，delete 隱藏 cancel 顯示
        row.find(".read").addClass("d-none");
        row.find(".edit").removeClass("d-none");
    });
    
    // 使用事件委派綁定 `.save-user`
    $("#userTable").on("click", ".save-user", function () {
        // 結束編輯模式，read 顯示，edit 隱藏
        var row = $(this).closest("tr");
        var userId = row.data("user-id");
        
        // 取得所有 class 為 edit 的 input
        var editInputs = row.find(".edit");
        // 取得editInputs中 class department, name, role, status的值
        var department = editInputs.filter(".department").val();
        var name = editInputs.filter(".name").val();
        var role = editInputs.filter(".role").val();
        var status = editInputs.filter(".status").prop("checked");
        var email = editInputs.filter(".email").val();
        var phone = editInputs.filter(".phone").val();

        console.log(department, name, role, status);
        var formdata = new FormData();
        formdata.append("UserId", userId);
        formdata.append("DepartmentId", department);
        formdata.append("UserName", name);
        formdata.append("RoleId", role);
        formdata.append("Status", status);
        formdata.append("Email", email);
        formdata.append("Phone", phone);
        $.ajax({
            url: "/Account/User/Update",
            type: "POST",
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            data: formdata,
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

        row.find(".read").removeClass("d-none");
        row.find(".edit").addClass("d-none");
    });
    
    // 使用事件委派綁定 `.delete-user`
    $("#userTable").on("click", ".delete-user", function () {
        var row = $(this).closest("tr");
        var userId = row.data("user-id");
        if (confirm("確定要刪除使用者？")) {
            $.ajax({
                url: `/Account/User/Delete?UserId=${userId}`,
                type: "POST",
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
    
    // 使用事件委派綁定 `.cancel-user`，取消編輯，並且把所有的edit input值還原
    $("#userTable").on("click", ".cancel-user", function () {
        var row = $(this).closest("tr");

        row.find(".department-cell, .name-cell, .role-cell, .status-cell, .email-cell, .phone-cell").each(function () {
            var cell = $(this);
            var input = cell.find("input.edit");

            // 還原原始值
            if (input.attr("data-original") !== undefined) {
                input.val(input.attr("data-original"));
            }

            // 隱藏編輯模式
            input.addClass("d-none");
            cell.find(".read").removeClass("d-none");
        });
        

        row.find(".read").removeClass("d-none");
        row.find(".edit").addClass("d-none");
    });
});

function initUserTable(){
    $.ajax({
        url: "/Account/User/Get/ManagerData",
        type: "POST",
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

function initDepartmentSelector(departmentId){
    departmentSelect = '<select class="edit form-select d-none department">';
    allDepartments.forEach((department) => {
        departmentSelect += `<option value="${department.id}" ${department.id == departmentId ? "selected" : ""}>${department.name}</option>`;
    });
    departmentSelect += '</select>';
    return departmentSelect;
}

function initRoleSelect(roleId){
    var roleSelect = '<select class="edit form-select d-none role">';
    allRoles.forEach((role) => {
        roleSelect += `<option value="${role.id}" ${role.id == roleId ? "selected" : ""}>${role.name}</option>`;
    });
    roleSelect += '</select>';
    return roleSelect;
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
        // 選取框
        row.append(`<td class="department-cell">
                        <span class="read">${user.department}</span>
                        ${initDepartmentSelector(user.departmentId)}
                    </td>`);
        row.append(`<td class="name-cell">
                        <span class="read">${user.name}</span>
                        <input class="edit d-none name" value="${user.name}"/>
                    </td>`);
        row.append(`<td class="role-cell">
                        <span class="read">${user.role}</span>
                        ${initRoleSelect(user.roleId)}
                    </td>`)
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
                        ${user.status ? 
                            '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
                        }
                        <input class="edit d-none form-check-input status" type="checkbox" role="switch" ${user.status ? 'checked' : ''}>
                    </td>`);
        // 信箱 遮蔽@前面第一個字元之後
        row.append(`<td class="email-cell">
            <span class="read">${maskEmail(user.email)}</span>
            <input class="edit d-none email" value="${user.email ?? ''}"/>
        </td>`);

        row.append(`<td class="phone-cell">
                    <span class="read">${maskPhone(user.phone)}</span>
                    <input class="edit d-none phone" value="${user.phone ?? ''}"/>
                </td>`);
        row.append(`<td class="createAt-cell">${convertDate(user.createAt)}</td>`);

        // 建立操作按鈕
        var actionTd = $("<td class='action-cell'></td>");
        var editButton = $('<button class="btn btn-primary edit-user read">編輯</button>');
        var saveButton = $('<button class="btn btn-success save-user edit d-none">儲存</button>');
        var deleteButton = $(`<button class="btn btn-danger delete-user read">刪除</button>`);
        var cancelButton = $(`<button class="btn btn-secondary cancel-user edit d-none">取消</button>`);

        // 將按鈕 append 進 td，再 append 到 tr
        actionTd.append(editButton, saveButton, deleteButton, cancelButton);
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
    console.log(phone.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"));
    return phone.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
}