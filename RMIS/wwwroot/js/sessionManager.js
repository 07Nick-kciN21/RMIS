const sessionManager = (() => {
    const COOKIE_NAME = "LoginExpireTime";
    const EXTEND_API_URL = "/Portal/ExtendSession";
    const LOGIN_URL = "/Portal/Login";
    const TIMEOUT_BEFORE_EXPIRY = 5 * 60 * 1000; // 1 分鐘前顯示提示

    function getCookieValue(cookieName) {
        let cookies = document.cookie.split("; ");
        let cookie = cookies.find(row => row.startsWith(cookieName + "="));
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
    }

    function checkSessionTimeout() {
        
        let expireTimeStr = getCookieValue(COOKIE_NAME);
        if (!expireTimeStr) {
            redirectToLogin();
            return;
        }

        let expireTime = new Date(expireTimeStr);
        let now = new Date();
        let remainingTime = expireTime - now;
        let remainingMinutes = Math.floor(remainingTime / 60000); // 轉換成分鐘
        let remainingSeconds = Math.floor((remainingTime % 60000) / 1000); // 剩餘秒數

        console.log(`⏳ 剩餘時間: ${remainingMinutes} 分 ${remainingSeconds} 秒`);

        if (remainingTime <= 0) {
            console.log("⏳ 時間已到，將自動登出...");
            redirectToLogin();
        } else if (remainingTime <= TIMEOUT_BEFORE_EXPIRY) {
            console.log("⚠️ 剩餘 1 分鐘內，顯示延長登入對話框...");
            showExtendLoginDialog();
        } else {
            console.log(`✅ 設定下一次檢查，將於 ${remainingMinutes - 1} 分鐘 ${remainingSeconds}秒後執行`);
            setTimeout(checkSessionTimeout, remainingTime - TIMEOUT_BEFORE_EXPIRY);
        }
    }

    function showExtendLoginDialog() {
        if (confirm("您的登入即將到期，是否延長？")) {
            // 如果使用者按下確認時已經超時過期，則重新導向至登入頁面
            if(new Date(getCookieValue(COOKIE_NAME)) < new Date()){
                redirectToLogin();
            }
            extendSession();
        }
        else{
            autoLogoutAfterRemainingTime();
        }
    }

    function extendSession() {
        fetch(EXTEND_API_URL, { method: "POST" })
            .then(response => {
                if (response.ok) {
                    alert("登入時間已延長");
                    location.reload(); // 重新載入以刷新過期時間
                } else {
                    alert("無法延長登入，請重新登入");
                    redirectToLogin();
                }
            })
            .catch(() => {
                alert("系統錯誤或已過期，請重新登入");
                redirectToLogin();
            });
    }

    function redirectToLogin() {
        window.location.href = LOGIN_URL;
    }

    function autoLogoutAfterRemainingTime() {
        let expireTimeStr = getCookieValue("LoginExpireTime");
        if (!expireTimeStr) {
            redirectToLogin();
            return;
        }
    
        let expireTime = new Date(expireTimeStr);
        let now = new Date();
        let remainingTime = expireTime - now;
    
        console.log(`⏳ 登出計時開始，剩餘 ${Math.floor(remainingTime / 1000)} 秒`);
    
        setTimeout(() => {
            console.log("⏳ 登入時間到，正在登出...");
            redirectToLogin();
        }, remainingTime);
    }

    return {
        init: checkSessionTimeout
    };
})();

// 啟動 session 檢查
window.onload = sessionManager.init;
