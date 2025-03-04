$(document).ready(function () {
    $("#submit").on("click", function (e) {
        e.preventDefault();
        var roleName = $("#roleName").val();
        var roleDescription = $("#roleDescription").val();
        var role = {
            name: roleName,
            description: roleDescription
        };
        $.ajax({
            url: "/Account/Role/Create",
            type: "POST",
            data: JSON.stringify(role),
            contentType: "application/json",
            success: function (data) {
                if (data.success) {
                    alert("新增成功");
                    window.opener.postMessage(JSON.stringify({ success: true }), window.location.origin);
                    window.close();
                }
            }
        });
    });
    $("#cancel").on("click", function () {
        window.close();
    });
});