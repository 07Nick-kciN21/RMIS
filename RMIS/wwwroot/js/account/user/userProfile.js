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

    $('#resetPasswordForm').on('submit', function (e) {
        e.preventDefault(); // 阻止預設提交行為
        showModalOverlay("#resetEmail");
        
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
        
        
        // 添加基本欄位
        // 使用 modal 內的選擇器
        let originPassword = $('#resetPassword input[name="OriginPassword"]').val();
        let newPassword = $('#resetPassword input[name="NewPassword"]').val();
        let checkPassword = $('#resetPassword input[name="CheckPassword"]').val();
        // 先檢查新密碼與確認密碼是否相同
        if(newPassword !== checkPassword){
            alert("新密碼與確認密碼不相同");
            return;
        }
        
        let formData = new FormData();
        
        // 添加基本欄位
        formData.append("UserId", $('input[name="Id"]').val());
        formData.append("OriginPassword", originPassword);
        formData.append("NewPassword", newPassword);
        formData.append("NewPasswordCaptcha", $('input[name="userProfile_newPasswordCaptcha"]').val());
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
          refreshCaptcha($(".captchaImage[data-type='userProfile_newPassword']"));
          $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });

    $('#resetEmailForm').on('submit', function (e) {
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
        formData.append("UserId", $('input[name="Id"]').val());
        formData.append("NewEmail", $('input[name="newEmail"]').val());
        formData.append("NewEmailCaptcha", $('input[name="userProfile_newEmailCaptcha"]').val());
        console.log("Send email captcha clicked", formData);
        
        $.ajax({
            url: '/Account/User/UpdateEmail',
            type: 'POST',
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            data: formData,
            success: function (data) {
                alert(data.message);
            },
            error: function (xhr, status, error) {
                alert('提交失敗: ' + error);
            }
        }).always(function() {
            hideModalOverlay();
            $("#resetEmail").modal('hide');
            form.reset();
            refreshCaptcha($(".captchaImage[data-type='userProfile_newEmail']"));
            $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });
    $('#cancel').on('click', function () {
        window.close();
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