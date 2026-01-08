$(document).ready(function () {
    $('#createUserForm').on('submit', function (e) {
        e.preventDefault();
        let form = this;
        let isValid = true;
        console.log("Submitting form:", form);
        // 清除舊狀態
        $(form).find('.form-control').removeClass('is-valid is-invalid');

        $(form).find('.form-control[required]').each(function () {
            const $input = $(this);
            const value = $input.val();
            const pattern = $input.attr('pattern');
            console.log(`Validating ${$input.attr('name')}:`, { value, pattern });
            
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
        const $passwordInput = $('#Password');
        const $passwordFeedback = $('#passwordFeedback');
        const account = $('#Account').val();
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

        if (!isValid) return;
        let formData = new FormData();

        // 添加基本欄位
        formData.append("Account", $('input[name="Account"]').val());
        formData.append("Password", $('input[name="Password"]').val());
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
            url: '/Account/User/Create',
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
});