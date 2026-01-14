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

    $('#certificateLoginBtn').on('click', function (e) {
        e.preventDefault();
    
        // 禁用按鈕防止重複點擊
        const $btn = $(this);
        $btn.prop('disabled', true);

        // 開始憑證登入流程
        certificateLogin($btn);
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

function readCard() {
    const output = document.getElementById("output");
    output.textContent = "讀取中…";

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = "http://localhost:61161/p11Image.bmp";

    const canvas = document.createElement("canvas");
    canvas.width = 2000;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");

    img.onload = () => {
        let jsonText;
        try {
            ctx.drawImage(img, 0, 0);
            jsonText = extractJson(ctx);
            if (!jsonText) throw new Error("EMPTY");
        } catch {
            output.textContent = "元件未安裝或服務未啟動";
            return;
        }

        let data;
        try {
            data = JSON.parse(jsonText);
        } catch {
            output.textContent = "元件未安裝或服務未啟動";
            return;
        }

        // --- 錯誤類型 3：HiCOS 回傳錯誤 ---
        if (data.ret_code !== 0) {
            if (data.ret_code === 0x76000031) {
                output.textContent = "網站未加入信任清單";
            } else {
                output.textContent =
                    "讀卡失敗（錯誤碼：" + data.ret_code + "）";
            }
            return;
        }

        const slots = data.slots || [];
        const firstToken = slots.find(s => s.token)?.token;

        // --- 錯誤類型 2：沒有讀卡機或未插卡 ---
        if (!firstToken) {
            output.textContent = "未偵測到讀卡機或未插入自然人憑證";
            return;
        }

        // --- 成功 ---
        output.textContent =
            "SerialNumber: " + firstToken.serialNumber;
    };

    // --- 錯誤類型 1：服務不存在 ---
    img.onerror = () => {
        output.textContent = "元件未安裝或服務未啟動";
    };
}

function extractJson(ctx) {
    let result = "";
    for (let x = 0; x < 2000; x++) {
        const [r, g, b] = ctx.getImageData(x, 0, 1, 1).data;
        if (b === 0) break;               // 結束符
        result += String.fromCharCode(b, g, r);
    }
    return result || '{"error":"no data"}';
}

// 恢復按鈕與連結的輔助函式
function restoreButtons(buttons, links) {
    buttons.forEach(btn => btn.disabled = false);
    links.forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
}

// ==========================================
// 憑證登入主流程
// ==========================================
function certificateLogin($btn) {
  // 步驟 1: 讀取憑證資料
  readCertificate()
    .then(certData => {
        console.log('憑證資料:', certData);
        // 步驟 2: 發送憑證資料到後端驗證並登入
        return submitCertificateLogin(certData);
    })
    .then(response => {
        console.log('登入回應:', response);
        if (response.success) {
            // 延遲一下再跳轉，讓使用者看到成功訊息
            setTimeout(() => {
                window.location.href = response.redirectUrl;
            }, 1000);
        } else {
            // 登入失敗
            $btn.prop('disabled', false);
        }
    })
    .catch(error => {
        console.error('憑證登入錯誤:', error);
        
        // 根據錯誤類型顯示不同訊息
        let errorMessage = '憑證登入失敗';
        
        if (error.message && error.message.includes('元件未安裝')) {
            errorMessage = 'HiCOS 元件未安裝或服務未啟動，請先安裝卡片管理工具';
        } else if (error.message && error.message.includes('未偵測到讀卡機')) {
            errorMessage = '未偵測到讀卡機或未插入自然人憑證';
        } else if (error.message && error.message.includes('網站未加入信任清單')) {
            errorMessage = '請將本網站加入 HiCOS 信任清單';
        } else if (error.detail) {
            errorMessage = error.error + '：' + error.detail;
        } else if (error.message) {
            errorMessage = error.message;
        }
        $btn.prop('disabled', false);
    });
}

// ==========================================
// 讀取憑證資料（使用 Promise）
// ==========================================
function readCertificate() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = "http://localhost:61161/p11Image.bmp?_=" + new Date().getTime();

        const canvas = document.createElement("canvas");
        canvas.width = 2000;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");

        // 圖片載入成功
        img.onload = () => {
            let jsonText;
            try {
                ctx.drawImage(img, 0, 0);
                jsonText = extractJson(ctx);
                if (!jsonText) throw new Error("EMPTY");
            } catch {
                reject(new Error("元件未安裝或服務未啟動"));
                return;
            }

            let data;
            try {
                data = JSON.parse(jsonText);
            } catch {
                reject(new Error("元件未安裝或服務未啟動"));
                return;
            }
            console.log('HiCOS 回傳資料:', data);
            // 檢查 HiCOS 回傳的錯誤碼
            if (data.ret_code && data.ret_code !== 0) {
                if (data.ret_code === 0x76000031) {
                    reject(new Error("網站未加入信任清單"));
                } else {
                    reject(new Error(`讀卡失敗（錯誤碼：${data.ret_code}）`));
                }
                return;
            }
            console.log("ret_code", data.ret_code);
            // 取得憑證資料
            const slots = data.slots || [];
            const firstToken = slots.find(s => s.token)?.token;
            
            if (!firstToken) {
                reject(new Error("未偵測到讀卡機或未插入自然人憑證"));
                return;
            }
            console.log("firstToken", firstToken);           
            // 準備要傳送的憑證資料
            const certData = {
                serialNumber: firstToken.serialNumber,
            };

            resolve(certData);
        };

        // 圖片載入失敗
        img.onerror = () => {
            reject(new Error("元件未安裝或服務未啟動"));
        };
    });
}


// ==========================================
// 提交憑證資料到後端進行登入
// ==========================================
function submitCertificateLogin(certData) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/Portal/LoginUseCertificate',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(certData),
            success: function (response) {
                if (response.success) {
                    console.log('登入成功，準備導向:', response);
                    // 收到成功訊號，手動導向
                    resolve(response);
                } else {
                    reject({
                        error: response.error || '登入失敗',
                        detail: response.detail || response.message
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX 錯誤:', xhr, status, error);
                
                let errorInfo = {
                    error: '系統錯誤',
                    detail: error
                };
                
                // 嘗試解析後端回傳的錯誤訊息
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorInfo = {
                        error: response.error || '登入失敗',
                        detail: response.detail || response.message
                    };
                } catch (e) {
                    // 無法解析，使用預設錯誤訊息
                }
                
                reject(errorInfo);
            }
        });
    });
}
