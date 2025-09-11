$(document).ready(function () {
    $('#PipelineId').change(function () {
        console.log($(this).val());
        updateLayers($(this).val());
    });
});

function updateLayers(PipelineId) {
    var layersSelect = $("#layersSelect");

    // 清空Layers的選項
    layersSelect.empty();

    // 發送AJAX請求獲取相應的Layers數據
    $.ajax({
        url: "/api/MapAPI/GetLayers",
        type: "GET",
        data: { pipelineId: PipelineId },
        success: function (layers) {
            // 創建新的Layers選項
            $.each(layers, function (index, layer) {
                layersSelect.append($("<option></option>").val(layer.id).text(layer.name));
            });
        },
        error: function (xhr, status, error) {
            console.error("Error: " + error);
        }
    });
}