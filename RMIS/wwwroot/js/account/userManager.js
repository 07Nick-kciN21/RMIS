var roleSelect = "";
var departmentSelect = "";

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
        
        // 進入編輯模式，read 隱藏，edit 顯示
        row.find(".read").addClass("d-none");
        row.find(".edit").removeClass("d-none");
        // 顯示儲存按鈕
        row.find(".edit-user").addClass("d-none");
        row.find(".save-user").removeClass("d-none");
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

        console.log(department, name, role, status);
        var formdata = new FormData();
        formdata.append("UserId", userId);
        formdata.append("DepartmentId", department);
        formdata.append("UserName", name);
        formdata.append("RoleId", role);
        formdata.append("Status", status);
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
        // 顯示修改按鈕
        row.find(".edit-user").removeClass("d-none");
        row.find(".save-user").addClass("d-none");
    });
    
    // 使用事件委派綁定 `.delete-user`
    $("#userTable").on("click", ".delete-user", function () {
        var userId = $(this).data("user-id");
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
});

function initUserTable(){
    // 生成一個role select物件
    roleSelect = '<select class="edit form-select d-none role">';
    allRoles.forEach((role) => {
        roleSelect += `<option value="${role.id}">${role.name}</option>`;
    });
    roleSelect += '</select>';

    departmentSelect = '<select class="edit form-select d-none department">';
    allDepartments.forEach((department) => {
        departmentSelect += `<option value="${department.id}">${department.name}</option>`;
    });

    updateUserTable(allUsers);
}

function updateUserTable(users){
    var tbody = $("#userTable");
    tbody.empty(); // 清空舊資料
    users.forEach((user) => {
        var row = $("<tr>").attr({
            "data-user-id": user.id,
            "data-user-role": user.role
        });
        // 選取框
        row.append(`<td><input type="checkbox"/></td>`);
        row.append(`<td class="department-cell">
                        <span class="read">${user.department}</span>
                        ${departmentSelect}
                    </td>`);
        row.append(`<td class="name-cell">
                        <span class="read">${user.name}</span>
                        <input class="edit d-none name" value="${user.name}"/>
                    </td>`);
        row.append(`<td class="role-cell">
                        <span class="read">${user.role}</span>
                        ${roleSelect}
                    </td>`)
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
                        ${user.status ? 
                            '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
                        }
                        <input class="edit d-none form-check-input status" type="checkbox" role="switch" ${user.status ? 'checked' : ''}>
                    </td>`);
        // 2025-02-17T10:21:36.8466667 轉換成 2025-02-17 10:21:36
        var createAt = user.createAt.split("T");
        var createAtDate = createAt[0];
        var createAtTime = createAt[1].split(".")[0];
        row.append(`<td>${createAtDate} ${createAtTime}</td>`);

        // 建立按鈕
        var actionTd = $("<td>");
        var editButton = $('<button class="btn btn-primary edit-user">修改</button>');
        var saveButton = $('<button class="btn btn-success save-user d-none">儲存</button>');
        var deleteButton = $(`<button class="btn btn-danger delete-user"">刪除</button>`);

        // 將按鈕 append 進 td，再 append 到 tr
        actionTd.append(editButton, saveButton, deleteButton);
        row.append(actionTd);

        tbody.append(row);
    });
}