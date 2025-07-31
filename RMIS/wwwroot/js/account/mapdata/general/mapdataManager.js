import { WindowManager } from "../../../windowCtl.js";
import { initPage } from "../../Pagination.js";

let allMapdata = [];
let updatePipelineWindow = null;
const wm = new WindowManager();

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

    window.addEventListener('message', function(event) {
        if (event.origin !== window.location.origin) return; // 安全性驗證
        const message = JSON.parse(event.data);
        if(message.success){
            console.log("message.success");
            // 重整頁面
            initMapdataTable();
        }
        console.log(message.success);
    });
});

function initMapdataTable(){
    $.ajax({
        url: "/Mapdata/Get/ManagerData",
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
                // 過濾出allMapdata.isGeneralPipeline 為true的資料
                // allMapdata = allMapdata.filter((mapdata) => {
                //     return mapdata.isGeneralPipeline == true;
                // });
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
        
        // var updateBtn = $(`<button class="update-mapdata read">編輯</button>`).on("click", function () {
        //     var windowWidth = 800;
        //     var windowHeight = 600;
        //     const url = `/Mapdata/General/Update/Pipeline?id=${mapdata.id}`;
        //     wm.open("updatePipelineWindow", url, windowWidth, windowHeight);
        //     // updatePipelineWindow = openWindow(updatePipelineWindow, `/Mapdata/General/Update/Pipeline?id=${mapdata.id}`, "updatePipelineWindow", windowWidth, windowHeight);
        // });
        var deleteBtn = $(`<button class="delete-mapdata read">刪除</button>`).on("click", function () {
            console.log(`/Mapdata/General/Delete/Pipeline?departmentId=${mapdata.id}`);
            if (confirm("確定要刪除圖資？")) {
                $.ajax({
                    url: `/Mapdata/General/Delete/Pipeline?id=${mapdata.id}`,
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
            var width = 1000;
            var height = 800;
            var url = `/Mapdata/General/Read/Layer?id=${mapdata.id}`;
            wm.open("readPipelineWindow", url, width, height);
        });
        // 選取框
        row.append(`<td class="category-cell">
                        <span class="read">${mapdata.category}</span>
                    </td>`);
        row.append(`<td class="name-cell">
                        <span class="read">${mapdata.name}</span>
                    </td>`);
        row.append($(`<td class="more-cell"></td>`).append(moreBtn));
        
        // 建立操作按鈕
        var actionTd = $(`<td class="action-cell"></td>`);
        actionTd.append(deleteBtn);
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
