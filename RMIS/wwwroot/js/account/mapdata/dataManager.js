import { initPage } from "../Pagination.js";

let allMapdata = [];


$(document).ready(function () {
    initMapdataTable();
    $("#mapdataSelector").on("change", function () {
        var selectedCategory = $(this).val();
        if(selectedCategory == 0){
            initPage("mapdataPage", updateMapdataTable, allMapdata);
        }
        else{
            var filteredDepartments = allMapdata.filter((mapdata) => {
                return mapdata.category == selectedCategory;
            });
            initPage("mapdataPage", updateMapdataTable, filteredDepartments);
            // updateMapdataTable(filteredDepartments);
        }
    });
});

function initMapdataTable(){
    $.ajax({
        url: "/Account/Mapdata/Get/ManagerData",
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                var managerData = data.mapdataManager;
                allMapdata = managerData.pipelineDatas;
                // 過濾出allMapdata中的Category，並去除重複的值
                var categories = allMapdata.map((mapdata) => mapdata.category);
                categories = [...new Set(categories)];
                initPage("mapdataPage", updateMapdataTable, allMapdata);
                initmapdataFilter(categories);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function updateMapdataTable(mapdatas){
    var tbody = $("#mapdataTable");
    tbody.empty(); // 清空舊資料
    mapdatas.forEach((mapdata) => {
        var row = $("<tr>").attr({
            "data-mapdata-id": mapdata.id,
        });
        var updateBtn = $(`<button class="update-mapdata read">編輯</button>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            window.open(`/Account/Mapdata/Update?id=${mapdata.id}`, 'newWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
        });
        var deleteBtn = $(`<button class="delete-mapdata read">刪除</button>`).on("click", function () {
            console.log(`/Account/Mapdata/Delete?departmentId=${mapdata.id}`);
            if (confirm("確定要刪除圖資？")) {
                $.ajax({
                    url: `/Account/Mapdata/Delete?id=${mapdata.id}`,
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
        var moreBtn = $(`<a class="more-data read">more</a>`).on("click", function () {
            var windowWidth = 800;
            var windowHeight = 600;
            // 獲取螢幕的寬高
            var screenWidth = window.screen.width;
            var screenHeight = window.screen.height;
            // 計算彈出視窗的位置
            var left = 0 - (screenWidth + windowWidth) / 2;
            var top = (screenHeight - windowHeight) / 2;
            // 開啟新視窗，顯示角色的權限
            window.open(`/Account/Mapdata/Read/Layer?id=${mapdata.id}`, 'LayersWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
            console.log("more");
        });
        // 選取框
        row.append(`<td class="category-cell">
                        <span class="read">${mapdata.category}</span>
                    </td>`);
        row.append(`<td class="name-cell">
                        <span class="read">${mapdata.name}</span>
                    </td>`);
        row.append($(`<td class="more-cell"></td>`).append(moreBtn));
        // 狀態根據status顯示啟用或停用
        row.append(`<td class="status-cell">
            ${mapdata.status ? 
                '<span class="read enable">啟用</span>' : '<span class="read stop">停用</span>'
            }
        </td>`);
        
        // 建立操作按鈕
        var actionTd = $(`<td class="action-cell"></td>`);
        actionTd.append(updateBtn, deleteBtn);
        // 將按鈕 append 進 td，再 append 到 tr
        row.append(actionTd);

        tbody.append(row);
    });
}

function initmapdataFilter(categories){
    var filter = $("#mapdataSelector");
    // 清空舊資料
    filter.empty(); 
    filter.append(`<option value="0" selected>全部</option>`);
    // 建立選項
    categories.forEach((category) => {
        filter.append($(`<option value="${category}">${category}</option>`));
    });
}
