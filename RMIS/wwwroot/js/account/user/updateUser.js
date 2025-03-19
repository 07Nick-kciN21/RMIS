$(document).ready(function () {
    $('#submit').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        let formData = new FormData();

        // 添加基本欄位
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("UserName", $('input[name="UserName"]').val());
        formData.append("DisplayName", $('input[name="DisplayName"]').val());
        formData.append("Email", $('input[name="Email"]').val());
        formData.append("Phone", $('input[name="Phone"]').val());

        // 取得選中的 Department
        formData.append("DepartmentId", $('select[name="DepartmentId"]').val());
        formData.append("RoleId", $('select[name="RoleId"]').val());

        // 取得選中的 Status
        let status = $('input[name="Status"]:checked').val();
        formData.append("Status", status ? status : '');

        for (const value of formData.values()) {
            console.log(value);
          }
        $.ajax({
            url: '/Account/User/Update',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                if (data.success) {
                    alert(data.message);
                    window.opener.postMessage(JSON.stringify({ success: true }), window.location.origin);
                    window.close();
                }
                else{
                    alert(data.message);
                    window.opener.postMessage(JSON.stringify({ success: false }), window.location.origin);
                    window.close();
                }
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

    $("#cancel").on("click", function () {
        window.close();
    });

    $('#password-Save').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        let formData = new FormData();

        // 添加基本欄位
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("OriginPassword", $('input[name="OriginPassword"]').val());
        formData.append("NewPassword", $('input[name="NewPassword"]').val());
        
        // 先檢查新密碼與確認密碼是否相同
        if($('input[name="NewPassword"]').val() != $('input[name="CheckPassword"]').val()){
            alert("新密碼與確認密碼不相同");
            return;
        }
        $.ajax({
            url: '/Account/User/UpdatePassword',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                if (data.success) {
                    alert(data.message);
                    $("#resetPassword").modal('hide');
                }
                else{
                    alert(data.message);
                }
            },
            error: function (xhr, status, error) {
                alert('提交失敗', error);
                $("#resetPassword").modal('hide');
            }
        });
    });
});