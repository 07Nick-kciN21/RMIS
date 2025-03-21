import { initPage } from "../Pagination.js";

let allDepartments = [];


$(document).ready(function () {
    initDepartmentTable();
    
    $("#createDepartment").on("click", function () {
        var windowWidth = 800;
        var windowHeight = 600;
        var screenWidth = window.screen.width;
        var screenHeight = window.screen.height;
        var left = 0 - (screenWidth + windowWidth) / 2;
        var top = (screenHeight - windowHeight) / 2;
        window.open('/Account/Department/Create', 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
    });

    $("#departmentSelector").on("change", function () {
        var selectedDepartmentId = $(this).val();
        if(selectedDepartmentId == 0){
            updateDepartmentTable(allDepartments);
        }
        else{
            var filteredDepartments = allDepartments.filter((department) => {
                return department.id == selectedDepartmentId;
            });
            updateDepartmentTable(filteredDepartments);
        }
    });

    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        if(message.success){
            console.log("message.success");
            // 重整頁面
            initDepartmentTable();
        }
        console.log(message.success);
    });
});

function initDepartmentTable(){
    $.ajax({
        url: "/Account/Department/Get/ManagerData",
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                var managerData = data.departmentManager;
                allDepartments = managerData.departments;
                initPage("departmentPage", updateDepartmentTable, allDepartments);
                initDepartmentFilter(allDepartments);
                // updateDepartmentTable(allDepartments);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function initDepartmentFilter(allDepartments){
    var departmentFilter = $("#departmentSelector");
    departmentFilter.empty();
    departmentFilter.append(`<option value="0" selected>全部</option>`);
    allDepartments.forEach((department) => {
        departmentFilter.append(`<option value="${department.id}">${department.name}</option>`);
    });
}


function updateDepartmentTable(departments){
    var table = $("#departmentTable");
    table.empty();

    departments.forEach((department) => {
        var row = $("<tr></tr>").attr("data-department-id", department.id);
        var updateBtn = $(`<button class="update-department read">編輯</button>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            window.open(`/Account/Department/Update?id=${department.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
        });
        var deleteBtn = $(`<button class="delete-department read">刪除</button>`).on("click", function () {
            console.log(`/Account/Department/Delete?departmentId=${department.id}`);
            if (confirm("確定要刪除部門？")) {
                $.ajax({
                    url: `/Account/Department/Delete?departmentId=${department.id}`,
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
        row.append($(`<td class="name-cell">
                        <span class="read">${department.name}</span>
                      </td>`));
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
                    ${department.status ? 
                        '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
                    }
                </td>`);

        row.append(`<td class="createAt-cell">${convertDate(department.createAt)}</td>`);
        // 建立按鈕
        var actionTd = $("<td class='action-cell'></td>");

        // 將按鈕 append 進 td，再 append 到 tr
        actionTd.append(updateBtn, deleteBtn);
        row.append(actionTd);

        table.append(row);
    });
}

function convertDate(createAt){
    var createAt = createAt.split("T");
    var createAtDate = createAt[0];
    var createAtTime = createAt[1].split(".")[0];
    return `${createAtDate} ${createAtTime}`;
}