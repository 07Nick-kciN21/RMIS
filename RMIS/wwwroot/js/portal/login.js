$(document).ready(function () {
    initRegisterModal();
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

    // Modal 開啟時刷新該 Modal 裡的圖片
    $('#registerModal, #forgetModal').on('shown.bs.modal', function () {
        $(this).find(".captchaImage").each(function () {
            refreshCaptcha($(this)); // 同樣確保傳入 jQuery 物件
        });
    });

  
    // 頁面載入自動刷新登入用的驗證碼
    refreshCaptcha($(".captchaImage"));


    $('#registerForm').on('submit', function (e) {
        e.preventDefault();
        showModalOverlay('#registerModal');
        let form = this;
        let isValid = true;
  
        // 清除所有 is-valid / is-invalid 樣式
        $(form).find('.form-control').removeClass('is-valid is-invalid');
  
        // 驗證每個欄位
        $(form).find('.form-control[required]').each(function () {
          const $input = $(this);
          const value = $input.val();
          const pattern = $input.attr('pattern');
  
          // 密碼確認邏輯會另外處理
          if ($input.attr('id') === 'registerConfirmPassword' || $input.attr('id') === 'registerCaptcha') return;
  
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

        // 檢查密碼與確認密碼
        const $passwordInput = $('#registerPassword');
        const $passwordFeedback = $('#passwordFeedback');
        const account = $('#registerAccount').val();
        const password = $passwordInput.val();

        let passwordValid = true;
        let passwordMessage = "";
        console.log("Account:", account, "Password:", password);
        // 密碼格式檢查
        const passwordPattern = new RegExp($passwordInput.attr('pattern'));
        if (!password || !passwordPattern.test(password)) {
          passwordValid = false;
          passwordMessage += "密碼需為 6~20 位，且包含英文字母與數字<br>";
        }

        // 帳號與密碼相同檢查
        if (account && password && account === password) {
          passwordValid = false;
          passwordMessage += "帳號與密碼不可相同";
        }

        // 顯示或隱藏訊息
        if (!passwordValid) {
          $passwordInput.addClass('is-invalid').removeClass('is-valid');
          $passwordFeedback.html(passwordMessage);
          isValid = false;
        } else {
          $passwordInput.removeClass('is-invalid').addClass('is-valid');
        }

        const confirmPassword = $('#registerConfirmPassword').val();
        const $confirmInput = $('#registerConfirmPassword');
        const $confirmFeedback = $('#confirmPasswordFeedback');

        if (!confirmPassword) {
          $confirmInput.addClass('is-invalid').removeClass('is-valid');
          $confirmFeedback.text("請再次輸入密碼");
          isValid = false;
        } else if (confirmPassword !== password) {
          $confirmInput.addClass('is-invalid').removeClass('is-valid');
          $confirmFeedback.text("兩次輸入的密碼不一致");
          isValid = false;
        } else {
          $confirmInput.removeClass('is-invalid').addClass('is-valid');
        }
  
        // 若有欄位不通過驗證，就不送出
        if (!isValid){
          hideModalOverlay();
          return;
        }
  
        // 所有欄位驗證通過 → 使用 Ajax 送出
        const formData = $(form).serialize();
        console.log(formData);

        $.ajax({
          url: '/Portal/Register',
          type: 'POST',
          data: formData,
          success: function (response) {
            console.log(response);
            if (response.success) {
              alert(response.message);            
              const modal = bootstrap.Modal.getInstance($('#registerModal')[0]);
              modal.hide();
            } else {
              alert('申請提交：' + response.message);
            }
          },
          error: function () {
            alert('提交失敗，請稍後再試');
          }
        }).always(function() {
          hideModalOverlay();
          form.reset();
          $(form).find('.form-control').removeClass('is-valid');
          refreshCaptcha($(".captchaImage[data-type='register']"));
        });
        
    });
    
    $("#forgetForm").on("submit", function (e) {
        e.preventDefault();
        showModalOverlay("#forgetModal");

        let form = this;
        let isValid = true;
        
        // 清除所有 is-valid / is-invalid 樣式
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
        
        const formData = $(form).serialize();
        $.ajax({
          url: '/Portal/ForgotPassword',
          type: 'POST',
          data: formData,
          success: function (response) {
            if (response.success) {
              alert(response.message);
              if (response.success){
                $("#forgetModal").modal("hide");
              }   
            }
          },
          error: function () {
            alert('請求失敗，請稍後再試');
          }
        }).always(function() {
          form.reset();
          $(form).find('.form-control').removeClass('is-valid');
          hideModalOverlay();
        });
    });

    $('.close-modal').on('click', function () {
        $('#customModal').fadeOut();
        $('.disable-overlay').remove(); 
        $('body').removeClass('dimmed');
    });

    $('#customModal').on('click', function (e) {
        if ($(e.target).is('#customModal')) {
            $('#customModal').fadeOut();
            $('.disable-overlay').remove();
            $('body').removeClass('dimmed');
        }
    });
});

function initRegisterModal() {
    $.ajax({
        url: '/Portal/RegisterSelect',
        type: 'GET',
        success: function (response) {
          console.log(response);
          const departments = response.Departments;
          const roles = response.Roles;
          for (const department of departments) {
              $('#DepartmentId').append(
                  `<option value="${department.id}">${department.name}</option>`
              );
          }
          for (const role of roles) {
              $('#RoleId').append(
                  `<option value="${role.id}">${role.name}</option>`
              );
          }
        },
        error: function () {
            alert('無法載入註冊頁面，請稍後再試。');
        }
    });
}

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
