$(document).ready(function () {
    hideModalOverlay();

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
            $(form).find('.form-control').removeClass('is-valid is-invalid');
        });
    });

    $('#resetCitizenCardNoForm').on('submit', function (e) {
        console.log("憑證綁定表單提交");
        e.preventDefault(); // 阻止預設提交行為
        const $btn = $(this);
        $btn.prop('disabled', true);

        // 開始憑證登入流程
        updateCitizenCardNo($btn);
    });
    $('#cancel').on('click', function () {
        window.close();
    });
});

// ==========================================
// 憑證登入主流程
// ==========================================
function updateCitizenCardNo($btn) {
  // 步驟 1: 讀取憑證資料
  // 模擬取得序號的過程
    readCertificate()
      .then(serialNumber => {
        if (!serialNumber) {
            alert("無法讀取憑證序號");
            $btn.prop('disabled', false);
            return;
        }
        console.log("讀取到的憑證序號:", serialNumber);
        let formData = new FormData();
        formData.append("UserId", $('input[name="Id"]').val());
        formData.append("NewCitizenCardNo", serialNumber);
        // 2. 呼叫後端進行綁定
        $.ajax({
            url: '/Account/User/UpdateCitizenCardNo', // 這是我們要補全的後端 Action
            type: 'POST',
            processData: false,
            contentType: false,
            xhrFields: {
                withCredentials: true // 確保攜帶 Cookie
            },
            data: formData,
            success: function (response) {
                if (response.success) {
                    alert("憑證綁定成功！");
                    location.reload(); // 重新整理頁面顯示新序號
                } else {
                    alert("綁定失敗：" + response.message);
                }
            },
            error: function () {
                alert("系統連線錯誤");
            },
            complete: function () {
                $btn.prop('disabled', false);
                hideModalOverlay();
            }
        });
    }).catch(err => {
        alert("讀取卡片失敗: " + err);
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
            } catch(e) {
                console.error("無法從圖片中提取 JSON", e);
                reject(new Error("元件未安裝或服務未啟動"));
                return;
            }

            let data;
            try {
                data = JSON.parse(jsonText);
            } catch(e) {
                console.error("無法解析 JSON:", e);
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
            resolve(firstToken.serialNumber);
        };

        // 圖片載入失敗
        img.onerror = () => {
            reject(new Error("元件未安裝或服務未啟動"));
        };
    });
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