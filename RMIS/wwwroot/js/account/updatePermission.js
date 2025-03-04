$(document).ready(function () {
    $('#submit').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為

        let formData = new FormData();

        // 添加 RoleId 和 RoleName
        formData.append("Id", $('input[name="Id"]').val());
        formData.append("Name", $('input[name="Name"]').val());

        // 取得選中的 Status
        let status = $('input[name="Status"]:checked').val();
        formData.append("Status", status ? status : '');

        console.log(formData);
        $.ajax({
            url: '/Account/Permission/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (response) {
                console.log(response);
                alert('提交成功');
                console.log(response);
                window.opener.postMessage(
                    JSON.stringify({ success: true }), 
                    window.location.origin,
                );
                window.close();
            },
            error: function (xhr, status, error) {
                alert('提交失敗');
                console.error(error);
                window.opener.postMessage(
                    JSON.stringify({ success: false }), 
                    window.location.origin,
                );
                window.close();
            }
        });
    });
});


