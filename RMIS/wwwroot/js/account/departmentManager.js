$(document).ready(function () {
    initDepartmentTable();

    $('#departmentTable').on('click', '.edit-department', function () {
        var row = $(this).closest('tr');
        // 存儲原始值（如果沒有，才存儲，避免重複進入編輯模式覆蓋原始值）
        row.find(".name-cell, .status-cell").each(function () {
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

        row.find('.read').addClass('d-none');
        row.find('.edit').removeClass('d-none');
    });

    // 使用事件委派綁定 `.save-user`
    $("#departmentTable").on("click", ".save-department", function () {
        // 結束編輯模式，read 顯示，edit 隱藏
        var row = $(this).closest("tr");
        var departmentId = row.data("department-id");
        
        // 取得所有 class 為 edit 的 input
        var editInputs = row.find(".edit");
        // 取得editInputs中 class department, name, role, status的值
        var name = editInputs.filter(".name").val();
        var status = editInputs.filter(".status").prop("checked");

        var formdata = new FormData();
        formdata.append("Id", departmentId);
        formdata.append("Name", name);
        formdata.append("Status", status);
        $.ajax({
            url: "/Account/Department/Update",
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
    $("#departmentTable").on("click", ".delete-department", function () {
        var row = $(this).closest("tr");
        var departmentId = row.data("department-id");
        console.log(`/Account/Department/Delete?departmentId=${departmentId}`);
        if (confirm("確定要刪除部門？")) {
            $.ajax({
                url: `/Account/Department/Delete?departmentId=${departmentId}`,
                type: "POST",
                xhrFields: {
                    withCredentials: true // 確保攜帶 Cookie
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
    
    // 使用事件委派綁定 `.cancel-user`，取消編輯，並且把所有的edit input值還原
    $("#departmentTable").on("click", ".cancel-department", function () {
        var row = $(this).closest("tr");

        row.find(".name-cell, status-cell").each(function () {
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

function initDepartmentTable(){
    $.ajax({
        url: "/Account/Department/Get/ManagerData",
        type: "POST",
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                var managerData = data.departmentManager;
                allDepartments = managerData.departments;
                updateDepartmentTable(allDepartments);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function updateDepartmentTable(departments){
    var table = $("#departmentTable");
    table.empty();

    departments.forEach(function(department){
        var row = $("<tr></tr>").attr("data-department-id", department.id);
        row.append($(`<td class="name-cell">
                        <span class="read">${department.name}</span>
                        <input class="edit d-none form-control name" type="text" value="${department.name}">
                      </td>`));
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
            ${department.status ? 
                '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
            }
            <input class="edit d-none form-check-input status" type="checkbox" role="switch" ${department.status ? 'checked' : ''}>
        </td>`);

        var createAt = department.createAt.split("T");
        var createAtDate = createAt[0];
        var createAtTime = createAt[1].split(".")[0];
        row.append(`<td>${createAtDate} ${createAtTime}</td>`);
        // 建立按鈕
        var actionTd = $("<td class='action-cell'></td>");
        var editButton = $('<button class="btn btn-primary edit-department read">編輯</button>');
        var saveButton = $('<button class="btn btn-success save-department edit d-none">儲存</button>');
        var deleteButton = $(`<button class="btn btn-danger delete-department read">刪除</button>`);
        var cancelButton = $(`<button class="btn btn-secondary cancel-department edit d-none">取消</button>`);

        // 將按鈕 append 進 td，再 append 到 tr
        actionTd.append(editButton, saveButton, deleteButton, cancelButton);
        row.append(actionTd);

        table.append(row);
    });
}