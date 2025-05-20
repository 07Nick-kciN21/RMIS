import { WindowManager } from '../../windowCtl.js';

let importWindow = null;
let readPointWindow = null;
let addPointWindow = null;
const wm = new WindowManager();
$(document).ready(function () {
    // $(document).ajaxStart(function () {
    //     showLoading();
    // });

    // $(document).ajaxStop(function () {
    //     hideLoading();
    // });
    initLayerSelect();
    // 初始化 select2 並禁用搜尋框
    $("#mapdataDistSelector").select2({
        theme: 'bootstrap-5',
        minimumResultsForSearch: Infinity
    });
    $("#mapdataLayerSelector").select2({
        theme: 'bootstrap-5',
        minimumResultsForSearch: Infinity
    });
    $("#mapdataNameSelector").select2({
        theme: 'bootstrap-5',
    });

    $("#mapdataLayerSelector").on("change", function () {
        // 將行政區選擇器還原為預設值
        $("#mapdataDistSelector").val("").trigger("change.select2");

        console.log("#mapdataDistSelector option:first");
        // 清空 mapdataNameSelector 的所有選項
        $("#mapdataNameSelector").empty();
    });
    
    $("#mapdataDistSelector").on("change", function () {
        var selectedLayer = $("#mapdataLayerSelector").val();
        var selectedDist = $(this).val();
        $.ajax({
            url: `/Account/Mapdata/Get/Area?LayerId=${selectedLayer}&Dist=${selectedDist}`,
            type: "POST",
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                if (data.success) {
                    console.log(data);
                    // 初始化mapdataAreaSelect
                    var $select = $("#mapdataNameSelector");                    
                    $select.empty(); // 清空舊內容
                    // 全部的值為guid的0
                    $select.append($("<option selected disabled>").val(-1).text("請選擇道路")); // 添加預設選項
                    $select.append($("<option>").val('00000000-0000-0000-0000-000000000000').text("全部")); // 添加預設選項
                    $.each(data.areas, function (i, area) {
                        $select.append($("<option>").val(area.id).text(area.name));
                    });
                }
            },
            complete: function () {
                hideLoading();
            }
        })
    });

    $("#mapdataSearch").on("click", function () {
        var selectedLayerId = $("#mapdataLayerSelector").val();
        var selectedDistId = $("#mapdataDistSelector").val();
        var selectedAreaId = $("#mapdataNameSelector").val();
        initMapdataLayerTable(selectedLayerId, selectedDistId, selectedAreaId);
    });

});

function initLayerSelect(){
    function getQueryParam(key) {
        let query = window.location.search.substring(1);
        let vars = query.split("&");
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split("=");
            if (decodeURIComponent(pair[0]) === key) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }
    var id = getQueryParam("id");
    // const savedLayer = sessionStorage.getItem("mapdataLayerSelector");
    // const savedDist = sessionStorage.getItem("mapdataDistSelector");
    // const savedName = sessionStorage.getItem("mapdataNameSelector");
    showLoading();
    $.ajax({
        url: `/Account/Mapdata/Get/Layer?id=${id}`,
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                console.log(data);
                var layers = data.layers;
                var $select = $("#mapdataLayerSelector");
                $select.empty(); // 清空舊內容
                $select.append($("<option selected disabled>").val(-1).text("請選擇圖層")); // 添加預設選項            
                $.each(layers, function (i, layer) {
                    $select.append($("<option>").val(layer.id).text(layer.name));
                });
                // if (savedLayer && savedDist && savedName) {
                //     $select.val(savedLayer).trigger("change");

                //     // 等行政區載入後再選擇行政區
                //     setTimeout(() => {
                //         $("#mapdataDistSelector").val(savedDist).trigger("change");

                //         // 再等道路載入後選擇道路並執行查詢
                //         setTimeout(() => {
                //             $.ajax({
                //                 url: `/Account/Mapdata/Get/Area?LayerId=${savedLayer}&Dist=${savedDist}`,
                //                 type: "POST",
                //                 processData: false,
                //                 contentType: false,
                //                 xhrFields: {
                //                     withCredentials: true
                //                 },
                //                 success: function (data) {
                //                     if (data.success) {
                //                         const $nameSelect = $("#mapdataNameSelector");
                //                         $nameSelect.empty();
                //                         $nameSelect.append($("<option selected disabled>").val(-1).text("請選擇道路"));
                //                         $nameSelect.append($("<option>").val('00000000-0000-0000-0000-000000000000').text("全部"));
                //                         $.each(data.areas, function (i, area) {
                //                             $nameSelect.append($("<option>").val(area.id).text(area.name));
                //                         });

                //                         $nameSelect.val(savedName).trigger("change");

                //                         // 查詢並清除快取
                //                         $("#mapdataSearch").click();
                //                         sessionStorage.removeItem("mapdataLayerSelector");
                //                         sessionStorage.removeItem("mapdataDistSelector");
                //                         sessionStorage.removeItem("mapdataNameSelector");
                //                     }
                //                 }
                //             });
                //         }, 300);
                //     }, 300);
                // }
                console.log("載入圖層選擇器完成");
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        },
        complete: function () {
            hideLoading();
        }
    });
}

function initMapdataLayerTable(layerId, dist, areaId) {
    showLoading();
    $.ajax({
        url: `/Account/Mapdata/Search?LayerId=${layerId}&Dist=${dist}&AreaId=${areaId}`,
        type: "POST",
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true // 確保攜帶 Cookie
        },
        success: function (data) {
            if (data.success) {
                var result = data.mapdataSearch;
                console.log(result);

                const addBtn = $(`<button class="btn btn-primary btn-sm ms-2">新增圖資</button>`)
                    .on("click", function () {
                        const url = `/Account/Mapdata/Import?layerId=${result.id}&name=${result.name}&dist=${result.dist}&kind=${result.kind}&svg=${result.svg}&color=${encodeURIComponent(result.color)}`;
                        sessionStorage.setItem('mapdataLayerSelector', $("#mapdataLayerSelector").val());
                        sessionStorage.setItem('mapdataDistSelector', $("#mapdataDistSelector").val());
                        sessionStorage.setItem('mapdataNameSelector', $("#mapdataNameSelector").val());
                        // wm.open('addPointWindow', url, windowWidth, windowHeight)
                        window.location.href = url;
                    });

                // 產生 tbody 內容
                var $tbody = $("<tbody>");
                $.each(result.areas, function (i, area) {
                    var moreBtn = $(`<button class="btn btn-primary btn-sm">更多</button>`).on("click", function () {
                        const url = `/Account/Mapdata/Read/Point?areaId=${area.id}&kind=${result.kind}&svg=${result.svg}&color=${encodeURIComponent(result.color)}`;
                        // wm.open('readPipelineWindow', url, windowWidth, windowHeight);
                        window.location.href = url;
                        // readPointWindow = openWindow(readPointWindow, `/Account/Mapdata/Read/Point?areaId=${area.id}&kind=${result.kind}&svg=${result.svg}&color=${encodeURIComponent(result.color)}`, "readPointWindow", windowWidth, windowHeight);
                    });

                    var deleteBtn = $(`<button class="delete-mapdata read btn btn-danger btn-sm">刪除</button>`).on("click", function () {
                        if (confirm("確定要刪除圖資？")) {
                            $.ajax({
                                url: `/Account/Mapdata/Delete/Area?id=${area.id}`,
                                type: "POST",
                                xhrFields: {
                                    withCredentials: true
                                },
                                success: function (data) {
                                    if (data.success) {
                                        alert(data.message);
                                        $("#mapdataSearch").click();
                                    } else {
                                        alert(data.message);
                                    }
                                },
                                error: function (xhr) {
                                    console.log("API 錯誤:", xhr.status);
                                }
                            });
                        }
                    });

                    var $tr = $("<tr>");
                    $tr.append($("<td>").text(area.name));
                    $tr.append($("<td>").append(moreBtn));
                    $tr.append($("<td>").append(deleteBtn));
                    $tbody.append($tr);
                });

                // 產生內部 HTML 結構
                var $innerContent = $(`
                    <div class="mb-4">
                        <div id="mapdataHeader" class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <strong id="layerName">${result.name}</strong>
                        </div>
                        <table class="table table-bordered text-center permissionTable">
                            <thead class="table-primary">
                                <tr>
                                    <th style="width: 350px;">路名</th>
                                    <th>資料</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                `);

                $innerContent.find("#mapdataHeader").append(addBtn);
                $innerContent.find("table").append($tbody);

                // 插入內容並顯示
                $("#layerContainer").html($innerContent).removeClass("d-none");
            }
            else{
                alert(data.message);
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        },
        complete: function () {
            hideLoading();
        }
    });
}

function showLoading() {
    $(".loadingSpinner").show();
}

function hideLoading() {
    $(".loadingSpinner").hide();
}