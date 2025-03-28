$(document).ready(function () {
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();
  
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
          if ($input.attr('id') === 'registerConfirmPassword') return;
  
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
        const password = $('#registerPassword').val();
        const confirmPassword = $('#registerConfirmPassword').val();
        const $confirmInput = $('#registerConfirmPassword');
  
        if (confirmPassword !== password || !confirmPassword) {
          $confirmInput.addClass('is-invalid');
          isValid = false;
        } else {
          $confirmInput.addClass('is-valid');
        }
  
        // 若有欄位不通過驗證，就不送出
        if (!isValid) return;
  
        // 所有欄位驗證通過 → 使用 Ajax 送出
        const formData = $(form).serialize();
        console.log(formData);

        $.post('/Portal/Register', formData)
          .done(function (response) {
            if (response.success) {
              alert('註冊成功');
              form.reset();
              $(form).find('.form-control').removeClass('is-valid');
              const modal = bootstrap.Modal.getInstance($('#registerModal')[0]);
              modal.hide();
            } else {
              alert('註冊失敗：' + response.message);
            }
          })
          .fail(function () {
            alert('提交失敗，請稍後再試');
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