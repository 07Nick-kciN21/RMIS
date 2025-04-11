const sessionManager = (() => {
    const COOKIE_NAME = "LoginExpireTime";
    const EXTEND_API_URL = "/Portal/ExtendSession";
    const LOGIN_URL = "/Portal/Login";
    const TIMEOUT_BEFORE_EXPIRY = 5 * 60 * 1000; // 提前 5 分鐘顯示
    const CHECK_INTERVAL = 30 * 1000;

    let modalInstance = null;
    let hasLougout = false; // 用來判斷是否選擇登出

    function getCookieValue(name) {
        let cookies = document.cookie.split("; ");
        let cookie = cookies.find(row => row.startsWith(name + "="));
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
    }

    // 取得到期時間的 cookie 值
    function getRemainingTime() {
        const expireTimeStr = getCookieValue(COOKIE_NAME);
        if (!expireTimeStr) return 0;
        const expireTime = new Date(expireTimeStr);
        return expireTime - new Date();
    }

    function checkSessionTimeout() {
        const remainingTime = getRemainingTime();
        console.log("剩餘時間:", remainingTime / 1000, "秒");
        if (remainingTime <= 0) {
            redirectToLogin();
        } else if (remainingTime <= TIMEOUT_BEFORE_EXPIRY && !hasLougout) {
            showExtendLoginDialog();
        }
    }

    function showExtendLoginDialog() {
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(document.getElementById("extendSessionModal"));
        }

        // 如果 modal 沒有顯示，則顯示一次
        const modalEl = document.getElementById("extendSessionModal");
        if (!modalEl.classList.contains("show")) {
            modalInstance.show();
        }

        // 設定按鈕事件（只設定一次）
        document.getElementById("extendBtn").onclick = () => {
            modalInstance.hide();
            extendSession();
        };

        document.getElementById("logoutBtn").onclick = () => {
            modalInstance.hide();
            autoLogoutAfterRemainingTime();
        };
    }

    function extendSession() {
        fetch(EXTEND_API_URL, { method: "POST" })
        .then(response => {
            if (!response.ok) throw new Error("延長失敗");
            return response.json();
        })
        .then(data => {
            console.log("✅ 登入時間已延長到", data.expiresUtc);

            scheduleNextWarning();          // ⬅️ 根據新的 cookie 重新安排下次跳窗
        })
        .catch(() => {
            alert("系統錯誤或已過期，請重新登入");
            redirectToLogin();
        });
    }

    function autoLogoutAfterRemainingTime() {
        const remainingTime = getRemainingTime();
        setTimeout(redirectToLogin, remainingTime);
    }

    function redirectToLogin() {
        hasLougout = true; // 設定為已登出狀態，避免重複跳視窗
        window.location.href = LOGIN_URL;
    }

    function init() {
        scheduleNextWarning(); // 準確安排下一次延長提醒
    
        // 設定固定間隔的 backup 檢查（防止視窗被關或 cookie 被其他 tab 更新）
        // setInterval(() => {
        //     checkSessionTimeout();
    
        //     const modalEl = document.getElementById("extendSessionModal");
        //     if (!hasExtended && getRemainingTime() <= TIMEOUT_BEFORE_EXPIRY && !modalEl.classList.contains("show")) {
        //         showExtendLoginDialog();
        //     }
        // }, CHECK_INTERVAL);
    }

    function scheduleNextWarning() {
        const remainingTime = getRemainingTime();
    
        if (remainingTime <= 0) {
            redirectToLogin();
            return;
        }
    
        if (remainingTime <= TIMEOUT_BEFORE_EXPIRY) {
            // 剩餘時間已進入警示區間 → 立即跳視窗
            showExtendLoginDialog();
        } else {
            // 距離警示點還有一段時間 → 準確設定 timeout
            const timeout = remainingTime - TIMEOUT_BEFORE_EXPIRY;
            setTimeout(() => {
                checkSessionTimeout();
            }, timeout);
        }
    }
    return { init };
})();

window.onload = sessionManager.init;
