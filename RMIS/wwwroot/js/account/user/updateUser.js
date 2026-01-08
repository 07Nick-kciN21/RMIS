$(document).ready(function () {
    hideModalOverlay();
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

    $('#resetPasswordForm').on('submit', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        showModalOverlay("#resetPassword");
        let form = this;
        let isValid = true;

        $(form).find('.form-control').removeClass('is-valid is-invalid');
        // 驗證每個欄位
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

        // 若有欄位不通過驗證，就不送出
        if (!isValid){
          hideModalOverlay();
          return;
        }

        let formData = new FormData();

        // 添加基本欄位
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("NewPassword", $('input[name="NewPassword"]').val());
        formData.append("NewPasswordCaptcha", $('input[name="adminUpdate_newPasswordCaptcha"]').val());
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
                alert(data.message);
            },
            error: function (xhr, status, error) {
                alert('提交失敗', error);
            }
        }).always(function() {
            $("#resetPassword").modal('hide');
            hideModalOverlay();
            form.reset();
            refreshCaptcha($(".captchaImage[data-type='adminUpdate_newPassword']"));
            $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });

    $("resetEmailForm").on("submit", function(e) {
        e.preventDefault(); // 阻止預設提交行為
        showModalOverlay("#resetEmail")
        let form = this;
        let isValid = true;
        $(form).find('.form-control').removeClass('is-valid is-invalid');
        // 驗證每個欄位
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

        // 若有欄位不通過驗證，就不送出
        if (!isValid){
            hideModalOverlay();
            return;
        }
        let formData = new FormData();
        // 添加基本欄位
        formData.append("UserId", $('input[name="UserId"]').val());
        formData.append("NewEmail", $('input[name="NewEmail"]').val());
        formData.append("NewEmailCaptcha", $('input[name="adminUpdate_newEmailCaptcha"]').val());
        $.ajax({
            url: '/Account/User/UpdateEmail',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            success: function (data) {
                alert(data.message);
            },
            error: function (xhr, status, error) {
                alert('提交失敗', error);
            }
        }).always(function() {
            $("#resetEmail").modal('hide');
            hideModalOverlay();
            form.reset();
            refreshCaptcha($(".captchaImage[data-type='adminUpdate_newEmail']"));
            $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });
});
function showModalOverlay(modalSelector) {
    const $modal = $(modalSelector);
    const $overlay = $("#globalModalOverlay");
    console.log(modalSelector);
    // 取得 modal 的位置和大小
    const offset = $modal.find(".modal-content").offset();
    const width = $modal.find(".modal-content").outerWidth();
    const height = $modal.find(".modal-content").outerHeight();
    
    $overlay.css({
        display: "flex",
        position: "absolute",
        top: offset.top,
        left: offset.left,
        width: width,
        height: height
    }).show();
}

function hideModalOverlay() {
  console.log("hide overlay");
  const $overlay = $("#globalModalOverlay");
  $overlay.hide();
}