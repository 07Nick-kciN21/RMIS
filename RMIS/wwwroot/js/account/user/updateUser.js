$(document).ready(function () {
    hideOverlay();
    function refreshCaptcha($img) {
      // 保證傳入的東西轉成 jQuery 物件
      $img = $($img);
      const type = $img.data("type");
      const url = "/Portal/Captcha?type=" + type + "&_=" + new Date().getTime();
      console.log("Refreshing captcha:", url);
      $img.attr("src", url);
    }

    // 點擊圖片刷新（用匿名函式包裝）
    $(".captchaImage").on("click", function () {
      refreshCaptcha($(this)); // 確保傳入的是 jQuery 物件
    });

    refreshCaptcha($(".captchaImage"));


    $('#updateUserForm').on('submit', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        let formData = new FormData();

        // 添加基本欄位
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("UserName", $('input[name="UserName"]').val());
        formData.append("DisplayName", $('input[name="DisplayName"]').val());
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
                    window.parent.postMessage(JSON.stringify({ success: true, action: 'close' }), window.location.origin);
                }
                else{
                    alert(data.message);
                    window.parent.postMessage(JSON.stringify({ success: false, action: 'close' }), window.location.origin);
                }
            },
            error: function (xhr, status, error) {
                alert('提交失敗');
                console.error(error);
                window.parent.postMessage(JSON.stringify({ success: false, action: 'close' }), window.location.origin);
            }
        });
    });

    $("#cancel").on("click", function () {
        window.parent.postMessage(JSON.stringify({ success: false, action: 'close' }), window.location.origin);
    });

    $('#resetPasswordForm').on('submit', function (e) {
        e.preventDefault();
        let form = this;
        let isValid = true;

        $(form).find('.form-control').removeClass('is-valid is-invalid');
        $(form).find('.form-control[required]').each(function () {
            const $input = $(this);
            const value = $input.val();
            const pattern = $input.attr('pattern');
            if (!value) {
                $input.addClass('is-invalid');
                isValid = false;
            } else if (pattern && !(new RegExp(pattern).test(value))) {
                $input.addClass('is-invalid');
                isValid = false;
            } else {
                $input.addClass('is-valid');
            }
        });

        if (!isValid) return;

        if ($('input[name="NewPassword"]').val() !== $('input[name="CheckPassword"]').val()) {
            alert("新密碼與確認密碼不相同");
            return;
        }

        showOverlay();
        let formData = new FormData();
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("NewPassword", $('input[name="NewPassword"]').val());
        formData.append("NewPasswordCaptcha", $('input[name="adminUpdate_newPasswordCaptcha"]').val());
        $.ajax({
            url: '/Account/User/UpdatePassword',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
            },
            error: function (xhr, status, error) {
                alert('提交失敗');
                console.error(error);
            }
        }).always(function () {
            hideOverlay();
            $('#resetPasswordSection').collapse('hide');
            form.reset();
            refreshCaptcha($(".captchaImage[data-type='adminUpdate_newPassword']"));
            $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });

    $('#resetEmailForm').on('submit', function (e) {
        e.preventDefault();
        let form = this;
        let isValid = true;
        $(form).find('.form-control').removeClass('is-valid is-invalid');
        $(form).find('.form-control[required]').each(function () {
            const $input = $(this);
            const value = $input.val();
            const pattern = $input.attr('pattern');
            if (!value || value.trim() === '') {
                $input.addClass('is-invalid');
                isValid = false;
            } else if (pattern && !(new RegExp(pattern).test(value))) {
                $input.addClass('is-invalid');
                isValid = false;
            } else {
                $input.addClass('is-valid');
            }
        });

        if (!isValid) return;

        showOverlay();
        let formData = new FormData();
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("NewEmail", $('input[name="newEmail"]').val());
        formData.append("NewEmailCaptcha", $('input[name="adminUpdate_newEmailCaptcha"]').val());
        $.ajax({
            url: '/Account/User/UpdateEmail',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
            },
            error: function (xhr, status, error) {
                alert('提交失敗');
                console.error(error);
            }
        }).always(function () {
            hideOverlay();
            $('#resetEmailSection').collapse('hide');
            form.reset();
            refreshCaptcha($(".captchaImage[data-type='newEmail']"));
            $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });
});

function showOverlay() {
    $("#globalModalOverlay").css("display", "flex");
}

function hideOverlay() {
    $("#globalModalOverlay").hide();
}