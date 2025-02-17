$(document).ready(function () {
    $(".delete-permission").click(function () {
        var permissionId = $(this).data("permission-id");
        var formData = new FormData();
        formData.append("permissionId", permissionId);
        console.log(permissionId);
        $.ajax({
            url: `/Account/Permission/Delete`,
            type: "POST",
            processData: false,
            contentType: false,
            data: formData,
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
    });
});