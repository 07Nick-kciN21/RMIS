var treeData = @Html.Raw(Json.Serialize(ViewBag.JsTreeData))
// 將對象轉換為適合 jsTree 的格式
function transformData(data, n) {
    var transformed = [];
    data.forEach(function (node) {
        var current = {
            "id": node.id,
            "text": node.text,
            "icon": false,
            "li_attr": {
                "class": node.tag
            },
            "a_attr": {
                "class": node.tag === "node" ? "fw-bold" : "fw-normal",
            }
        };
        console.log("*".repeat(n) + node.text);
        if (node.children) {
            current.children = transformData(node.children, n + 1);
        }
        transformed.push(current);
    });
    return transformed;
}

$(document).ready(function () {
    $('#treeContainer').jstree({
        'core': {
            'data': transformData(treeData, 0)
        },
        "checkbox": {
            "keep_selected_style": false
        },
        "plugins": ["checkbox"] // 啟用複選框插件
    }).on('changed.jstree', function (e, data) {
        var selectedNodes = data.selected;
        var leafNodes = [];
        selectedNodes.forEach(function (nodeId) {
            var node = $('#treeContainer').jstree().get_node(nodeId);
            if (node.li_attr.class.includes("pipeline")) {
                GetRoadbyPipeline(node.id);
                leafNodes.push(node.id);
            }
        });
        console.log(leafNodes);
    });
});