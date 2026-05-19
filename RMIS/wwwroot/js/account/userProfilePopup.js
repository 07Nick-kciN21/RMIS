$(document).ready(function () {
    injectProfileModal();

    $('#profileBtn').on('click', openProfileModal);

    // 驗證碼點擊刷新（委派，modal 動態注入後也有效）
    $(document).on('click', '#userProfileModal .captchaImage', function () {
        refreshCaptcha($(this));
    });

    // ── 儲存個人資料 ──────────────────────────────
    $(document).on('submit', '#profileForm', function (e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('displayName', $('#profile-DisplayName').val().trim());
        formData.append('phone',       $('#profile-Phone').val().trim());
        $.ajax({
            url: '/Account/User/UpdateProfile',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                alert(data.message);
                if (data.success) $('#userProfileModal').modal('hide');
            },
            error: function () { alert('提交失敗'); }
        });
    });

    // ── 變更密碼 ──────────────────────────────────
    $(document).on('click', '#profile-btn-pwd-submit', function () {
        const $container = $('#profile-resetPasswordSection');
        if (!profileValidate($container)) return;
        if ($('#profile-NewPassword').val() !== $('#profile-CheckPassword').val()) {
            alert('新密碼與確認密碼不相同'); return;
        }
        const formData = new FormData();
        formData.append('UserId',             $('#profile-UserId').val());
        formData.append('OriginPassword',     $('#profile-OriginPassword').val());
        formData.append('NewPassword',        $('#profile-NewPassword').val());
        formData.append('NewPasswordCaptcha', $('#profile-pwdCaptcha').val());
        $.ajax({
            url: '/Account/User/UpdatePassword',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) { alert(data.message); },
            error: function () { alert('提交失敗'); }
        }).always(function () {
            $('#profile-pwdCollapse').collapse('hide');
            $container.find('input').val('');
            $container.find('.form-control').removeClass('is-valid is-invalid');
            refreshCaptcha($('#userProfileModal .captchaImage[data-type="userProfile_newPassword"]'));
        });
    });

    // ── 變更信箱 ──────────────────────────────────
    $(document).on('click', '#profile-btn-email-submit', function () {
        const $container = $('#profile-resetEmailSection');
        if (!profileValidate($container)) return;
        const formData = new FormData();
        formData.append('UserId',          $('#profile-UserId').val());
        formData.append('NewEmail',        $('#profile-NewEmail').val());
        formData.append('NewEmailCaptcha', $('#profile-emailCaptcha').val());
        $.ajax({
            url: '/Account/User/UpdateEmail',
            type: 'POST',
            processData: false,
            contentType: false,
            data: formData,
            xhrFields: { withCredentials: true },
            success: function (data) { alert(data.message); },
            error: function () { alert('提交失敗'); }
        }).always(function () {
            $('#profile-emailCollapse').collapse('hide');
            $container.find('input').val('');
            $container.find('.form-control').removeClass('is-valid is-invalid');
            refreshCaptcha($('#userProfileModal .captchaImage[data-type="userProfile_newEmail"]'));
        });
    });

    // ── 自然人憑證綁定 ────────────────────────────
    $(document).on('click', '#profile-btn-card-submit', function () {
        const $btn = $(this);
        const $container = $('#profile-resetCardSection');
        if (!profileValidate($container)) return;
        $btn.prop('disabled', true);

        readCertificate()
            .then(serialNumber => {
                const formData = new FormData();
                formData.append('UserId',                $('#profile-UserId').val());
                formData.append('NewCitizenCardNo',      serialNumber);
                formData.append('NewCitizenCardNoCaptcha', $('#profile-cardCaptcha').val());
                return $.ajax({
                    url: '/Account/User/UpdateCitizenCardNo',
                    type: 'POST',
                    processData: false,
                    contentType: false,
                    data: formData,
                    xhrFields: { withCredentials: true }
                });
            })
            .then(data => {
                alert(data.success ? '憑證綁定成功！' : '綁定失敗：' + data.message);
                if (data.success) {
                    $('#profile-CitizenCardNo').text(data.citizenCardNo ?? '');
                }
            })
            .catch(err => { alert('讀取卡片失敗：' + err.message); })
            .always(() => {
                $btn.prop('disabled', false);
                refreshCaptcha($('#userProfileModal .captchaImage[data-type="userProfile_newCitizenCardNo"]'));
            });
    });
});

function openProfileModal() {
    $.ajax({
        url: '/Account/User/Get/ProfileData',
        type: 'GET',
        xhrFields: { withCredentials: true },
        success: function (data) {
            if (!data.success) { alert(data.message); return; }
            $('#profile-UserId').val(data.id);
            $('#profile-DisplayName').val(data.displayName || '');
            $('#profile-UserName').text(data.userName || '');
            $('#profile-Role').text(data.role || '');
            $('#profile-Department').text(data.department || '');
            $('#profile-Phone').val(data.phone || '');
            $('#profile-CitizenCardNo').text(data.citizenCardNo || '（未綁定）');

            // 收起所有 collapse，清空欄位
            $('#profile-pwdCollapse, #profile-emailCollapse, #profile-cardCollapse').collapse('hide');
            $('#profile-resetPasswordSection, #profile-resetEmailSection, #profile-resetCardSection')
                .find('input').val('');
            $('#userProfileModal').find('.form-control').removeClass('is-valid is-invalid');

            // 刷新所有驗證碼
            $('#userProfileModal .captchaImage').each(function () { refreshCaptcha($(this)); });

            $('#userProfileModal').modal('show');
        },
        error: function () { alert('無法載入個人資料'); }
    });
}

function profileValidate($container) {
    let isValid = true;
    $container.find('.form-control').removeClass('is-valid is-invalid');
    $container.find('.form-control[required]').each(function () {
        const $input = $(this);
        const value = $input.val();
        const pattern = $input.attr('pattern');
        if (!value || !value.trim()) {
            $input.addClass('is-invalid'); isValid = false;
        } else if (pattern && !(new RegExp(pattern).test(value))) {
            $input.addClass('is-invalid'); isValid = false;
        } else {
            $input.addClass('is-valid');
        }
    });
    return isValid;
}

function refreshCaptcha($img) {
    $img = $($img);
    const type = $img.data('type');
    $img.attr('src', '/Portal/Captcha?type=' + type + '&_=' + new Date().getTime());
}

function injectProfileModal() {
    if ($('#userProfileModal').length) return;
    $('body').append(`
<div class="modal fade" id="userProfileModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header usermodal-header">
        <h5 class="modal-title">使用者資料</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="profileForm">
          <input type="hidden" id="profile-UserId">

          <div class="form-group row mb-3">
            <label class="col-sm-2 col-form-label">名稱</label>
            <div class="col-sm-10">
              <input type="text" id="profile-DisplayName" class="form-control">
            </div>
          </div>

          <div class="form-group row mb-3">
            <label class="col-sm-2 col-form-label">帳號</label>
            <div class="col-sm-10">
              <span id="profile-UserName" class="form-control-plaintext"></span>
            </div>
          </div>

          <div class="form-group row mb-3">
            <label class="col-sm-2 col-form-label">身分</label>
            <div class="col-sm-10">
              <span id="profile-Role" class="form-control-plaintext"></span>
            </div>
          </div>

          <div class="form-group row mb-3">
            <label class="col-sm-2 col-form-label">部門</label>
            <div class="col-sm-10">
              <span id="profile-Department" class="form-control-plaintext"></span>
            </div>
          </div>

          <div class="form-group row mb-3">
            <label class="col-sm-2 col-form-label">電話</label>
            <div class="col-sm-10">
              <input type="text" id="profile-Phone" class="form-control">
            </div>
          </div>

          <div class="form-group row mb-2">
            <label class="col-sm-2 col-form-label">密碼</label>
            <div class="col-sm-10">
              <button type="button" class="btn btn-outline-primary btn-sm"
                      data-bs-toggle="collapse" data-bs-target="#profile-pwdCollapse">
                變更密碼
              </button>
            </div>
          </div>
          <div class="collapse mb-3" id="profile-pwdCollapse">
            <div class="card card-body">
              <div id="profile-resetPasswordSection">
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">原密碼</label>
                  <div class="col-sm-9">
                    <input type="password" id="profile-OriginPassword" class="form-control"
                           pattern="^(?=.*[A-Za-z])(?=.*\\d).{6,20}$" required>
                  </div>
                </div>
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">新密碼</label>
                  <div class="col-sm-9">
                    <input type="password" id="profile-NewPassword" class="form-control"
                           pattern="^(?=.*[A-Za-z])(?=.*\\d).{6,20}$" required>
                  </div>
                </div>
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">確認新密碼</label>
                  <div class="col-sm-9">
                    <input type="password" id="profile-CheckPassword" class="form-control" required>
                  </div>
                </div>
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">驗證碼</label>
                  <div class="col-sm-9">
                    <div class="input-group">
                      <input id="profile-pwdCaptcha" type="text" class="form-control" placeholder="輸入驗證碼" required>
                      <span class="input-group-text p-0" style="background:transparent;border:none;">
                        <img class="captchaImage" data-type="userProfile_newPassword"
                             alt="驗證碼" title="點擊更新驗證碼"
                             style="cursor:pointer;border:1px solid #ccc;height:40px;" />
                      </span>
                    </div>
                  </div>
                </div>
                <p class="text-danger small mb-2">密碼規格：6字元以上、包含英文字母與數字且不可與帳號相同。</p>
                <button type="button" id="profile-btn-pwd-submit" class="btn btn-primary btn-sm">儲存</button>
              </div>
            </div>
          </div>

          <div class="form-group row mb-2">
            <label class="col-sm-2 col-form-label">信箱</label>
            <div class="col-sm-10">
              <button type="button" class="btn btn-outline-primary btn-sm"
                      data-bs-toggle="collapse" data-bs-target="#profile-emailCollapse">
                變更信箱
              </button>
            </div>
          </div>
          <div class="collapse mb-3" id="profile-emailCollapse">
            <div class="card card-body">
              <div id="profile-resetEmailSection">
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">新信箱</label>
                  <div class="col-sm-9">
                    <input type="email" id="profile-NewEmail" class="form-control"
                           pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$" required>
                  </div>
                </div>
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">驗證碼</label>
                  <div class="col-sm-9">
                    <div class="input-group">
                      <input id="profile-emailCaptcha" type="text" class="form-control" placeholder="輸入驗證碼" required>
                      <span class="input-group-text p-0" style="background:transparent;border:none;">
                        <img class="captchaImage" data-type="userProfile_newEmail"
                             alt="驗證碼" title="點擊更新驗證碼"
                             style="cursor:pointer;border:1px solid #ccc;height:40px;" />
                      </span>
                    </div>
                  </div>
                </div>
                <button type="button" id="profile-btn-email-submit" class="btn btn-primary btn-sm">送出驗證碼</button>
              </div>
            </div>
          </div>

          <div class="form-group row mb-2">
            <label class="col-sm-2 col-form-label">自然人憑證</label>
            <div class="col-sm-10 d-flex align-items-center gap-2">
              <span id="profile-CitizenCardNo" class="form-control-plaintext"></span>
              <button type="button" class="btn btn-outline-primary btn-sm"
                      data-bs-toggle="collapse" data-bs-target="#profile-cardCollapse">
                綁定憑證
              </button>
            </div>
          </div>
          <div class="collapse mb-3" id="profile-cardCollapse">
            <div class="card card-body">
              <div id="profile-resetCardSection">
                <div class="form-group row mb-2">
                  <label class="col-sm-3 col-form-label">驗證碼</label>
                  <div class="col-sm-9">
                    <div class="input-group">
                      <input id="profile-cardCaptcha" type="text" class="form-control" placeholder="輸入驗證碼" required>
                      <span class="input-group-text p-0" style="background:transparent;border:none;">
                        <img class="captchaImage" data-type="userProfile_newCitizenCardNo"
                             alt="驗證碼" title="點擊更新驗證碼"
                             style="cursor:pointer;border:1px solid #ccc;height:40px;" />
                      </span>
                    </div>
                  </div>
                </div>
                <button type="button" id="profile-btn-card-submit" class="btn btn-primary btn-sm">插卡並綁定</button>
              </div>
            </div>
          </div>

        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
        <button type="submit" form="profileForm" class="btn btn-primary">儲存</button>
      </div>
    </div>
  </div>
</div>`);
}

/* ── 憑證讀取 ─────────────────────────────────── */

function readCertificate() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = 'http://localhost:61161/p11Image.bmp?_=' + new Date().getTime();

        const canvas = document.createElement('canvas');
        canvas.width = 2000; canvas.height = 1;
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            let jsonText;
            try {
                ctx.drawImage(img, 0, 0);
                jsonText = extractJson(ctx);
                if (!jsonText) throw new Error('EMPTY');
            } catch { reject(new Error('元件未安裝或服務未啟動')); return; }

            let data;
            try { data = JSON.parse(jsonText); }
            catch { reject(new Error('元件未安裝或服務未啟動')); return; }

            if (data.ret_code && data.ret_code !== 0) {
                reject(new Error(data.ret_code === 0x76000031
                    ? '網站未加入信任清單'
                    : `讀卡失敗（錯誤碼：${data.ret_code}）`));
                return;
            }
            const firstToken = (data.slots || []).find(s => s.token)?.token;
            if (!firstToken) { reject(new Error('未偵測到讀卡機或未插入自然人憑證')); return; }
            resolve(firstToken.serialNumber);
        };
        img.onerror = () => reject(new Error('元件未安裝或服務未啟動'));
    });
}

function extractJson(ctx) {
    let result = '';
    for (let x = 0; x < 2000; x++) {
        const [r, g, b] = ctx.getImageData(x, 0, 1, 1).data;
        if (b === 0) break;
        result += String.fromCharCode(b, g, r);
    }
    return result || '{"error":"no data"}';
}
