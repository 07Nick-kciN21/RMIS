$(document).ready(function () {
    initMapdataLayerTable();
    $("#mapdataLayerSelector").on("change", function () {
        var selectedCategory = $(this).val();
        if(selectedCategory == 0){
            initPage("mapdataLayerPage", updateMapdataLayerTable, allMapdataLayers);
        }
        else{
            var filteredDepartments = allMapdataLayers.filter((mapdata) => {
                return mapdata.category == selectedCategory;
            });
            initPage("mapdataLayerPage", updateMapdataLayerTable, filteredDepartments);
        }
    });
});


function initMapdataLayerTable(){
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
                var layers = data.layers;
                var $container = $("#layerContainer");
                console.log(layers);
                $container.empty(); // 清空舊內容
    
                $.each(layers, function (i, layer) {
                    var $card = $("<div>").addClass("card mb-4");
    
                    var $header = $("<div>")
                        .addClass("card-header bg-primary text-white")
                        .html("<strong>" + layer.Name + " 類型：" + layer.Kind + "</strong>");
    
                    var $cardBody = $("<div>").addClass("card-body p-0");
                    var $table = $("<table>").addClass("table table-bordered m-0");
    
                    var $thead = $("<thead>").addClass("table-light").append(
                        $("<tr>").append(
                            $("<th>").addClass("area-cell").text("區塊名稱"),
                            $("<th>").addClass("more-cell").text("資料"),
                            $("<th>").addClass("action-cell").text("操作")
                        )
                    );
    
                    var $tbody = $("<tbody>");
    
                    if (layer.Areas && layer.Areas.length > 0) {
                        $.each(layer.Areas, function (j, area) {
                            var $row = $("<tr>").append(
                                $("<td>").addClass("area-cell").text(area.Name),
                                $("<td>").addClass("more-cell").append(
                                    $("<a>")
                                        .attr("href", "#")
                                        .text("More")
                                        .on("click", function (e) {
                                            e.preventDefault();
                                            showPointsModal(area.Id, layer.Kind, layer.Svg);
                                        })
                                ),
                                $("<td>").addClass("action-cell").append(
                                    $("<button>").addClass("update-mapdata read").text("編輯"),
                                    $("<button>").addClass("delete-mapdata read").text("刪除")
                                )
                            );
                            $tbody.append($row);
                        });
                    } else {
                        var $emptyRow = $("<tr>").append(
                            $("<td>")
                                .attr("colspan", 3)
                                .addClass("text-center text-muted")
                                .text("No areas available")
                        );
                        $tbody.append($emptyRow);
                    }
    
                    $table.append($thead).append($tbody);
                    $cardBody.append($table);
                    $card.append($header).append($cardBody);
                    $container.append($card);
                });
            }
        },
        error: function (xhr) {
            console.log("取得資料失敗:", xhr.status);
        }
    });
}

function showPointsModal(areaId, kind, svg) {
    var windowWidth = 800;
    var windowHeight = 600;
    // 獲取螢幕的寬高
    var screenWidth = window.screen.width;
    var screenHeight = window.screen.height;
    // 計算彈出視窗的位置
    var left = 0 - (screenWidth + windowWidth) / 2;
    var top = (screenHeight - windowHeight) / 2;
    // 開啟新視窗，顯示角色的權限
    newWindow = window.open(`/Account/Mapdata/Read/Point?areaId=${areaId}&kind=${kind}&svg=${svg}`, 'PointsWindow', `width=${windowWidth},height=${windowHeight}, top=${top}, left=${left}`);
}

