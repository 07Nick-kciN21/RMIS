$(document).ready(function () {
    $('#password-Save').on('click', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        let formData = new FormData();

        // 添加基本欄位
        formData.append("UserId", $('input[name="Id"]').val());
        formData.append("OriginPassword", $('input[name="OriginPassword"]').val());
        formData.append("NewPassword", $('input[name="NewPassword"]').val());
        
        console.log($('input[name="Id"]').val());
        console.log($('input[name="OriginPassword"]').val());
        console.log($('input[name="NewPassword"]').val());
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
    $('#cancel').on('click', function () {
        window.close();
    });
});